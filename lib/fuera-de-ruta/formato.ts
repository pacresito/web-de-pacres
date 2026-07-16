// Formateo de datos de /fuera-de-ruta compartido entre índice, ficha y planificador
// (puro, sin React).
import type { Rango } from "./tipos";
import type { Comida, Propuesta, Ritmo } from "./planificador/tipos";

// Decimales en estilo español: 2.5 → "2,5".
const num = (n: number) => String(n).replace(".", ",");

export function rango(r: Rango, unidad: string): string {
  return r[0] === r[1] ? `${num(r[0])} ${unidad}` : `${num(r[0])}–${num(r[1])} ${unidad}`;
}

// Cómo se llaman de cara al usuario los valores del encargo. Viven aquí porque los
// dicen dos pantallas (el planificador y «Mis viajes») y tienen que coincidir.
export const RITMO_TEXTO: Record<Ritmo, string> = {
  relajado: "tranquilo",
  medio: "normal",
  activo: "a tope",
};
export const COMIDA_TEXTO: Record<Comida, string> = {
  restaurante: "restaurante",
  picnic: "picnic",
  "da-igual": "da igual",
  "solo-cena": "solo cena",
};

// Nombre de cada estrategia del planificador. Vive aquí, y no en `planificar.ts`, para
// que «Mis viajes» lo diga igual que las pestañas sin importar el motor entero.
export const PROPUESTA_TEXTO: Record<Propuesta["id"], string> = {
  A: "Equilibrada",
  B: "Mínimo coche",
  C: "Imprescindibles",
};
