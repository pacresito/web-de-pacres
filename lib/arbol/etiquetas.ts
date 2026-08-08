// Qué campos opcionales lleva una persona y cómo se escribe lo que se sabe de su vida.
// Quién es se escribe en `identidad.ts`; aquí solo está lo que el bloque de identidad no
// decide. Puro: `npx tsx lib/arbol/etiquetas.test.ts`.

import { edadDe, type Fecha } from "./fechas";
import type { Persona } from "./tree";

/**
 * Qué se dice de la vida de una persona en el hueco que el bloque de identidad reserva
 * detrás de su nombre. El año viene de serie porque es el desempate más barato que hay;
 * la edad ocupa su sitio para quien prefiera saber de cuándo es que cuándo nació, y la
 * fecha entera solo la tienen los que salen del calendario de cumpleaños.
 */
export type ModoFechas = "ocultar" | "año" | "edad" | "completa";

/** Qué campos opcionales se pintan; el interruptor es global, nunca por persona. */
export interface Campos {
  fechas: ModoFechas;
  /** Resalta **el dato** que el documento marcaba como dudoso, no la persona entera. */
  dudoso: boolean;
  notas: boolean;
}

export const CAMPOS_POR_DEFECTO: Campos = { fechas: "año", dudoso: true, notas: true };

/**
 * Lo que consta, tal como consta: si solo se sabe el fallecimiento, se dice así, y la
 * fecha entera se escribe en el orden en que está guardada —de más grueso a más fino—,
 * que es el que deja comparar dos fechas leyéndolas de izquierda a derecha.
 */
export function fechasDe(p: Persona, modo: ModoFechas, hoy: Fecha): string {
  if (modo === "ocultar") return "";
  // La edad de un fallecido tiene que decir por sí sola que lo es: lo dice el verbo, que
  // no hay que descifrar ni buscar en ninguna leyenda.
  if (modo === "edad") {
    const edad = edadDe(p, hoy);
    if (edad === null) return "";
    const años = `${edad} ${edad === 1 ? "año" : "años"}`;
    return p.death ? `vivió ${años}` : años;
  }
  const fecha = (f: Fecha) => (modo === "completa" ? f : f.slice(0, 4));
  if (p.birth && p.death) return `${fecha(p.birth)} – ${fecha(p.death)}`;
  if (p.birth) return fecha(p.birth);
  if (p.death) return `† ${fecha(p.death)}`;
  return "";
}
