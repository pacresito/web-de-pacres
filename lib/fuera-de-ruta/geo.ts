// Lookup de tiempos de coche en la matriz precalculada (OSRM, ver
// scripts/build-fuera-de-ruta-matriz.mjs) y orden óptimo de un día por fuerza bruta (TSP
// abierto). Lógica pura. Test: `npx tsx lib/fuera-de-ruta/geo.test.ts`.
import type { Destino } from "./tipos";

export type MatrizViajes = {
  ids: string[];         // slugs de destino, en el orden de filas y columnas
  segundos: number[][];  // segundos[i][j] = tiempo de coche de ids[i] a ids[j]
  metros?: number[][];   // metros[i][j] = distancia de coche de ids[i] a ids[j] (opcional: matrices viejas no lo traen)
};

const MAX_PARADAS = 8; // fuerza bruta: 8! = 40320 permutaciones, instantáneo

// Salto de coche (min) que separa dos zonas: a partir de aquí no compensa encadenar las
// paradas en el mismo día ni volver a dormir al mismo sitio. Una sola constante para los
// dos cortes —días (`mi-viaje`) y bases (`alojamiento`)—: con dos, discrepan.
export const SALTO_ZONA_MIN = 25;

// La matriz habla en segundos y metros; el resto del dominio, en minutos y km. Las dos
// conversiones viven aquí, junto a las funciones que devuelven esas unidades.
export const seg2min = (seg: number) => Math.round(seg / 60);

// Centro geográfico de un grupo de destinos (media de los que tienen GPS), o null si
// ninguno lo tiene. Lo usan el panel y el itinerario para pedir las horas de luz del día:
// dentro de una comunidad apenas varían, así que un punto medio basta.
export function centroDe(ds: Destino[]): [number, number] | null {
  const con = ds.filter((d) => d.gps);
  if (!con.length) return null;
  const lat = con.reduce((s, d) => s + d.gps![0], 0) / con.length;
  const lon = con.reduce((s, d) => s + d.gps![1], 0) / con.length;
  return [lat, lon];
}

// Tiempo de coche (segundos) entre dos destinos por su slug.
export function tiempoCoche(matriz: MatrizViajes, origen: string, destino: string): number {
  const i = matriz.ids.indexOf(origen);
  const j = matriz.ids.indexOf(destino);
  if (i < 0 || j < 0) throw new Error(`slug fuera de la matriz: ${i < 0 ? origen : destino}`);
  return matriz.segundos[i][j];
}

// Distancia de coche (metros) entre dos destinos por su slug. 0 si la matriz no trae
// distancias (las viejas): el panel muestra tiempo siempre y km solo si hay dato.
export function kmCoche(matriz: MatrizViajes, origen: string, destino: string): number {
  if (!matriz.metros) return 0;
  const i = matriz.ids.indexOf(origen);
  const j = matriz.ids.indexOf(destino);
  if (i < 0 || j < 0) throw new Error(`slug fuera de la matriz: ${i < 0 ? origen : destino}`);
  return matriz.metros[i][j];
}

function* permutaciones<T>(xs: T[]): Generator<T[]> {
  if (xs.length <= 1) { yield [...xs]; return; }
  for (let i = 0; i < xs.length; i++) {
    const resto = [...xs.slice(0, i), ...xs.slice(i + 1)];
    for (const p of permutaciones(resto)) yield [xs[i], ...p];
  }
}

// Orden que minimiza el tiempo total de coche visitando todas las paradas (ruta
// abierta, no vuelve al origen). Si se da `inicio` (p. ej. el alojamiento del día),
// la ruta arranca ahí sin incluirlo en la salida. Óptimo por fuerza bruta hasta 8
// paradas; por encima (un día sobre-selección, ya avisado como que no cabe) cae a la
// heurística del vecino más cercano —no óptima, pero sin el coste factorial y sin petar—.
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

// Vecino más cercano: arranca en `inicio` (o en la primera parada si no lo hay) y salta
// siempre a la más próxima sin visitar. O(n²), para días con demasiadas paradas.
function vecinoMasCercano(
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
