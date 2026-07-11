// Formateo de datos de /viajes compartido entre índice y ficha (puro, sin React).
import type { Rango } from "./tipos";

// Decimales en estilo español: 2.5 → "2,5".
const num = (n: number) => String(n).replace(".", ",");

export function rango(r: Rango, unidad: string): string {
  return r[0] === r[1] ? `${num(r[0])} ${unidad}` : `${num(r[0])}–${num(r[1])} ${unidad}`;
}
