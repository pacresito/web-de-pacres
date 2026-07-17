// Lookup de tiempos de coche en la matriz precalculada (OSRM, ver
// scripts/build-fuera-de-ruta-matriz.mjs) y orden óptimo de un día por fuerza bruta (TSP
// abierto). Lógica pura. Test: `npx tsx lib/fuera-de-ruta/planificador/geo.test.ts`.

export type MatrizViajes = {
  ids: string[];         // slugs de destino, en el orden de filas y columnas
  segundos: number[][];  // segundos[i][j] = tiempo de coche de ids[i] a ids[j]
  metros?: number[][];   // metros[i][j] = distancia de coche de ids[i] a ids[j] (opcional: matrices viejas no lo traen)
};

const MAX_PARADAS = 8; // fuerza bruta: 8! = 40320 permutaciones, instantáneo

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
// la ruta arranca ahí sin incluirlo en la salida. Pensado para ≤8 paradas.
export function ordenarDia(
  matriz: MatrizViajes, paradas: string[], inicio?: string,
): { orden: string[]; segundos: number } {
  if (paradas.length > MAX_PARADAS) {
    throw new Error(`ordenarDia soporta ≤${MAX_PARADAS} paradas, recibió ${paradas.length}`);
  }
  if (paradas.length <= 1) return { orden: [...paradas], segundos: 0 };
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
