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

import { añoDe, conDia, diaDeLaSemana, escribirDiaDeMes, MS_DIA, seLeSuponeFallecido, type Fecha } from "./fechas";
import { type Grafo } from "./grafo";
import { laLista, PAREJA, YO } from "./lista";
import { onomasticaDePersona, primerDomingoDeMayo, proximaVez, type DiaDelAño } from "./santoral";

/** La hora a la que sale, en Madrid. */
export const HORA = 22;

const SITIO = "https://pacr.es/arbol";

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

  const cabecera = `<b>Mañana, ${diaDeLaSemana(mañana)} ${escribirDiaDeMes(mañana)}</b>`;
  return {
    sale: aLasDiez(hoy),
    id: `arbol-${mañana}`,
    texto: [cabecera, "", ...lineas.map((l) => l.texto), "", SITIO].join("\n"),
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
  for (const [id, comoLoLlamo] of laLista(g)) {
    const persona = g.personaPorId.get(id)!;
    if (persona.death || seLeSuponeFallecido(persona, hoy)) continue;

    const cae = (dia: DiaDelAño) => proximaVez(hoy, dia).faltan === 1;
    const mio = id === YO.id;
    const quien = `<b>${escapar(persona.nombre)}</b>${comoLoLlamo ? `, ${escapar(comoLoLlamo)}` : ""}`;

    if (persona.birth && conDia(persona.birth) && cae(persona.birth.slice(5))) {
      // La edad se cuenta sobre mañana y no sobre hoy: el que cumple mañana cumple los de
      // mañana, aunque hoy todavía tenga uno menos.
      const edad = añoDe(mañana) - añoDe(persona.birth);
      const texto = mio
        ? `🎂 Mañana cumples ${edad}: hoy es el último día que puedes decir que tienes ${edad - 1}.`
        : `🎂 ${quien} — cumple ${edad}`;
      yield { grupo: 0, nombre: mio ? "" : persona.nombre, texto };
    }

    const suSanto = onomasticaDePersona(persona);
    if (suSanto && cae(suSanto)) {
      const texto = mio
        ? "🎉 Mañana es el día de tu nombre, que es un cumpleaños de los que no suman."
        : `🎉 ${quien} — onomástica`;
      yield { grupo: 2, nombre: mio ? "" : persona.nombre, texto };
    }
  }
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
