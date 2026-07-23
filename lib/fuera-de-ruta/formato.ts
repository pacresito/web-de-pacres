// Formateo de datos de /fuera-de-ruta compartido entre índice, ficha y planificador
// (puro, sin React).
import type { Comida, Rango, Ritmo } from "./tipos";

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

// Enlace a Google Maps de unas coordenadas. **El GPS es el parking** (así lo trae el
// PDF de Cris): esto lleva a donde se aparca, no al punto de interés. Lo dicen la ficha,
// la guía y los popups del mapa del viaje — una sola forma de construir la URL.
export const mapsHref = (gps: [number, number]) =>
  `https://www.google.com/maps/search/?api=1&query=${gps[0]},${gps[1]}`;

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
