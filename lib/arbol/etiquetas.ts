// Qué texto lleva cada nodo. Puro: `npx tsx lib/arbol/etiquetas.test.ts`.

import type { Persona } from "./tree";

/** Qué campos opcionales se pintan; el interruptor es global, nunca por persona. */
export interface Campos {
  fechas: boolean;
  /** Resalta **el dato** que el documento marcaba como dudoso, no la persona entera. */
  dudoso: boolean;
  notas: boolean;
}

export const CAMPOS_COMPLETOS: Campos = { fechas: true, dudoso: true, notas: true };

/** Un trozo de la línea de detalle, con su propia marca de duda. */
export interface Segmento {
  texto: string;
  incierto: boolean;
}

/** Un renglón del nombre, con el apellido heredado aparte para pintarlo distinto. */
export interface Renglon {
  escrito: string;
  heredado: string;
}

/**
 * Parte el nombre en como mucho `lineas` renglones de `ancho` caracteres, sin cortar
 * palabras salvo que una sola no quepa. Lo que no entra se recorta con puntos
 * suspensivos. `heredadoDesde` es el carácter en el que empiezan los apellidos deducidos
 * del árbol, que van aparte en cada renglón.
 */
export function partirNombre(nombre: string, heredadoDesde: number, ancho: number, lineas: number): Renglon[] {
  const renglon = (texto: string, inicio: number): Renglon => {
    const corte = Math.min(Math.max(heredadoDesde - inicio, 0), texto.length);
    return { escrito: texto.slice(0, corte), heredado: texto.slice(corte) };
  };

  const salida: Renglon[] = [];
  let resto = nombre.trim();
  let inicio = 0;
  while (resto.length > 0 && salida.length < lineas) {
    if (resto.length <= ancho) {
      salida.push(renglon(resto, inicio));
      break;
    }
    if (salida.length === lineas - 1) {
      salida.push(renglon(resto.slice(0, ancho - 1).trimEnd() + "…", inicio));
      break;
    }
    const corte = resto.lastIndexOf(" ", ancho);
    const en = corte > 0 ? corte : ancho;
    salida.push(renglon(resto.slice(0, en).trimEnd(), inicio));
    const siguiente = resto.slice(en);
    inicio += resto.length - siguiente.trimStart().length;
    resto = siguiente.trimStart();
  }
  return salida;
}

/** Fechas tal como constan: si solo se sabe el fallecimiento, se dice así. */
export function fechasDe(p: Persona): string {
  if (p.birth && p.death) return `${p.birth}–${p.death}`;
  if (p.birth) return `${p.birth}`;
  if (p.death) return `†${p.death}`;
  return "";
}

/** Lo que cabe a 11px en un nodo, medido en el navegador: 5,7px por carácter. */
const LARGO_DETALLE = 36;

/** La línea de debajo del nombre, por trozos: cada uno sabe si es el dato dudoso. */
export function detalleDe(p: Persona, campos: Campos): Segmento[] {
  const trozos: Segmento[] = [];
  const fechas = campos.fechas ? fechasDe(p) : "";
  if (fechas) trozos.push({ texto: fechas, incierto: campos.dudoso && p.incierto === "fechas" });
  if (campos.notas && p.apodo) trozos.push({ texto: `«${p.apodo}»`, incierto: false });
  if (campos.notas && p.nota) trozos.push({ texto: p.nota, incierto: false });

  // Una nota larga se recorta antes de desbordar el nodo; las fechas nunca sobran.
  const salida: Segmento[] = [];
  let largo = 0;
  for (const trozo of trozos) {
    const hueco = LARGO_DETALLE - largo - (salida.length > 0 ? 3 : 0);
    if (hueco < 4) break;
    salida.push(trozo.texto.length <= hueco ? trozo : { ...trozo, texto: trozo.texto.slice(0, hueco - 1).trimEnd() + "…" });
    largo += Math.min(trozo.texto.length, hueco) + (salida.length > 1 ? 3 : 0);
  }
  return salida;
}

/** El nombre se resalta cuando lo dudoso es el nombre. */
export const nombreIncierto = (p: Persona, campos: Campos): boolean => campos.dudoso && p.incierto === "nombre";
