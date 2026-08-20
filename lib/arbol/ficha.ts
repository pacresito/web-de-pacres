// La ficha: todo lo que se dice de una persona cuando se la toca, en un orden que no
// cambia nunca. Puro: `npx tsx lib/arbol/ficha.test.ts`.
//
// El orden es invariable porque la ficha se lee de arriba abajo buscando siempre lo mismo:
// primero qué es esa persona de ti, luego quién es y por último de quién viene.

import { añoDe, conDia, enMs, escribirDiaDeMes, escribirVida, MS_DIA, seLeSuponeFallecido, type Fecha } from "./fechas";
import { fotosDe, type FotoEnFicha } from "./fotos";
import type { Grafo } from "./grafo";
import { identidadDe, SIN_NOMBRE, verboDeUnion, type Homonimia, type Trozo } from "./identidad";
import { ordenarPareja, type Apellidos } from "./personas";
import type { Relacion } from "./parentesco";
import type { Pertenencia } from "./ramas";
import { enElAño, onomasticaDePersona } from "./santoral";
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
  /** Lo que consta de su vida, debajo del nombre: «1945-05-31 – 2018». */
  datos: string;
  marcas: string[];
  nota?: string;
  /** Lo que hay que advertir antes de leer nada más; hoy, solo el caso sin nombre ni fechas. */
  aviso?: string;
  filas: Fila[];
  /** Las suyas, en orden cronológico. Vacío en casi todo el árbol: no se anuncian, se encuentran. */
  fotos: FotoEnFicha[];
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
    datos: escribirVida(p, "completa", o.hoy) || "sin fechas",
    marcas: identidad.marcas,
    nota: identidad.nota,
    aviso: p.nombre === SIN_NOMBRE && !p.birth && !p.death ? AVISO_SIN_NADA : undefined,
    filas: filasDe(g, p, o, id === o.puntoDeVista),
    // El nombre entero sale del título, que aquí viene con los dos apellidos y sin año: es
    // el mismo que se lee en grande, y con el que se guarda la foto al descargarla.
    fotos: fotosDe(id, { nombreCompleto: identidad.titulo.map((t) => t.texto).join(""), birth: p.birth }),
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
  "No consta su nombre ni sus fechas. Solo se la puede identificar por su familia, y así aparece en toda la app.";

/**
 * De dónde viene y qué hizo con su vida, en ese orden. **Solo las dos primeras se escriben
 * vacías**, porque todo el mundo tiene padres y todo el mundo es de una rama: ahí el hueco
 * es un dato —el documento callaba—. Casarse y tener hijos no le pasa a todo el mundo, así
 * que anunciar que no consta sería contestar a una pregunta que nadie ha hecho, y en un
 * niño suena a reproche.
 */
function filasDe(g: Grafo, p: Persona, o: OpcionesFicha, esCentro: boolean): Fila[] {
  const { hoy } = o;
  const filas = [fila("Padres", padres(g, p.id), "no constan"), ...ramas(g, o.pertenencia)];
  for (const [clave, valor] of [
    ["Unión", uniones(g, p.id, o.linaje)],
    ["Hijos", hijos(g, p.id)],
  ]) {
    if (valor !== "") filas.push({ clave, valor, falta: false });
  }
  const cuenta = vivencia(p, hoy, esCentro);
  if (cuenta) filas.push(cuenta);
  const santo = onomastica(p, hoy);
  if (santo) filas.push(santo);
  return filas;
}

/**
 * Los años, detrás de lo que consta: es lo que se calcula. Al que vive se le da
 * su cumpleaños cuando se sabe el día —la fila la lee quien va a felicitar— y al que no,
 * la edad a secas; la del fallecido la dice el verbo, sin leyenda que descifrar. Sin
 * nacimiento no hay fila, y a quien hoy pasaría de cien sin que conste su defunción
 * tampoco: esa edad se cuenta hasta hoy, y hoy ya no está.
 */
function vivencia(p: Persona, hoy: Fecha, esCentro: boolean): Fila | null {
  const años = escribirVida(p, "edad", hoy);
  if (!años) return null;
  if (p.death || !conDia(p.birth!)) return { clave: "Edad", valor: años, falta: false };
  return { clave: "Cumple", valor: cumpleaños(p.birth!, hoy, esCentro), falta: false };
}

/**
 * El cumpleaños, dicho con el verbo en el tiempo que le toca. **La cifra es siempre la del
 * año en curso** y lo que cambia es el tiempo del verbo: así se deshace la única duda que
 * daba esta fila —si los años son los que tiene o los que va a cumplir—, que en un crío de
 * tres a punto de cumplir cuatro es la diferencia entera. Los tres días de alrededor se
 * llaman por su nombre: ahí la fecha no dice nada que no diga «hoy». Y **en la ficha de
 * quien mira, el verbo se tutea**, como todo lo que la app le dice a él.
 */
function cumpleaños(birth: Fecha, hoy: Fecha, tuya: boolean): string {
  const edad = añoDe(hoy) - añoDe(birth);
  const dias = Math.round((enElAño(birth.slice(5), añoDe(hoy)) - enMs(hoy)) / MS_DIA);
  // Cumplir cero años es haber nacido, y así se dice mientras dura el año en que pasó.
  if (edad === 0) {
    const nacio = tuya ? "Naciste" : "Nació";
    return dias === 0 ? `¡${nacio} hoy!` : dias === -1 ? `¡${nacio} ayer!` : `${nacio} el ${escribirDiaDeMes(birth)}`;
  }
  const años = `${edad} ${edad === 1 ? "año" : "años"}`;
  const cumple = tuya ? "cumples" : "cumple";
  const cumplio = tuya ? "cumpliste" : "cumplió";
  if (dias === 1) return `¡Mañana ${cumple} ${años}!`;
  if (dias === 0) return `¡Hoy ${cumple} ${años}!`;
  if (dias === -1) return `¡Ayer ${cumplio} ${años}!`;
  return `El ${escribirDiaDeMes(birth)} ${dias > 0 ? cumple : cumplio} ${años}`;
}

/**
 * El santo, detrás del cumpleaños y por lo mismo: la lee quien va a felicitar. Sale del
 * nombre y no del documento, así que lo tiene también quien no trae ni una fecha, y por eso
 * mismo no se escribe cuando falta: que un nombre no esté en el santoral no es un hueco del
 * documento sino que no hay tal día. Los que cuelgan de la Semana Santa se resuelven al año
 * en curso, que es el único del que se puede decir cuándo cae.
 */
function onomastica(p: Persona, hoy: Fecha): Fila | null {
  if (p.death || seLeSuponeFallecido(p, hoy)) return null;
  const dia = onomasticaDePersona(p);
  if (!dia) return null;
  const año = añoDe(hoy);
  return { clave: "Onomástica", valor: escribirDiaDeMes(`${año}-${typeof dia === "function" ? dia(año) : dia}`), falta: false };
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
 * Con quién se unió, **todas** y no solo la primera: la ficha es el sitio donde consta lo
 * que consta, y la segunda línea del bloque de identidad solo tiene sitio para una.
 */
function uniones(g: Grafo, id: string, linaje: Map<string, Apellidos>): string {
  const escritas: string[] = [];
  for (const uid of g.unionesDePartner.get(id) ?? []) {
    const u = g.unionPorId.get(uid)!;
    const otro = u.partners.find((x) => x !== id);
    if (otro === undefined) continue; // progenitor sin pareja documentada: la unión no es con nadie
    escritas.push(`${verboDeUnion(g, id, u)} ${nombrar(g, otro, linaje.get(otro)?.todos[0])}`);
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
 * **de quien entró por su pareja se dice por quién**: la rama es suya, pero no de sangre, y
 * el nombre de quien lo trajo es lo que sitúa a las 137 personas que están en ese caso. Se
 * decía «por matrimonio», que a los que nunca se casaron los casaba de oficio.
 */
function ramas(g: Grafo, pertenencia?: Pertenencia): Fila[] {
  if (!pertenencia) return [fila("Rama", "", "no consta")];
  const lista = enumerar(pertenencia.ramas);
  const quien = pertenencia.porMatrimonio && g.personaPorId.get(pertenencia.porMatrimonio)?.nombre;
  return [
    {
      clave: pertenencia.ramas.length > 1 ? "Ramas" : "Rama",
      valor: quien ? `entra en ${lista} por ${quien}` : lista,
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
