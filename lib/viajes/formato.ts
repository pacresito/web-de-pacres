// Formateo de datos de /viajes compartido entre índice y ficha (puro, sin React).
import type { Rango } from "./tipos";

export function rango(r: Rango, unidad: string): string {
  return r[0] === r[1] ? `${r[0]} ${unidad}` : `${r[0]}–${r[1]} ${unidad}`;
}
