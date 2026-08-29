// Las rutas de las dos imágenes de un país: la bandera y, si lo tiene, el relieve.
//
// Una sola cuenta por imagen, para quien la pinta y para quien la precarga: dos plantillas de la
// misma ruta se desajustan el día que cambie el nombre del archivo, y el síntoma sería una
// precarga que no acierta nunca y un 404 que nadie mira.
import { CON_RELIEVE } from "@/data/atlas/relieve";

export const rutaDeLaBandera = (id: string) => `/atlas/banderas/${id}.svg`;

/** El relieve, o null si el país no tiene —o si todavía no se sabe el tema, que en el primer
 *  render del cliente no está—. */
export function rutaDelRelieve(id: string, tema: string | null): string | null {
  if (!tema || !CON_RELIEVE.has(id)) return null;
  return `/atlas/relieve/${id}-${tema === "dark" ? "oscuro" : "claro"}.webp`;
}
