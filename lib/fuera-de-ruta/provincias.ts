// Provincias de Fuera de Ruta: puente entre el nombre con el que viven en los datos
// ("Navarra") y el slug con el que viven en la URL ("navarra"). Las provincias que
// existen son las del mapa de zonas generado, así que no hay una segunda lista que
// mantener: ZONAS_MAPA manda. Puro, sin React.
import { ZONAS_MAPA } from "@/data/fuera-de-ruta/zonas-mapa";

// Rutas que no son destino y cuelgan de /fuera-de-ruta/<provincia>/. Un destino con
// uno de estos slugs quedaría inaccesible (Next resuelve la ruta estática antes que
// [destino]); `datos.test.ts` lo comprueba.
export const RUTAS_RESERVADAS = ["sitios", "crear-viaje"];

export const PROVINCIAS = Object.keys(ZONAS_MAPA);

export const slugProvincia = (nombre: string): string =>
  nombre
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "") // tildes: "Álava" → "alava"
    .toLowerCase()
    .replace(/\s+/g, "-");

export const provinciaDeSlug = (slug: string): string | undefined =>
  PROVINCIAS.find((nombre) => slugProvincia(nombre) === slug);
