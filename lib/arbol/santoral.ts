// Qué día celebra su onomástica cada nombre. Puro: `npx tsx lib/arbol/santoral.test.ts`.
//
// La tabla es a mano y por diseño: casi ningún nombre tiene un solo santo —Vicente sale
// 23 veces en el calendario y Ricardo 10—, así que aquí no hay un dato que consultar sino
// una costumbre que elegir. Se toma la fecha que celebra la familia cuando consta, y si
// no, la que la costumbre española da por el santo de ese nombre. **Corregir una línea es
// corregir la onomástica de toda la familia que se llame así**, y es el único sitio donde
// se toca. El nombre que no está aquí sencillamente no tiene onomástica: hay muchos sin
// santo —Jara, Nora, Horacio, los que no vienen del santoral— y ponerles uno inventado
// sería peor que no ponerles ninguno.

import { añoDe, enMs, MS_DIA, type Fecha } from "./fechas";

/** El día en que cae algo: el `"MM-DD"` de siempre, o la regla que lo sitúa cada año. */
export type DiaDelAño = string | ((año: number) => string);

/** Los nombres que celebran cada día, en minúsculas y sin tildes: la clave se normaliza. */
const CALENDARIO: [DiaDelAño, string[]][] = [
  ["01-01", ["manuel", "manuela"]],
  ["01-06", ["melchor", "gaspar", "baltasar", "reyes"]],
  ["01-10", ["gonzalo"]],
  ["01-19", ["mario"]],
  ["01-20", ["sebastian", "fabian"]],
  ["01-21", ["ines"]],
  ["01-22", ["vicente", "vicenta"]],
  ["01-26", ["paula"]],
  ["01-27", ["angela"]],
  ["01-28", ["tomas", "tomasa"]],
  ["02-01", ["cecilio"]],
  ["02-02", ["candela", "candelaria"]],
  ["02-03", ["blas", "oscar"]],
  ["02-05", ["agueda"]],
  ["02-07", ["ricardo"]],
  ["02-09", ["apolonia"]],
  ["02-11", ["lourdes"]],
  ["02-14", ["valentin", "cirilo"]],
  ["02-18", ["eladio"]],
  ["02-19", ["alvaro"]],
  ["03-08", ["juan de dios"]],
  ["03-09", ["francisca"]],
  ["03-14", ["flora", "matilde"]],
  ["03-17", ["patricio"]],
  ["03-18", ["alejandro", "alessandro"]],
  ["03-19", ["jose", "josefa", "josefina"]],
  ["03-20", ["alejandra"]],
  ["03-25", ["encarnacion", "anunciacion"]],
  ["04-01", ["venancio"]],
  ["04-04", ["isidoro"]],
  ["04-12", ["julio"]],
  ["04-14", ["raul"]],
  ["04-23", ["jorge"]],
  ["04-25", ["marcos"]],
  ["04-27", ["montserrat"]],
  ["04-29", ["catalina"]],
  ["05-15", ["isidro"]],
  ["05-22", ["rita"]],
  ["05-30", ["fernando", "fernanda", "lorena"]],
  ["06-13", ["antonio", "antonia"]],
  ["06-14", ["eliseo"]],
  ["06-20", ["florentina"]],
  ["06-23", ["alicia"]],
  ["06-24", ["juan", "juana", "ivan"]],
  ["06-25", ["guillermo", "guillermina"]],
  ["06-27", ["socorro"]],
  ["06-29", ["pedro", "pablo", "petra"]],
  ["07-11", ["benito", "benita", "olga"]],
  ["07-13", ["enrique", "enriqueta"]],
  ["07-16", ["carmen", "carmela"]],
  ["07-18", ["federico", "federica"]],
  ["07-20", ["margarita", "elias"]],
  ["07-21", ["daniel", "daniela"]],
  ["07-22", ["magdalena"]],
  ["07-24", ["cristina"]],
  ["07-25", ["santiago", "jaime"]],
  ["07-26", ["ana", "joaquin", "joaquina"]],
  ["07-27", ["natalia"]],
  ["07-28", ["victor", "nazario"]],
  ["07-29", ["marta"]],
  ["07-31", ["ignacio", "ignacia"]],
  ["08-01", ["alfonso", "alfonsa"]],
  // Los Ángeles de esta familia lo celebran aquí, no el 2 de octubre que da el calendario.
  ["08-02", ["angel", "angeles", "maria angeles"]],
  ["08-03", ["lidia"]],
  ["08-05", ["nieves"]],
  ["08-06", ["felicisimo"]],
  ["08-08", ["domingo", "dominga"]],
  ["08-10", ["lorenzo"]],
  ["08-11", ["clara"]],
  ["08-13", ["aurora"]],
  ["08-15", ["asuncion", "paloma"]],
  ["08-18", ["elena"]],
  ["08-20", ["bernardo", "bernardina"]],
  ["08-23", ["rosa"]],
  ["08-25", ["luis", "luisa", "gines", "patricia"]],
  ["08-27", ["monica"]],
  ["08-28", ["agustin", "agustina"]],
  ["09-03", ["gregorio"]],
  ["09-08", ["nuria", "sergio"]],
  ["09-12", ["maria", "mariano"]],
  ["09-17", ["roberto", "belarmina"]],
  ["09-21", ["mateo"]],
  ["09-24", ["mercedes"]],
  ["09-29", ["miguel", "gabriel", "rafael", "gabriela", "rafaela"]],
  ["09-30", ["jeronimo", "sofia"]],
  ["10-04", ["francisco"]],
  ["10-06", ["bruno"]],
  ["10-07", ["rosario"]],
  ["10-12", ["pilar"]],
  ["10-13", ["eduardo"]],
  ["10-15", ["teresa"]],
  ["10-18", ["lucas"]],
  ["10-19", ["laura"]],
  ["10-20", ["irene"]],
  ["10-22", ["salome"]],
  ["11-04", ["carlos", "carla", "carolina"]],
  ["11-11", ["martin", "martina"]],
  ["11-13", ["diego"]],
  ["11-15", ["alberto", "alberta"]],
  ["11-17", ["isabel"]],
  ["11-22", ["cecilia"]],
  ["11-30", ["andres"]],
  ["12-03", ["javier", "javiera"]],
  ["12-04", ["barbara"]],
  ["12-06", ["nicolas"]],
  ["12-07", ["ambrosio"]],
  ["12-08", ["concepcion", "inmaculada"]],
  ["12-11", ["maravillas"]],
  ["12-13", ["lucia"]],
  ["12-17", ["yolanda"]],
  ["12-19", ["eva"]],
  ["12-23", ["victoria"]],
  ["12-24", ["adan"]],
  ["12-26", ["esteban"]],
  ["12-27", ["fabiola", "eugenia"]],
  ["12-29", ["david"]],
  ["12-31", ["silvestre"]],
];

/**
 * El domingo de Pascua, en milisegundos UTC: de él cuelga la mitad del calendario móvil
 * español. Algoritmo gregoriano anónimo, tal cual — se comprueba contra años conocidos en
 * el test, que es la única forma honesta de leerlo.
 */
export function pascua(año: number): number {
  const a = año % 19;
  const b = Math.floor(año / 100);
  const c = año % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const cuenta = h + l - 7 * m + 114;
  return Date.UTC(año, Math.floor(cuenta / 31) - 1, (cuenta % 31) + 1);
}

const diaDelAñoDe = (ms: number) => new Date(ms).toISOString().slice(5, 10);

/** El viernes anterior al Domingo de Ramos, que va nueve días antes que la Pascua. */
export const viernesDeDolores = (año: number): string => diaDelAñoDe(pascua(año) - 9 * MS_DIA);

/** Pentecostés: el día cincuenta contando la Pascua, o siete domingos después de ella. */
export const domingoDePentecostes = (año: number): string => diaDelAñoDe(pascua(año) + 49 * MS_DIA);

/** El día de la madre en España: el primer domingo de mayo, caiga el 1 o caiga el 7. */
export const primerDomingoDeMayo = (año: number): string =>
  `05-${String(1 + ((7 - new Date(Date.UTC(año, 4, 1)).getUTCDay()) % 7)).padStart(2, "0")}`;

/**
 * Las onomásticas que no caen el mismo día cada año porque cuelgan de la Semana Santa.
 * Son las que la familia celebra de verdad: **Lola es del Viernes de Dolores**, no del 15
 * de septiembre en que la liturgia pone a la Virgen de los Dolores, y **el Rocío es del
 * domingo de Pentecostés**, no del lunes de la romería. Cambiar de una a otra es cambiar
 * esta línea. Fuera se quedan las que ni con esto tienen fecha: la Macarena y los
 * Desamparados dependen de la ciudad, no del calendario.
 */
const MOVILES: [DiaDelAño, string[]][] = [
  [viernesDeDolores, ["dolores"]],
  [domingoDePentecostes, ["rocio"]],
];

/**
 * Cómo llama la familia a quien no usa su nombre de pila. Solo los que en España
 * significan una cosa y solo una: adivinar de dónde sale un apodo es ponerle a alguien
 * el santo de otro.
 */
const APODOS: Record<string, string> = {
  pepe: "jose",
  pepa: "josefa",
  paco: "francisco",
  curro: "francisco",
  fran: "francisco",
  paqui: "francisca",
  pacita: "francisca",
  lola: "dolores",
  loli: "dolores",
  concha: "concepcion",
  conchita: "concepcion",
  inma: "concepcion",
  montse: "montserrat",
  javi: "javier",
  richi: "ricardo",
  juani: "juana",
  piluca: "pilar",
  piluquita: "pilar",
  nacho: "ignacio",
  goyo: "gregorio",
  rober: "roberto",
  yoli: "yolanda",
  magda: "magdalena",
  gabi: "gabriel",
  santi: "santiago",
  yago: "santiago",
  dani: "daniel",
  tere: "teresa",
  charo: "rosario",
  merche: "mercedes",
  manolo: "manuel",
  manoli: "manuela",
  toni: "antonio",
  chiara: "clara",
  paola: "paula",
  aina: "ana",
  carmina: "carmen",
};

const SANTORAL: Record<string, DiaDelAño> = Object.fromEntries(
  [...CALENDARIO, ...MOVILES].flatMap(([dia, nombres]) => nombres.map((nombre) => [nombre, dia] as const)),
);

/** Sin tildes, sin mayúsculas y sin dobles espacios: así se busca en las tablas. */
export const normalizar = (nombre: string): string =>
  nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");

/**
 * En un nombre compuesto manda el segundo: María José celebra San José y María Teresa,
 * Santa Teresa. Así que el «María» de delante se cae —también sus variantes de tratamiento
 * y el «de la» que a veces las une—, y solo se queda cuando no hay nada detrás.
 */
const ANTEPUESTOS = new Set(["maria", "mari", "de", "del", "la", "los"]);

/**
 * El día del santo, o nada si ese nombre no tiene ninguno. Se prueba el nombre entero
 * antes que sus partes: «Juan de Dios» es un santo y no es el de Juan.
 */
export function onomasticaDe(nombre: string): DiaDelAño | null {
  const limpio = normalizar(nombre);
  const directo = buscar(limpio);
  if (directo) return directo;

  const partes = limpio.split(" ");
  const primero = partes.findIndex((parte) => !ANTEPUESTOS.has(parte));
  // Todo eran antepuestos: es una María a secas, y entonces sí es la suya.
  const utiles = primero < 0 ? partes.slice(0, 1) : partes.slice(primero);
  return buscar(utiles.join(" ")) ?? buscar(utiles[0]) ?? null;
}

const buscar = (clave: string): DiaDelAño | null =>
  SANTORAL[clave] ?? SANTORAL[APODOS[clave] ?? ""] ?? null;

/**
 * Quien no celebra la onomástica que le tocaría por su nombre. Va por id, y aquí en vez
 * de en el JSON: es una costumbre de una persona, no un dato que dijera su documento. Es
 * lo que permite que en el nodo vaya el nombre por el que se la conoce sin que eso le
 * cambie el día.
 */
const POR_PERSONA: Record<string, DiaDelAño> = {
  p14: "10-15", // en el árbol es Chiara Teresa, en casa es Teresita y celebra Santa Teresa
  p443: "08-02", // Ángela, que celebra con las Ángeles y no el 27 de enero de las Ángelas
  p19: "03-19", // en el árbol es María, se llama María José y celebra San José
  p23: "08-02", // en el árbol es María, se llama María Ángeles y celebra con las Ángeles
  p8: "06-25", // Eva Sola celebra en junio y no el 19 de diciembre de las otras tres
  p445: "12-03", // Fran celebra San Francisco Javier, no el Asís que le da su nombre
  p323: "07-16", // en el árbol es María, se llama María Casas y celebra con las Carmen
};

/** La onomástica de alguien: la suya si la tiene apuntada, y si no la de su nombre. */
export const onomasticaDePersona = (p: { id: string; nombre: string }): DiaDelAño | null =>
  POR_PERSONA[p.id] ?? onomasticaDe(p.nombre);

/** La próxima vez que caiga ese día, contando hoy como 0. Vale para los que se mueven. */
export function proximaVez(hoy: Fecha, diaDelAño: DiaDelAño): { fecha: Fecha; faltan: number } {
  const año = añoDe(hoy);
  const desde = enMs(hoy);
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
export function enElAño(diaDelAño: DiaDelAño, año: number): number {
  const [mes, dia] = (typeof diaDelAño === "function" ? diaDelAño(año) : diaDelAño).split("-").map(Number);
  if (mes === 2 && dia === 29 && !bisiesto(año)) return Date.UTC(año, 2, 1);
  return Date.UTC(año, mes - 1, dia);
}

const bisiesto = (año: number) => (año % 4 === 0 && año % 100 !== 0) || año % 400 === 0;

const escribirUTC = (ms: number) => new Date(ms).toISOString().slice(0, 10);
