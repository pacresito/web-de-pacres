// Quién celebra algo en los próximos días, visto desde el punto de vista: los cumpleaños,
// las onomásticas y los dos días que la familia se felicita entera, de los que viven.
// Puro: `npx tsx lib/arbol/celebraciones.test.ts`.

import { añoDe, conDia, edadDe, MS_DIA, type Fecha } from "./fechas";
import { type Grafo } from "./grafo";
import { declinar, parentescos } from "./parentesco";
import { onomasticaDe, primerDomingoDeMayo, type DiaDelAño } from "./santoral";

/** Cuánto se mira hacia delante. Más allá deja de ser un aviso y pasa a ser un listado. */
export const VENTANA = 30;

/**
 * La familia cercana: los parentescos de primer grado en las dos direcciones, más las
 * parejas de todos ellos —el cuñado y la tía política son familia aunque no compartan
 * sangre—. Los segundos (primos segundos, tíos abuelos) quedan fuera: con ellos habría
 * alguien celebrando algo cada semana y el aviso dejaría de avisar.
 */
const CERCANA = new Set(["bisabuelos", "abuelos", "padres", "tíos", "hermanos", "primos", "hijos", "sobrinos", "nietos"]);

/**
 * Los documentos anotan la defunción, pero no siempre. A quien hoy pasaría de esta edad
 * sin que conste nada, el árbol no lo da por vivo: callar no es decir que sigue aquí.
 */
const EDAD_IMPROBABLE = 100;

export type TipoCelebracion = "cumpleaños" | "onomástica" | "día del padre" | "día de la madre";

/**
 * Los dos días que no son de nadie. **El del padre es el 19 de marzo** —San José, y por
 * eso no se mueve— y **el de la madre, el primer domingo de mayo**, que cambia cada año.
 * Van sin lista de nombres a propósito: es el mismo día para todos los padres del árbol, y
 * enumerarlos convertía el aviso en el censo. `sexo` no filtra a nadie, dice de cuál de los
 * dos progenitores va el día cuando hay que mirar hacia arriba.
 */
const FIESTAS: { tipo: TipoCelebracion; dia: DiaDelAño; sexo: "h" | "m" }[] = [
  { tipo: "día del padre", dia: "03-19", sexo: "h" },
  { tipo: "día de la madre", dia: primerDomingoDeMayo, sexo: "m" },
];

/**
 * Hacia dónde apunta la felicitación de esos dos días: a quien mira si tiene hijos, a su
 * padre o su madre si no los tiene y aún vive, y a nadie en particular si ni lo uno ni lo
 * otro. Quien ya no tiene a quién felicitar no necesita que se lo recuerden con nombre.
 */
export type Dirigida = "propio" | "progenitor" | "generico";

export interface Celebracion {
  tipo: TipoCelebracion;
  /** El día en que cae, ya resuelto al año que toca: `"2026-08-16"`. */
  fecha: Fecha;
  /** Cuántos días faltan; 0 es hoy. */
  faltan: number;
  /** De quién es. **Nulo en los días del padre y de la madre**, que no son de nadie. */
  id: string | null;
  nombre: string | null;
  /** Cómo se llama desde el punto de vista, declinado: «prima», «pareja de Ana». */
  parentesco: string | null;
  esPuntoDeVista: boolean;
  /** Los que cumple ese día. Solo el cumpleaños tiene edad que contar. */
  edad: number | null;
  /** Solo en los días del padre y de la madre, que es lo único que se puede dirigir. */
  dirigida?: Dirigida;
}

/** Se lee como una felicitación y no como una fila de agenda: la banda, no la lista. */
export const esFelicitacion = (c: Celebracion): boolean => c.esPuntoDeVista || c.nombre === null;

/** Es el día de quien mira, y por eso se anuncia desde el botón cerrado. */
export const esTuDia = (c: Celebracion): boolean => c.esPuntoDeVista || c.dirigida === "propio";

/**
 * Lo que se celebra de aquí a `ventana` días, en orden y sin los muertos. Una persona
 * puede salir dos veces —el cumpleaños y el santo son dos cosas y a veces caen la misma
 * semana—, y el punto de vista sale como uno más: la fiesta la pone quien lo pinte.
 */
export function proximasCelebraciones(g: Grafo, pov: string, hoy: Fecha, ventana = VENTANA): Celebracion[] {
  const salida: Celebracion[] = [];

  for (const [id, parentesco] of familiaCercana(g, pov)) {
    const persona = g.personaPorId.get(id)!;
    if (!vive(persona, hoy)) continue;
    const comun = { id, nombre: persona.nombre, parentesco, esPuntoDeVista: id === pov };
    // La edad se calcula sobre la fecha ya resuelta y no sobre hoy: el que cumple la
    // semana que viene cumple los del año que viene, aunque hoy tenga uno menos.
    const cabe = (tipo: TipoCelebracion, dia: DiaDelAño, edadEn?: (fecha: Fecha) => number) => {
      const { fecha, faltan } = proximaVez(hoy, dia);
      if (faltan <= ventana) salida.push({ ...comun, tipo, fecha, faltan, edad: edadEn?.(fecha) ?? null });
    };

    const nacimiento = persona.birth;
    if (nacimiento && conDia(nacimiento)) {
      cabe("cumpleaños", nacimiento.slice(5), (fecha) => añoDe(fecha) - añoDe(nacimiento));
    }
    const santo = onomasticaDe(persona.nombre);
    if (santo) cabe("onomástica", santo);
  }

  // Los dos días entran solos y siempre, sin depender de que quede nadie a quien felicitar.
  for (const { tipo, dia, sexo } of FIESTAS) {
    const { fecha, faltan } = proximaVez(hoy, dia);
    if (faltan > ventana) continue;
    const dirigida = aQuienApunta(g, pov, sexo, hoy);
    salida.push({ tipo, fecha, faltan, id: null, nombre: null, parentesco: null, esPuntoDeVista: false, edad: null, dirigida });
  }

  // Por fecha; y en un mismo día, en el orden en que se declaran los tipos: el cumpleaños
  // por delante, que es el único que trae tarta.
  const ORDEN: TipoCelebracion[] = ["cumpleaños", "día del padre", "día de la madre", "onomástica"];
  return salida.sort(
    (a, b) =>
      a.faltan - b.faltan ||
      ORDEN.indexOf(a.tipo) - ORDEN.indexOf(b.tipo) ||
      (a.nombre ?? "").localeCompare(b.nombre ?? "", "es"),
  );
}

/** Si uno es padre el día es suyo; si no, de quien lo sea de él mientras viva. */
function aQuienApunta(g: Grafo, pov: string, sexo: "h" | "m", hoy: Fecha): Dirigida {
  for (const unionId of g.unionesDePartner.get(pov) ?? []) {
    if (g.unionPorId.get(unionId)!.children.length > 0) return "propio";
  }
  const partners = g.unionPorId.get(g.unionDeHijo.get(pov) ?? "")?.partners ?? [];
  const progenitor = partners.map((p) => g.personaPorId.get(p)!).find((p) => p.sexo === sexo);
  return progenitor && vive(progenitor, hoy) ? "progenitor" : "generico";
}

/** A cada uno de la familia cercana, cómo se le llama desde el punto de vista. */
function familiaCercana(g: Grafo, pov: string): Map<string, string | null> {
  const salida = new Map<string, string | null>();
  for (const [id, { termino }] of parentescos(g, pov)) {
    if (!CERCANA.has(termino)) continue;
    // El punto de vista se cuenta entre sus propios hermanos: es familia suya, pero no
    // se llama a sí mismo hermano de nadie.
    if (id === pov) salida.set(id, null);
    else salida.set(id, declinar(termino, 1, g.personaPorId.get(id)!.sexo === "m" ? 1 : 0));
  }

  // Las parejas van después y sobre una foto fija de la sangre: si no, la pareja de un
  // cuñado entraría por ser pareja de alguien que acaba de entrar por ser pareja.
  for (const id of [...salida.keys()]) {
    for (const unionId of g.unionesDePartner.get(id) ?? []) {
      const union = g.unionPorId.get(unionId)!;
      if (union.roto) continue; // el divorcio saca de la familia, y del panel
      for (const otro of union.partners) {
        if (otro === id || salida.has(otro)) continue;
        salida.set(otro, id === pov ? "tu pareja" : `pareja de ${g.personaPorId.get(id)!.nombre}`);
      }
    }
  }
  return salida;
}

const vive = (p: { birth?: Fecha; death?: Fecha }, hoy: Fecha): boolean => {
  if (p.death) return false;
  const edad = edadDe(p, hoy);
  return edad === null || edad < EDAD_IMPROBABLE;
};

/** La próxima vez que caiga ese día, contando hoy como 0. Vale para los que se mueven. */
export function proximaVez(hoy: Fecha, diaDelAño: DiaDelAño): { fecha: Fecha; faltan: number } {
  const [año, mes, dia] = hoy.split("-").map(Number);
  const desde = Date.UTC(año, mes - 1, dia);
  for (const candidato of [año, año + 1]) {
    const cuando = enElAño(diaDelAño, candidato);
    if (cuando >= desde) return { fecha: escribirUTC(cuando), faltan: Math.round((cuando - desde) / MS_DIA) };
  }
  throw new Error(`Fecha imposible: ${diaDelAño}.`);
}

/**
 * Ese día del año, en ese año. **El 29 de febrero se celebra el 1 de marzo** los tres años
 * de cada cuatro en que no existe: es lo que hace el Código Civil al contar plazos por
 * meses, y adelantarlo al 28 haría cumplir años dos veces en el mismo febrero bisiesto.
 */
function enElAño(diaDelAño: DiaDelAño, año: number): number {
  const [mes, dia] = (typeof diaDelAño === "function" ? diaDelAño(año) : diaDelAño).split("-").map(Number);
  if (mes === 2 && dia === 29 && !bisiesto(año)) return Date.UTC(año, 2, 1);
  return Date.UTC(año, mes - 1, dia);
}

const bisiesto = (año: number) => (año % 4 === 0 && año % 100 !== 0) || año % 400 === 0;

const escribirUTC = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/**
 * Lo que se lee cuando lo que se celebra es del propio punto de vista: la única línea del
 * panel dirigida a quien mira. Rota con la edad y no al azar — el servidor pinta el árbol
 * antes que el navegador, y una frase distinta en cada uno rompe la hidratación.
 */
export function felicitacion(c: Celebracion): string {
  const { tipo, edad, faltan } = c;
  if (tipo === "cumpleaños") {
    if (faltan === 0) return CUMPLES[edad! % CUMPLES.length](edad!);
    if (faltan === 1) return "Mañana es el tuyo. Ve ensayando la cara de sorpresa.";
    return `El tuyo, dentro de ${faltan} días. Tiempo de sobra para insinuar el regalo.`;
  }
  if (tipo === "onomástica") {
    if (faltan === 0) return "Hoy es tu santo. Medio cumpleaños, sin la parte de envejecer.";
    return faltan === 1 ? "Mañana es tu santo." : `Tu santo, dentro de ${faltan} días.`;
  }
  return elDia(c);
}

/**
 * El día del padre y el de la madre, dicho a quien mira. **La broma solo aparece cuando
 * hay alguien de quien reírse**: quien no tiene hijos ni conserva a ese progenitor recibe
 * el aviso a secas, porque ese día ya le pesa bastante sin que el árbol haga gracias.
 * En el lienzo los hijos caen a la derecha del punto de vista y los padres a la izquierda,
 * así que las dos direcciones son literales.
 */
function elDia({ tipo, faltan, dirigida }: Celebracion): string {
  const quien = tipo === "día del padre" ? "padre" : "madre";
  if (dirigida === "propio") {
    if (faltan === 0) return `Hoy es el ${tipo}, y va por ti: los responsables están a tu derecha.`;
    if (faltan === 1) return `Mañana es el ${tipo}, y va por ti.`;
    return `El ${tipo} va por ti, dentro de ${faltan} días.`;
  }
  if (dirigida === "progenitor") {
    if (faltan === 0) return `Hoy es el ${tipo}: tu ${quien} está una columna a tu izquierda.`;
    if (faltan === 1) return `Mañana es el ${tipo}. Ve pensando qué le dices a tu ${quien}.`;
    return `El ${tipo}, dentro de ${faltan} días. Tiempo de sobra para acordarte de tu ${quien}.`;
  }
  if (faltan === 0) return `Hoy es el ${tipo}. Un buen día para mirar árbol arriba.`;
  return faltan === 1 ? `Mañana es el ${tipo}.` : `El ${tipo}, dentro de ${faltan} días.`;
}

const CUMPLES: ((edad: number) => string)[] = [
  (edad) => `¡Felicidades! Hoy cumples ${edad} y el árbol se ha enterado antes que tú.`,
  (edad) => `${edad} años. Toda esta gente ahí detrás, y hoy la pantalla va de ti.`,
  (edad) => `Hoy cumples ${edad}. Sopla rápido, que la tarta no se pinta sola.`,
  (edad) => `${edad}. Hoy eres la raíz de todo esto — hasta que toques a otro, claro.`,
  (edad) => `¡Felicidades! Hoy cumples ${edad}: el resto del árbol que espere su turno.`,
];

/** Lo que anuncia el botón cerrado cuando hoy es el día del punto de vista. */
export const anuncio = ({ tipo }: Celebracion): string =>
  tipo === "cumpleaños" ? "🎂 Es tu cumpleaños" : tipo === "onomástica" ? "🎉 Hoy es tu santo" : `🎉 Es el ${tipo}`;
