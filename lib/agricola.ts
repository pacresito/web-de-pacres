// Scoring de Agrícola (All Creatures Big and Small) en TS puro.
// Fuente única compartida por el cliente (app/apps/AgricolaCalc) y el servidor
// (app/api/registro/agricola). No importa nada de React ni de Next.

export type Animal = "sheep" | "pig" | "cow" | "horse";
export const ANIMALS: Animal[] = ["sheep", "pig", "cow", "horse"];
export const ANIMAL_LABELS: Record<Animal, string> = {
  sheep: "🐑",
  pig: "🐷",
  cow: "🐄",
  horse: "🐴",
};

/** Puntos de tabla para un animal según su recuento. */
export function calcTablePts(count: number, animal: Animal): number {
  if (count <= 3) return -3;
  const base3: Record<Animal, number> = { sheep: 13, pig: 11, cow: 10, horse: 9 };
  if (count >= base3[animal]) return 3 + (count - base3[animal]);
  const ranges: Record<Animal, [number, number][]> = {
    sheep: [[4, 7], [8, 10], [11, 12]],
    pig:   [[4, 6], [7, 8],  [9, 10]],
    cow:   [[4, 5], [6, 7],  [8, 9]],
    horse: [[4, 4], [5, 6],  [7, 8]],
  };
  for (let pts = 0; pts <= 2; pts++) {
    const [lo, hi] = ranges[animal][pts];
    if (count >= lo && count <= hi) return pts;
  }
  return 0;
}

export interface Derived {
  counts: number[];
  tablePts: number[];
  sigma1: number;
  sigma2: number;
  terrain: number;
  buildings: number;
  final: number;
}

/**
 * Derivados de una fila de inputs ya numérica: 4 recuentos de animales +
 * puntos de terreno + puntos de edificios. Usado en servidor (email y finals).
 */
export function getDerived(inputs: number[]): Derived {
  const counts = inputs.slice(0, 4);
  const tablePts = ANIMALS.map((a, i) => calcTablePts(counts[i], a));
  const sigma1 = counts.reduce((a, b) => a + b, 0);
  const sigma2 = tablePts.reduce((a, b) => a + b, 0);
  const terrain = inputs[4];
  const buildings = inputs[5];
  const final = sigma1 + sigma2 + terrain + buildings;
  return { counts, tablePts, sigma1, sigma2, terrain, buildings, final };
}

/** Puntuaciones finales por jugador a partir de sus inputs. Fuente de verdad. */
export function computeFinals(inputs: number[][]): number[] {
  return inputs.map((inp) => getDerived(inp).final);
}
