// Puente entre el nombre de una provincia ("Navarra") y su slug de URL ("navarra"). Las
// provincias que existen son las del mapa de zonas generado: ZONAS_MAPA manda.
import { ZONAS_MAPA } from "@/data/fuera-de-ruta/zonas-mapa";

// Rutas estáticas que ganan a [destino] y a [provincia]: un slug así quedaría inaccesible.
export const RUTAS_RESERVADAS = ["sitios", "crear-viaje"];

export const RUTAS_RESERVADAS_RAIZ = ["guardados"];

export const PROVINCIAS = Object.keys(ZONAS_MAPA);

export const slugProvincia = (nombre: string): string =>
  nombre
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "") // tildes: "Álava" → "alava"
    .toLowerCase()
    .replace(/\s+/g, "-");

export const provinciaDeSlug = (slug: string): string | undefined =>
  PROVINCIAS.find((nombre) => slugProvincia(nombre) === slug);
