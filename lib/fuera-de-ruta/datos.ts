// Datos por provincia, indexados por su slug de URL. Punto único donde se carga un
// JSON de destinos: para dar datos a una provincia del mapa basta añadir su línea
// aquí (y su matriz), sin tocar las páginas. Una provincia del mapa sin entrada es
// escaparate: mismas pantallas, sin sitios.
import type { DatosViajes } from "./tipos";
import type { MatrizViajes } from "./planificador/geo";
import navarra from "@/data/fuera-de-ruta/navarra.json";
import matrizNavarra from "@/data/fuera-de-ruta/matriz-navarra.json";

const DATOS: Record<string, DatosViajes> = {
  navarra: navarra as DatosViajes,
};

const MATRICES: Record<string, MatrizViajes> = {
  navarra: matrizNavarra as MatrizViajes,
};

export const datosDe = (slug: string): DatosViajes | undefined => DATOS[slug];
export const matrizDe = (slug: string): MatrizViajes | undefined => MATRICES[slug];

// Provincias con destinos cargados (las demás son escaparate).
export const PROVINCIAS_CON_DATOS = Object.keys(DATOS);
