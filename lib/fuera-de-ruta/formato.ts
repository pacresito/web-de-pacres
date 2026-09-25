// Formateo compartido de /fuera-de-ruta. Puro, sin React.
import type { Rango } from "./tipos";

// Decimales en estilo español: 2.5 → "2,5".
const num = (n: number) => String(n).replace(".", ",");

export function rango(r: Rango, unidad: string): string {
  return r[0] === r[1] ? `${num(r[0])} ${unidad}` : `${num(r[0])}–${num(r[1])} ${unidad}`;
}

export const desnivel = (r: Rango) => (r[1] === 0 ? "llano" : `+${rango(r, "m")}`);

// Minutos → "2 h 30 min".
export const duracion = (min: number) => {
  const h = Math.floor(min / 60), m = Math.round(min % 60);
  return h ? (m ? `${h} h ${m} min` : `${h} h`) : `${m} min`;
};

// Minutos desde medianoche → "HH:MM". Pasada la medianoche envuelve ("01:20", no "25:20").
export const fmtHora = (min: number) => {
  const enDia = min % 1440;
  return `${String(Math.floor(enDia / 60)).padStart(2, "0")}:${String(enDia % 60).padStart(2, "0")}`;
};

// "a", "a y b", "a, b y c".
export const enumerar = (xs: string[], nexo = "y") =>
  xs.length <= 1 ? (xs[0] ?? "") : `${xs.slice(0, -1).join(", ")} ${nexo} ${xs[xs.length - 1]}`;

// El GPS del JSON es el parking, así que el enlace lleva a donde se aparca.
export const mapsHref = (gps: [number, number]) =>
  `https://www.google.com/maps/search/?api=1&query=${gps[0]},${gps[1]}`;
