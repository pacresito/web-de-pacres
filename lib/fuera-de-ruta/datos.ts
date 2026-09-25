// Datos y matriz de cada provincia, por slug de URL. Dar datos a una provincia es añadir
// aquí sus dos líneas; sin ellas es escaparate: mismas pantallas, sin sitios.
import type { DatosViajes } from "./tipos";
import type { MatrizViajes } from "./geo";
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

export const PROVINCIAS_CON_DATOS = Object.keys(DATOS);
