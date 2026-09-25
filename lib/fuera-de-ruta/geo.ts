// Tiempos y distancias de coche sobre la matriz precalculada con OSRM
// (scripts/build-fuera-de-ruta-matriz.mjs) y orden de las paradas de un día. Puro.
import type { Destino } from "./tipos";

export type MatrizViajes = {
  ids: string[];         // slugs, en el orden de filas y columnas
  segundos: number[][];
  metros: number[][];
};

const MAX_PARADAS = 8; // fuerza bruta: 8! = 40320 permutaciones

// Salto de coche (min) que separa dos zonas. Lo usan los dos cortes —días (`mi-viaje`) y
// bases (`alojamiento`)—: con una constante para cada uno, discreparían.
export const SALTO_ZONA_MIN = 25;

export const seg2min = (seg: number) => Math.round(seg / 60);

// Media de los destinos con GPS: basta para pedir las horas de luz de una comunidad.
export function centroDe(ds: Destino[]): [number, number] | null {
  const con = ds.filter((d) => d.gps);
  if (!con.length) return null;
  const lat = con.reduce((s, d) => s + d.gps![0], 0) / con.length;
  const lon = con.reduce((s, d) => s + d.gps![1], 0) / con.length;
  return [lat, lon];
}

function celda(tabla: number[][], matriz: MatrizViajes, origen: string, destino: string): number {
  const i = matriz.ids.indexOf(origen);
  const j = matriz.ids.indexOf(destino);
  if (i < 0 || j < 0) throw new Error(`slug fuera de la matriz: ${i < 0 ? origen : destino}`);
  return tabla[i][j];
}

export const tiempoCoche = (matriz: MatrizViajes, origen: string, destino: string) =>
  celda(matriz.segundos, matriz, origen, destino);

export const kmCoche = (matriz: MatrizViajes, origen: string, destino: string) =>
  celda(matriz.metros, matriz, origen, destino) / 1000;

function* permutaciones<T>(xs: T[]): Generator<T[]> {
  if (xs.length <= 1) { yield [...xs]; return; }
  for (let i = 0; i < xs.length; i++) {
    const resto = [...xs.slice(0, i), ...xs.slice(i + 1)];
    for (const p of permutaciones(resto)) yield [xs[i], ...p];
  }
}

// Orden con menos coche visitando todas las paradas, sin volver al origen. `inicio` (la
// base del día) no entra en la salida. Óptimo hasta MAX_PARADAS; por encima, vecino más cercano.
export function ordenarDia(
  matriz: MatrizViajes, paradas: string[], inicio?: string,
): { orden: string[]; segundos: number } {
  if (paradas.length <= 1) return { orden: [...paradas], segundos: 0 };
  if (paradas.length > MAX_PARADAS) return vecinoMasCercano(matriz, paradas, inicio);
  let orden = paradas, segundos = Infinity;
  for (const perm of permutaciones(paradas)) {
    let t = 0, previo = inicio;
    for (const p of perm) {
      if (previo) t += tiempoCoche(matriz, previo, p);
      previo = p;
    }
    if (t < segundos) { segundos = t; orden = perm; }
  }
  return { orden, segundos };
}

// Arranca en `inicio` (o en la primera parada) y salta siempre a la más próxima. O(n²).
export function vecinoMasCercano(
  matriz: MatrizViajes, paradas: string[], inicio?: string,
): { orden: string[]; segundos: number } {
  const restantes = new Set(paradas);
  const orden: string[] = [];
  let previo = inicio;
  let segundos = 0;
  while (restantes.size) {
    let mejor = "", mejorT = Infinity;
    for (const p of restantes) {
      const t = previo ? tiempoCoche(matriz, previo, p) : 0;
      if (t < mejorT) { mejorT = t; mejor = p; }
    }
    if (previo) segundos += mejorT;
    orden.push(mejor);
    restantes.delete(mejor);
    previo = mejor;
  }
  return { orden, segundos };
}
