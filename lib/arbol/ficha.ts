// La ficha: todo lo que se dice de una persona cuando se la toca, en un orden que no
// cambia nunca. Puro: `npx tsx lib/arbol/ficha.test.ts`.
//
// El orden es invariable porque la ficha se lee de arriba abajo buscando siempre lo mismo:
// primero qué es esa persona de ti, luego quién es y por último de quién viene.

import { añoDe, escribirVida, seLeSuponeFallecido, type Fecha, type ModoFechas } from "./fechas";
import type { Grafo } from "./grafo";
import { declinado, identidadDe, SIN_NOMBRE, type Homonimia, type Trozo } from "./identidad";
import { ordenarPareja, type Apellidos } from "./personas";
import { escribirNivel, type Relacion } from "./parentesco";
import type { Pertenencia } from "./ramas";
import type { Persona } from "./tree";

export interface Fila {
  clave: string;
  valor: string;
  /** El documento no lo decía: se pinta apagado y empieza por raya. */
  falta: boolean;
}

export interface Ficha {
  /** La suya es una variante, no otra pantalla: no se centra en quien ya es el centro. */
  esCentro: boolean;
  relacion: Relacion;
  /** El nombre grande, con los dos apellidos: es la superficie donde se identifica del todo. */
  titulo: Trozo[];
  sinNombre: boolean;
  /** La vida y el sitio en el árbol, en una línea: «1989 — · una generación por debajo». */
  datos: string;
  marcas: string[];
  nota?: string;
  /** Lo que hay que advertir antes de leer nada más; hoy, solo el caso sin nombre ni fechas. */
  aviso?: string;
  filas: Fila[];
  /** La salida hacia los que comparten su nombre, cuando los hay. */
  homonimos?: Homonimos;
}

export interface Homonimos {
  /** Cómo se lee la salida: «Los otros 2 «Pablo (1989)»». */
  texto: string;
  /**
   * Lo que hay que buscar para verlos uno debajo de otro, y `null` cuando lo que comparten es
   * no tener nombre: a esos cuatro no se llega tecleando, sino por su propia lista.
   */
  consulta: string | null;
}

export interface OpcionesFicha {
  puntoDeVista: string;
  linaje: Map<string, Apellidos>;
  fechas: ModoFechas;
  hoy: Fecha;
  relacion: Relacion;
  pertenencia?: Pertenencia;
  homonimia?: Homonimia;
}

/** La ficha no recorta nada: es ancha y se desplaza, al revés que el nodo del lienzo. */
const SIN_RECORTE = { titulo: 200, contexto: 200 };

export function fichaDe(g: Grafo, id: string, o: OpcionesFicha): Ficha {
  const p = g.personaPorId.get(id);
  if (!p) throw new Error(`Persona desconocida: ${id}.`);
  // El bloque de identidad da el nombre, las marcas y la nota; lo que aquí sobra es el año,
  // que baja a la línea de datos con el resto de la vida, y la segunda línea, que en la
  // ficha la dicen las filas enteras en vez de resumida.
  const identidad = identidadDe(g, id, { ...o, apellidos: 2, fechas: "ocultar", largos: SIN_RECORTE });
  return {
    esCentro: id === o.puntoDeVista,
    relacion: o.relacion,
    titulo: identidad.titulo,
    sinNombre: p.nombre === SIN_NOMBRE,
    datos: `${vida(p, o.fechas, o.hoy)} · ${escribirNivel(o.relacion.nivel)}`,
    marcas: identidad.marcas,
    nota: identidad.nota,
    aviso: p.nombre === SIN_NOMBRE && !p.birth && !p.death ? AVISO_SIN_NADA : undefined,
    filas: filasDe(g, p, o.linaje, o.pertenencia),
    homonimos: homonimosDe(p, o),
  };
}

/**
 * A los que comparten nombre no los lista la ficha —serían fichas dentro de una ficha—: se
 * sale a la búsqueda, que es la superficie que sabe ponerlos uno debajo de otro con de quién
 * es cada uno, que es lo único que los distingue.
 */
function homonimosDe(p: Persona, { homonimia, linaje }: OpcionesFicha): Homonimos | undefined {
  if (!homonimia || homonimia.total < 2) return undefined;
  const otros = homonimia.total - 1;
  if (p.nombre === SIN_NOMBRE) {
    const cuantas = otros === 1 ? "La otra persona" : `Las otras ${otros} personas`;
    return { texto: `${cuantas} sin nombre`, consulta: null };
  }
  const año = p.birth ? ` (${añoDe(p.birth)})` : "";
  return {
    texto: `${otros === 1 ? "El otro" : `Los otros ${otros}`} «${p.nombre}${año}»`,
    consulta: [p.nombre, ...(linaje.get(p.id)?.todos ?? [])].join(" "),
  };
}

const AVISO_SIN_NADA =
  "El documento no le da nombre ni fechas. Solo se la puede identificar por su familia, y así aparece en toda la app.";

/**
 * Lo que se sabe de su vida. **La raya abierta dice que sigue aquí**: a quien hoy pasaría
 * de cien años sin que conste su defunción no se le pone, porque callar no es decir que
 * vive. La ficha es el expediente, así que las fechas salen siempre —el interruptor solo
 * decide con cuánta precisión, y ni ocultarlas ni cambiarlas por la edad valen aquí—.
 */
function vida(p: Persona, modo: ModoFechas, hoy: Fecha): string {
  const escrita = escribirVida(p, modo === "completa" ? "completa" : "año", hoy);
  if (!escrita) return "sin fechas";
  return p.birth && !p.death && !seLeSuponeFallecido(p, hoy) ? `${escrita} —` : escrita;
}

/**
 * De dónde viene y qué hizo con su vida, en ese orden. **Solo las dos primeras se escriben
 * vacías**, porque todo el mundo tiene padres y todo el mundo es de una rama: ahí el hueco
 * es un dato —el documento callaba—. Casarse y tener hijos no le pasa a todo el mundo, así
 * que anunciar que no consta sería contestar a una pregunta que nadie ha hecho, y en un
 * niño suena a reproche.
 */
function filasDe(g: Grafo, p: Persona, linaje: Map<string, Apellidos>, pertenencia?: Pertenencia): Fila[] {
  const filas = [fila("Padres", padres(g, p.id), "no constan"), ...ramas(pertenencia)];
  for (const [clave, valor] of [
    ["Unión", uniones(g, p.id, linaje)],
    ["Hijos", hijos(g, p.id)],
  ]) {
    if (valor !== "") filas.push({ clave, valor, falta: false });
  }
  return filas;
}

const fila = (clave: string, valor: string, ausente: string): Fila =>
  valor === "" ? { clave, valor: `— ${ausente}`, falta: true } : { clave, valor, falta: false };

function padres(g: Grafo, id: string): string {
  const union = g.unionPorId.get(g.unionDeHijo.get(id) ?? "");
  if (!union) return "";
  return ordenarPareja(union.partners, (x) => g.personaPorId.get(x))
    .map((x) => nombrar(g, x))
    .filter((t) => t !== "")
    .join(" y ");
}

/**
 * Con quién se unió y qué fue de aquello. Aquí sí se dice que acabó —la ficha es el sitio
 * donde consta lo que consta—, al revés que la segunda línea del bloque de identidad, que
 * solo contesta a quién es esta persona.
 */
function uniones(g: Grafo, id: string, linaje: Map<string, Apellidos>): string {
  const escritas: string[] = [];
  for (const uid of g.unionesDePartner.get(id) ?? []) {
    const u = g.unionPorId.get(uid)!;
    const otro = u.partners.find((x) => x !== id);
    if (otro === undefined) continue; // progenitor sin pareja documentada: la unión no es con nadie
    const verbo = u.tipo === "pareja" ? "pareja de" : `${declinado(g, id, "casado", "casada")} con`;
    const final = u.roto ? (u.tipo === "pareja" ? " · ya no" : " · divorciados") : "";
    escritas.push(`${verbo} ${nombrar(g, otro, linaje.get(otro)?.todos[0])}${final}`);
  }
  return escritas.join("; ");
}

const hijos = (g: Grafo, id: string): string =>
  (g.unionesDePartner.get(id) ?? [])
    .flatMap((uid) => g.unionPorId.get(uid)!.children)
    .map((x) => nombrar(g, x))
    .join(", ");

/**
 * Estar en dos ramas no es una ambigüedad que resolver, así que la fila las dice todas. Y
 * de quien entró casándose se dice con esas palabras: la rama es suya, pero no de sangre.
 */
function ramas(pertenencia?: Pertenencia): Fila[] {
  if (!pertenencia) return [fila("Rama", "", "no consta")];
  const lista = enumerar(pertenencia.ramas);
  return [
    {
      clave: pertenencia.ramas.length > 1 ? "Ramas" : "Rama",
      valor: pertenencia.porMatrimonio ? `entra en ${lista} por matrimonio` : lista,
      falta: false,
    },
  ];
}

const enumerar = (partes: string[]): string =>
  partes.length <= 1 ? (partes[0] ?? "") : `${partes.slice(0, -1).join(", ")} y ${partes[partes.length - 1]}`;

/**
 * Cómo se nombra a alguien dentro de una fila: su nombre y su año. **El cónyuge además
 * lleva apellido**, porque es el único de la ficha que trae uno de fuera: los padres y los
 * hijos comparten el del sujeto, que está escrito en grande ahí arriba.
 */
function nombrar(g: Grafo, id: string, apellido?: string): string {
  const p = g.personaPorId.get(id);
  if (!p) return "";
  const llamado = apellido ? `${p.nombre} ${apellido}` : p.nombre;
  return p.birth ? `${llamado} (${añoDe(p.birth)})` : llamado;
}
