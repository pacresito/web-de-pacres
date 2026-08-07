// Qué texto lleva cada nodo. Puro: `npx tsx lib/arbol/etiquetas.test.ts`.

import { edadDe, escribir, type Fecha } from "./fechas";
import type { Persona } from "./tree";

/**
 * Cuánta fecha se enseña. De entrada ninguna: quien mira el árbol quiere saber quién es
 * cada uno y cuántos años tiene, y una cifra más por nodo lo carga sin decir mucho más.
 */
export type ModoFechas = "ocultar" | "año" | "completa";

/** Qué campos opcionales se pintan; el interruptor es global, nunca por persona. */
export interface Campos {
  fechas: ModoFechas;
  edad: boolean;
  /** Resalta **el dato** que el documento marcaba como dudoso, no la persona entera. */
  dudoso: boolean;
  notas: boolean;
}

export const CAMPOS_POR_DEFECTO: Campos = { fechas: "ocultar", edad: true, dudoso: true, notas: true };

/** Un trozo de la línea de detalle, con su propia marca de duda. */
export interface Segmento {
  texto: string;
  incierto: boolean;
  /** La nota va en cursiva: lo demás de la línea son datos, y ella es lo que se anotó. */
  nota?: boolean;
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
export function fechasDe(p: Persona, modo: ModoFechas): string {
  if (modo === "ocultar") return "";
  const fecha = (f: Fecha) => (modo === "completa" ? escribir(f) : f.slice(0, 4));
  if (p.birth && p.death) return `${fecha(p.birth)}–${fecha(p.death)}`;
  if (p.birth) return fecha(p.birth);
  if (p.death) return `†${fecha(p.death)}`;
  return "";
}

/** Lo que cabe a 11px en un nodo, medido en el navegador: 5,7px por carácter. */
const LARGO_DETALLE = 36;

/** La línea de debajo del nombre, por trozos: cada uno sabe si es el dato dudoso. */
export function detalleDe(p: Persona, campos: Campos, hoy: Fecha): Segmento[] {
  const trozos: Segmento[] = [];
  const dudaEnLasFechas = campos.dudoso && p.incierto === "fechas";
  const fechas = fechasDe(p, campos.fechas);
  if (fechas) trozos.push({ texto: fechas, incierto: dudaEnLasFechas });
  // La edad sale de las mismas fechas, así que arrastra su duda aunque estén ocultas. Y
  // como de entrada las fechas no se ven, la edad de un fallecido tiene que decir por sí
  // sola que lo es: lo dice el verbo, que no hay que descifrar ni buscar en la leyenda.
  const edad = campos.edad ? edadDe(p, hoy) : null;
  if (edad !== null) {
    const años = `${edad} ${edad === 1 ? "año" : "años"}`;
    trozos.push({ texto: p.death ? `vivió ${años}` : años, incierto: dudaEnLasFechas });
  }
  if (campos.notas && p.nota) trozos.push({ texto: p.nota, incierto: false, nota: true });

  // Una nota larga se recorta antes de desbordar el nodo; fechas y edad nunca sobran.
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
