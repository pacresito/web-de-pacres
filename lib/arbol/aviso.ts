// El aviso al móvil de la víspera: qué celebra mañana la gente de mi lista, dicho a las diez
// de la noche del día antes. Puro: `npx tsx lib/arbol/aviso.test.ts`.
//
// Aparte del panel de la web a propósito: comparten el árbol y el santoral y nada más. Aquello
// se lo enseña a quien lo esté mirando y esto me habla a mí, así que ni la gente que entra
// —eso lo dice `lista.ts`— ni las frases pueden ser las mismas.
//
// Todo el día en un mensaje y no uno por celebración: el 19 de marzo caen seis, y seis
// vibraciones seguidas a las diez de la noche no son seis avisos, son una molestia.
//
// La víspera y no el día: un cumpleaños del que uno se entera por la mañana ya llega tarde
// para comprar nada. Y a las diez, que es la hora en que todavía se puede escribir a alguien.

import { añoDe, conDia, MS_DIA, seLeSuponeFallecido, type Fecha } from "./fechas";
import { type Grafo } from "./grafo";
import { laLista, PAREJA, YO } from "./lista";
import { pluralDeNombre } from "./plural";
import { onomasticaDe, onomasticaDePersona, primerDomingoDeMayo, proximaVez, type DiaDelAño } from "./santoral";

/** La hora a la que sale, en Madrid. */
export const HORA = 22;

/** Un mensaje ya redactado y el instante en que debe salir, como los del observatorio. */
export type Aviso = { sale: number; id: string; texto: string };

/**
 * Lo que hay que programar esta noche, o nada si mañana no celebra nadie. El `id` es el día
 * que se anuncia: quien lo publique dos veces no avisa dos veces.
 */
export function avisoDeVispera(g: Grafo, hoy: Fecha): Aviso | null {
  const mañana = escribirUTC(Date.parse(hoy) + MS_DIA);
  const lineas = [...deLaGente(g, hoy, mañana), ...deLosDosDias(g, hoy)].sort(
    (a, b) => a.grupo - b.grupo || a.nombre.localeCompare(b.nombre, "es"),
  );
  if (lineas.length === 0) return null;

  // «Mañana» y nada más: la fecha de un mensaje que llega la víspera y solo habla de la
  // víspera no añade nada, y el enlace al árbol tampoco —quien quiera mirarlo lo tiene.
  return {
    sale: aLasDiez(hoy),
    id: `arbol-${mañana}`,
    texto: ["<b>Mañana</b>", "", ...lineas.map((l) => l.texto)].join("\n"),
  };
}

/**
 * Una línea por celebración. `grupo` las agrupa por tipo —el cumpleaños delante, que es el
 * único que trae tarta— y `nombre` las ordena dentro; lo mío va sin nombre y sale primero,
 * que para eso es mío.
 */
type Linea = { grupo: number; nombre: string; texto: string };

/** Lo que celebra mañana la gente de la lista. Los muertos no celebran nada. */
function* deLaGente(g: Grafo, hoy: Fecha, mañana: Fecha): Generator<Linea> {
  for (const [id, { como: comoLoLlamo, santo }] of laLista(g)) {
    const persona = g.personaPorId.get(id)!;
    if (persona.death || seLeSuponeFallecido(persona, hoy)) continue;

    const cae = (dia: DiaDelAño) => proximaVez(hoy, dia).faltan === 1;
    const mio = id === YO.id;
    const quien = `<b>${escapar(persona.nombre)}</b>${comoLoLlamo ? `, ${escapar(comoLoLlamo)}` : ""}`;
    const suerte = (cuantos: number) => pizca(`${id}:${mañana}`, cuantos);

    if (persona.birth && conDia(persona.birth) && cae(persona.birth.slice(5))) {
      // La edad se cuenta sobre mañana y no sobre hoy: el que cumple mañana cumple los de
      // mañana, aunque hoy todavía tenga uno menos.
      const edad = añoDe(mañana) - añoDe(persona.birth);
      // A los de Carmen se les puede decir algo que a los míos no: que son de los suyos.
      const suyos = comoLoLlamo?.endsWith(`de ${PAREJA.nombre}`) ?? false;
      const cuales = suyos ? [...CUMPLES, ...CUMPLES_DE_ELLA] : CUMPLES;
      const texto = mio
        ? `${TARTAS[suerte(TARTAS.length)]} ${MIO_CUMPLE[edad % MIO_CUMPLE.length](edad)}`
        : `${TARTAS[suerte(TARTAS.length)]} ${cuales[suerte(cuales.length)](quien, edad)}`;
      yield { grupo: 0, nombre: mio ? "" : persona.nombre, texto };
    }

    const suSanto = santo ? onomasticaDePersona(persona) : null;
    if (suSanto && cae(suSanto)) {
      // La cola que nombra a todos los que se llaman igual solo vale si el día es el de su
      // nombre: hay quien celebra el de otro —una María que celebra San José— y a ese
      // «el día de las Marías» le estaría diciendo el día que no es.
      const suNombre = persona.nombre.split(" ")[0];
      const colas = onomasticaDe(suNombre) === suSanto ? SANTOS : SANTOS.slice(0, -1);
      const texto = mio
        ? `${FIESTAS[suerte(FIESTAS.length)]} ${MIO_SANTO[añoDe(mañana) % MIO_SANTO.length]}`
        : `${FIESTAS[suerte(FIESTAS.length)]} ${quien} — ${colas[suerte(colas.length)](suNombre, persona.sexo === "m")}`;
      yield { grupo: 2, nombre: mio ? "" : persona.nombre, texto };
    }
  }
}

/**
 * Con qué cara y con qué palabras sale cada línea. **Se elige por la persona y por el día**,
 * no al azar: así el mensaje sale igual las dos veces que se programe la misma noche —el
 * programador puede repetir— y a la vez ni dos líneas del mismo aviso ni dos años seguidos de
 * la misma persona se leen iguales. Un mensaje que llega con la misma cara y las mismas cuatro
 * palabras cien noches al año deja de leerse a la tercera.
 */
export const TARTAS = ["🎂", "🍰", "🧁", "🥳", "🎈", "🎁", "🎀"];
export const FIESTAS = ["🎉", "🎊", "✨", "🥂", "🌟", "🔔"];

/**
 * Las frases del cumpleaños ajeno. **Todas dicen quién y cuántos** —es el dato, y no se pierde
 * en la broma— y lo que cambia es lo de después, que es lo que hace que el mensaje se lea. El
 * empujón va siempre hacia escribir o llamar, que es para lo que sirve enterarse la víspera.
 */
type Frase = (quien: string, edad: number) => string;

const CUMPLES: Frase[] = [
  (q, e) => `Mañana cumple ${e} ${q}. Hoy todavía llegas a comprar algo; mañana ya es cariño improvisado.`,
  (q, e) => `${q}, cumple ${e} mañana. Un mensaje a las 00:01 y quedas de rey todo el año.`,
  (q, e) => `Mañana sopla ${e} velas ${q}. Tú pon el mensaje, que la tarta la ponen otros.`,
  (q, e) => `${q}, cumple ${e} mañana. Si no sabes qué decir, «felicidades» lleva siglos funcionando.`,
  (q, e) => `Mañana cumple ${e} ${q}. El árbol se ha acordado; ahora te toca a ti.`,
  (q, e) => `${q}, cumple ${e} mañana. Que se entere por ti y no por una notificación.`,
  (q, e) => `Mañana estrena ${e} ${q}. Buen día para una llamada de las de antes.`,
  (q, e) => `${q}, llega a ${e} mañana. Un audio de treinta segundos gana a cualquier regalo caro.`,
  (q, e) => `Mañana cumple ${e} ${q}. Tienes toda la noche para pensar la frase.`,
  (q, e) => `${q}, cumple ${e} mañana. Nadie se ha quejado nunca de que le felicitaran de más.`,
  (q, e) => `Mañana son ${e} para ${q}. Escríbele pronto, antes de que se le llene el móvil.`,
  (q, e) => `${q}, cumple ${e} mañana. Ya sabes lo que toca.`,
];

/** Y las que solo valen para los suyos: ahí hay alguien más a quien avisar. */
const CUMPLES_DE_ELLA: Frase[] = [
  (q, e) => `Mañana cumple ${e} ${q}. Te pilla lejos, pero avísala a ella y quedas bien los dos.`,
  (q, e) => `${q}, cumple ${e} mañana. Si dudas, pregunta en casa antes de escribir.`,
];

/**
 * Las colas de la línea del santo. **La que los nombra a todos va la última** porque es la
 * única que no siempre se puede decir, y así quitarla es quedarse con las de delante.
 */
const SANTOS: ((nombre: string, mujer: boolean) => string)[] = [
  () => "su onomástica",
  () => "onomástica",
  () => "el día de su nombre",
  (nombre, mujer) => `el día de ${mujer ? "las" : "los"} ${pluralDeNombre(nombre)}`,
];

/** Y lo mío, que va en segunda persona y rota con la edad, no con la suerte. */
const MIO_CUMPLE: ((edad: number) => string)[] = [
  (edad) => `Mañana cumples ${edad}: hoy es el último día que puedes decir que tienes ${edad - 1}.`,
  (edad) => `Mañana cumples ${edad}. Ve ensayando la cara de sorpresa.`,
  (edad) => `${edad} mañana. Hoy todavía puedes hacerte el joven.`,
  (edad) => `Mañana son ${edad}. Toda esa gente del árbol y mañana la pantalla va de ti.`,
];

const MIO_SANTO = [
  "Mañana es el día de tu nombre, que es un cumpleaños de los que no suman.",
  "Mañana es tu santo: medio cumpleaños, sin la parte de envejecer.",
  "Mañana te toca santo. Se felicita igual y no cuesta vela.",
];

/**
 * Un número estable a partir de un texto, para repartir caras y frases. No hace falta que
 * disperse bien: hace falta que el mismo texto dé siempre el mismo número, y que dos textos
 * parecidos no den el mismo.
 */
function pizca(semilla: string, cuantos: number): number {
  let n = 0;
  for (const letra of semilla) n = (n * 31 + letra.codePointAt(0)!) % 1_000_003;
  return n % cuantos;
}

/**
 * Los dos días que no son de nadie, que aquí sí van dirigidos: el del padre va por mí, y el de
 * la madre por las dos que me tocan —la madre de mis hijos y la mía, mientras viva—. El panel
 * de la web tiene que adivinar a quién apuntan mirando quién tiene hijos; un mensaje que sale
 * a un solo teléfono no adivina nada.
 */
function* deLosDosDias(g: Grafo, hoy: Fecha): Generator<Linea> {
  const cae = (dia: DiaDelAño) => proximaVez(hoy, dia).faltan === 1;
  if (cae("03-19")) {
    yield { grupo: 1, nombre: "", texto: "🎉 Mañana es el día del padre, y va por ti. Ve dejando pistas." };
  }
  if (cae(primerDomingoDeMayo)) {
    const suyo = `🎉 Mañana es el día de la madre. Va por ${PAREJA.nombre}`;
    yield { grupo: 1, nombre: "", texto: viveMiMadre(g, hoy) ? `${suyo}, y tu madre espera su llamada.` : `${suyo}.` };
  }
}

const viveMiMadre = (g: Grafo, hoy: Fecha): boolean => {
  const suUnion = g.unionPorId.get(g.unionDeHijo.get(YO.id) ?? "");
  const madre = (suUnion?.partners ?? []).map((id) => g.personaPorId.get(id)!).find((p) => p.sexo === "m");
  return !!madre && !madre.death && !seLeSuponeFallecido(madre, hoy);
};

/** El mensaje va en HTML y los nombres salen de los documentos de la familia, no de mí. */
const escapar = (texto: string): string => texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const escribirUTC = (ms: number): Fecha => new Date(ms).toISOString().slice(0, 10);

const TZ = "Europe/Madrid";
const FMT = new Intl.DateTimeFormat("sv-SE", { timeZone: TZ, dateStyle: "short", timeStyle: "medium" });

/**
 * El instante en que en Madrid son las diez de la noche de ese día. Se mide el desfase dos
 * veces —una sobre la hora leída como si fuera UTC y otra sobre el candidato que sale de
 * ella— porque el desfase depende del instante que se está buscando: con una sola pasada,
 * las noches de los dos cambios de hora salen corridas sesenta minutos.
 */
export function aLasDiez(dia: Fecha): number {
  const comoSiFueraUTC = Date.parse(`${dia}T${HORA}:00:00Z`);
  return comoSiFueraUTC - desfase(comoSiFueraUTC - desfase(comoSiFueraUTC));
}

const desfase = (ms: number): number => Date.parse(`${FMT.format(new Date(ms)).replace(" ", "T")}Z`) - ms;
