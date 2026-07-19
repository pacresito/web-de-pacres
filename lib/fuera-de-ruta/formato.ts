// Formateo de datos de /fuera-de-ruta compartido entre índice, ficha y planificador
// (puro, sin React).
import type { Rango } from "./tipos";
import type { Comida, Ritmo } from "./planificador/tipos";

// Decimales en estilo español: 2.5 → "2,5".
const num = (n: number) => String(n).replace(".", ",");

export function rango(r: Rango, unidad: string): string {
  return r[0] === r[1] ? `${num(r[0])} ${unidad}` : `${num(r[0])}–${num(r[1])} ${unidad}`;
}

// Duración en minutos → "2 h 30 min". Lo dicen el panel «Mi viaje» y las guías.
export const duracion = (min: number) => {
  const h = Math.floor(min / 60), m = Math.round(min % 60);
  return h ? (m ? `${h} h ${m} min` : `${h} h`) : `${m} min`;
};

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
