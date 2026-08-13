// El bloque de identidad: las dos líneas con las que una persona aparece en cualquier
// superficie del árbol. Puro: `npx tsx lib/arbol/identidad.test.ts`.
//
// Nadie sale nunca como un nombre suelto. A 55 personas el documento no les da apellido y
// a 104 ninguna fecha, así que la segunda línea —de quién son— no es contexto: es el
// identificador, y por eso es lo último que se recorta. Cuando no cabe se degrada por
// peldaños, y el primer progenitor y el cónyuge no están en ninguno: quitarlos deja a esas
// personas sin nada que las distinga de otra con su mismo nombre.

import { añoDe, escribirVida, type Fecha, type ModoFechas } from "./fechas";
import { parejaDirecta, type Grafo } from "./grafo";
import { apellidosDe, etiquetaDe, ordenarPareja, type Apellidos, type ModoApellidos } from "./personas";
import type { Persona } from "./tree";

/** Como los registró el documento cuando no dio ninguno: se pinta en cursiva y apagado. */
export const SIN_NOMBRE = "Sin nombre";

/**
 * Cómo se pinta cada trozo de la primera línea. `dudoso` y `sinNombre` van en cursiva,
 * cada uno por su motivo: uno es el nombre que el documento no daba por seguro y el otro
 * el que no daba.
 */
export type Pinta = "nombre" | "dudoso" | "heredado" | "año" | "sinNombre";

export interface Trozo {
  texto: string;
  pinta: Pinta;
}

export interface Identidad {
  /** Línea 1: el nombre con sus apellidos y el año, cada trozo con su pinta. */
  titulo: Trozo[];
  /** Línea 2: de quién es. Ya degradada a lo que cabe, y nunca partida en dos. */
  contexto: string;
  /** Etiquetas que se apilan detrás del nombre donde hay sitio; el lienzo no las pinta. */
  marcas: string[];
  /** Lo que anotó el documento, tal cual. Solo lo pinta la ficha. */
  nota?: string;
}

/** Cuántos comparten nombre completo y año, y cuál de ellos es este. */
export interface Homonimia {
  cual: number;
  total: number;
  /** Coinciden además en el año: sin él, decir «y año» sería mentir. */
  conAño: boolean;
}

export interface OpcionesIdentidad {
  /** Los apellidos ya resueltos contra el árbol (`apellidosDe`), que se calculan una vez. */
  linaje: Map<string, Apellidos>;
  fechas: ModoFechas;
  apellidos: ModoApellidos;
  /** El día del servidor, del que sale la edad. Nunca el reloj del navegador. */
  hoy: Fecha;
  /** Caracteres que caben en cada línea de la superficie que la pinta. */
  largos: { titulo: number; contexto: number };
  /** Sus ramas, cuando quien pinta las sabe; sin ellas la línea se queda en la familia. */
  ramas?: string[];
  homonimia?: Homonimia;
}

export function identidadDe(g: Grafo, id: string, o: OpcionesIdentidad): Identidad {
  const p = g.personaPorId.get(id);
  if (!p) throw new Error(`Persona desconocida: ${id}.`);
  return {
    titulo: tituloDe(p, o),
    contexto: contextoDe(g, id, o.ramas, o.largos.contexto),
    marcas: marcasDe(p, o),
    nota: p.nota,
  };
}

// --- Línea 1: el nombre, sus apellidos y el año ---

/**
 * El nombre manda y el año no se recorta nunca: es el desempate más barato que hay y lo
 * llevan 309 personas. Lo que cede es el apellido, que además se lee subiendo por el árbol.
 */
function tituloDe(p: Persona, { linaje, apellidos, fechas, hoy, largos }: OpcionesIdentidad): Trozo[] {
  const año = añoEscrito(p, fechas, hoy);
  const etiqueta = etiquetaDe(p, apellidos, linaje.get(p.id)!);
  const nombrado = recortar(etiqueta.texto, largos.titulo - (año ? año.length + 1 : 0));
  // Tres tratamientos en una línea: el nombre, los apellidos que constan por escrito y
  // los que se deducen del árbol, que van apagados porque el documento no los decía.
  const corte = Math.min(p.nombre.length, etiqueta.heredadoDesde, nombrado.length);
  const suyo: Pinta = p.nombre === SIN_NOMBRE ? "sinNombre" : p.incierto === "nombre" ? "dudoso" : "nombre";
  const trozos: Trozo[] = [
    { texto: nombrado.slice(0, corte), pinta: suyo },
    { texto: nombrado.slice(corte, Math.max(corte, etiqueta.heredadoDesde)), pinta: "nombre" },
    { texto: nombrado.slice(Math.max(corte, etiqueta.heredadoDesde)), pinta: "heredado" },
  ];
  // El separador viaja con el año: los trozos del nombre son tajadas de una misma cadena
  // y quien los pinta los pega uno detrás de otro sin poner nada en medio.
  if (año) trozos.push({ texto: nombrado ? ` ${año}` : año, pinta: "año" });
  return trozos.filter((t) => t.texto !== "");
}

/**
 * Lo que se sabe de su vida, entre paréntesis detrás del nombre, y entre interrogantes si
 * es el dato que el documento dudaba —la edad arrastra la duda de la fecha de la que sale—.
 */
function añoEscrito(p: Persona, modo: ModoFechas, hoy: Fecha): string {
  const vida = escribirVida(p, modo, hoy);
  if (!vida) return "";
  return p.incierto === "fechas" ? `(¿${vida}?)` : `(${vida})`;
}

// --- Línea 2: de quién es ---

/**
 * Los peldaños, del texto entero al mínimo que identifica. Se bajan en este orden: primero
 * los años de padres y cónyuge, luego el segundo progenitor y por último la rama, que es
 * lo que menos distingue a una persona de otra —son siete para 416—.
 */
const PELDAÑOS = [
  { años: true, ambosPadres: true, rama: true },
  { años: false, ambosPadres: true, rama: true },
  { años: false, ambosPadres: false, rama: true },
  { años: false, ambosPadres: false, rama: false },
] as const;

type Peldaño = (typeof PELDAÑOS)[number];

function contextoDe(g: Grafo, id: string, ramas: string[] | undefined, largo: number): string {
  let texto = "";
  for (const peldaño of PELDAÑOS) {
    texto = escribirContexto(g, id, ramas, peldaño);
    if (texto.length <= largo) return texto;
  }
  return recortar(texto, largo);
}

/**
 * La segunda línea entera, sin degradar ni recortar. Nadie la pinta así: es lo que la
 * búsqueda mira además del nombre, porque a quien el documento deja sin apellido y sin fecha
 * solo se llega por su gente.
 */
export const contextoEntero = (g: Grafo, id: string): string => escribirContexto(g, id, undefined, PELDAÑOS[0]);

function escribirContexto(g: Grafo, id: string, ramas: string[] | undefined, peldaño: Peldaño): string {
  const partes = [filiacion(g, id, peldaño), union(g, id, peldaño)].filter((t) => t !== "");
  // Los bisabuelos de arriba del todo no son hijos ni cónyuges de nadie documentado: se
  // les nombra por lo que sí trajeron los documentos, que es su descendencia.
  if (partes.length === 0) partes.push(prole(g, id));
  if (peldaño.rama && ramas && ramas.length > 0) partes.push(escribirRamas(ramas));
  return partes.filter((t) => t !== "").join(" · ");
}

function filiacion(g: Grafo, id: string, { años, ambosPadres }: Peldaño): string {
  const union = g.unionPorId.get(g.unionDeHijo.get(id) ?? "");
  if (!union) return "";
  const padres = ordenarPareja(union.partners, (p) => g.personaPorId.get(p))
    .map((p) => g.personaPorId.get(p))
    .filter((p): p is Persona => p !== undefined);
  if (padres.length === 0) return "";
  // Al quedarse con uno se conserva el que nombra: «hija de Sin nombre» no dice de quién es
  // nadie, y quien sí tiene nombre está justo al lado. Solo pasa cuando el que no lo tiene
  // es además el que sube en la pareja, que es el orden con el que se dibuja, no un rango.
  const puestos = ambosPadres ? padres : [padres.find((p) => p.nombre !== SIN_NOMBRE) ?? padres[0]];
  return `${declinado(g, id, "hijo", "hija")} de ${puestos.map((p) => conAño(p, años)).join(" y ")}`;
}

/**
 * Su unión, la primera si hubo varias. Que acabara no se dice aquí: la línea contesta a
 * «quién es esta persona» y con quién se casó la identifica igual, siga o no casada.
 */
function union(g: Grafo, id: string, { años }: Peldaño): string {
  for (const uid of g.unionesDePartner.get(id) ?? []) {
    const u = g.unionPorId.get(uid);
    const otro = u?.partners.find((p) => p !== id);
    const pareja = otro === undefined ? undefined : g.personaPorId.get(otro);
    if (!u || !pareja) continue;
    const verbo = u.tipo === "pareja" ? "pareja de" : `${declinado(g, id, "casado", "casada")} con`;
    return `${verbo} ${conAño(pareja, años)}`;
  }
  return "";
}

function prole(g: Grafo, id: string): string {
  const hijos = (g.unionesDePartner.get(id) ?? []).flatMap((uid) => g.unionPorId.get(uid)?.children ?? []);
  const primero = g.personaPorId.get(hijos[0] ?? "");
  if (!primero) return "";
  const base = `${declinado(g, id, "padre", "madre")} de ${primero.nombre}`;
  return hijos.length === 1 ? base : `${base} y ${hijos.length - 1} más`;
}

const conAño = (p: Persona, años: boolean): string =>
  años && p.birth ? `${p.nombre} (${añoDe(p.birth as Fecha)})` : p.nombre;

const escribirRamas = (ramas: string[]): string =>
  ramas.length === 1 ? `rama de ${ramas[0]}` : `ramas de ${ramas.slice(0, -1).join(", de ")} y de ${ramas[ramas.length - 1]}`;

/**
 * A los cuatro «Sin nombre» el documento no les da sexo, pero sí cónyuge: casada con un
 * hombre, se escribe en femenino. Sin ninguna de las dos cosas, masculino, que es como la
 * lengua resuelve lo que no sabe.
 */
export function declinado(g: Grafo, id: string, masculino: string, femenino: string): string {
  const propio = g.personaPorId.get(id)?.sexo;
  if (propio) return propio === "m" ? femenino : masculino;
  for (const otro of parejaDirecta(g, id)) {
    const suyo = g.personaPorId.get(otro)?.sexo;
    if (suyo) return suyo === "h" ? femenino : masculino;
  }
  return masculino;
}

// --- Las marcas ---

function marcasDe(p: Persona, { homonimia }: OpcionesIdentidad): string[] {
  const marcas: string[] = [];
  if (p.incierto) marcas.push("incierto");
  if (homonimia && homonimia.total > 1) {
    // A los cuatro que no tienen nombre no se les puede decir que comparten el suyo: lo que
    // comparten es no tenerlo, y es lo único que avisa de que son cuatro y no una repetida.
    const cuantos = `${homonimia.cual} de ${homonimia.total}`;
    const como = p.nombre === SIN_NOMBRE ? "sin nombre" : `con este nombre${homonimia.conAño ? " y año" : ""}`;
    marcas.push(`${cuantos} ${como}`);
  }
  return marcas;
}

/**
 * Quiénes comparten nombre completo —con los apellidos ya deducidos del árbol— y año. Con
 * los apellidos reconstruidos son 12 personas; sin reconstruirlos serían 168, que era el
 * problema que el dato crudo aparentaba tener.
 */
export function homonimias(g: Grafo, linaje: Map<string, Apellidos>): Map<string, Homonimia> {
  const grupos = new Map<string, string[]>();
  const clave = (p: Persona) => `${p.nombre} ${linaje.get(p.id)?.todos.join(" ") ?? ""}|${p.birth?.slice(0, 4) ?? ""}`;
  for (const p of g.personaPorId.values()) {
    const k = clave(p);
    grupos.set(k, [...(grupos.get(k) ?? []), p.id]);
  }
  const salida = new Map<string, Homonimia>();
  for (const [k, ids] of grupos) {
    if (ids.length === 1) continue;
    const conAño = !k.endsWith("|");
    ids.forEach((id, i) => salida.set(id, { cual: i + 1, total: ids.length, conAño }));
  }
  return salida;
}

/**
 * Lo que cabe en un nodo del lienzo, medido en el navegador sobre sus 228 px: 6,4 px por
 * carácter a 13 px en la primera línea y 5,2 px a 10,5 px en la segunda.
 */
export const LARGOS_NODO = { titulo: 32, contexto: 40 };

/**
 * Y lo que cabe en una fila de una hoja inferior, sobre sus 343 px: el título comparte
 * ancho con la fecha y con lo que se celebra, y la segunda línea se lleva la fila entera
 * menos la fecha.
 */
export const LARGOS_FILA = { titulo: 34, contexto: 51 };

/**
 * Y lo que cabe en una fila de lista, donde el título solo comparte ancho con los pasos: hay
 * sitio para los dos apellidos, que es lo que distingue a trece filas que se llaman igual.
 */
export const LARGOS_LISTA = { titulo: 40, contexto: 44 };

/** Todo lo que hace falta para escribir a cualquiera, calculado una vez por árbol. */
export function libretaDe(g: Grafo): { linaje: Map<string, Apellidos>; homonimias: Map<string, Homonimia> } {
  const linaje = apellidosDe(g);
  return { linaje, homonimias: homonimias(g, linaje) };
}

/** Lo que no cabe se dice que no cabe: nunca se corta en seco. */
const recortar = (texto: string, largo: number): string =>
  texto.length <= largo ? texto : texto.slice(0, Math.max(largo - 1, 0)).trimEnd() + "…";
