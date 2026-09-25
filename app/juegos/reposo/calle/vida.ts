// La vida de la escena: lo que se mueve mientras la miras —los sucesos— y no es un nivel: pasa
// y se va, y el diff no lo ve.
//
// **Es una función del tiempo:** dos pantallas a la misma hora ven el mismo perro, y el test
// recorre un día sin pintar nada.
//
// **Como mucho un suceso a la vez, con calma a los lados.** El tiempo va en tramos agrupados en
// rondas, y en cada ronda cada familia —gato, perro, pájaros, cielo, calle— tiene un solo
// turno. La siesta del gato ocupa el turno del gato de su ronda entera.
import { azar } from "./paleta";

type Familia = "gato" | "perro" | "pajaros" | "cielo" | "calle";

interface Tipo {
  familia: Familia;
  /** Segundos. Cabe en su tramo con la calma de los dos lados. */
  dur: number;
  /** Cuánto sale respecto a los demás de su familia. */
  peso: number;
  /** Las variantes que salen de un número y no de una lista —dónde asoma el gato— son muchas. */
  variantes: number;
  cuando: (hora: number) => boolean;
}

const siempre = () => true;
const deDia = (h: number) => h >= 7.5 && h < 20.5;
const deNoche = (h: number) => h < 6.5 || h >= 21;

/** Lo que pasa de vez en cuando. */
export const SUCESOS = {
  "gato-abajo":       { familia: "gato", dur: 22, peso: 3, variantes: 1000, cuando: siempre },
  "gato-repisa":      { familia: "gato", dur: 70, peso: 4, variantes: 2, cuando: siempre },
  "gato-borde":       { familia: "gato", dur: 20, peso: 2, variantes: 1, cuando: siempre },
  "gato-cola":        { familia: "gato", dur: 34, peso: 2, variantes: 1000, cuando: siempre },
  "perro-acera":      { familia: "perro", dur: 48, peso: 4, variantes: 2, cuando: siempre },
  "perro-contenedor": { familia: "perro", dur: 26, peso: 2, variantes: 2, cuando: siempre },
  "perro-sentado":    { familia: "perro", dur: 60, peso: 2, variantes: 2, cuando: siempre },
  pajaro:             { familia: "pajaros", dur: 40, peso: 3, variantes: 2, cuando: deDia },
  bandada:            { familia: "pajaros", dur: 16, peso: 2, variantes: 2, cuando: deDia },
  avion:              { familia: "cielo", dur: 52, peso: 2, variantes: 2, cuando: siempre },
  fugaz:              { familia: "cielo", dur: 2, peso: 2, variantes: 3, cuando: deNoche },
  hoja:               { familia: "calle", dur: 16, peso: 2, variantes: 3, cuando: deDia },
  tele:               { familia: "calle", dur: 70, peso: 1, variantes: 12, cuando: deNoche },
} satisfies Record<string, Tipo>;
export type IdSuceso = keyof typeof SUCESOS | "siesta";

/** Cuánto pesa no hacer nada en el turno de una familia: la tele es de vez en cuando. */
const NADA: Partial<Record<Familia, number>> = { calle: 1.5 };

export interface Suceso {
  id: IdSuceso;
  variante: number;
  /** Segundos, en el mismo reloj que `t`. */
  inicio: number;
  dur: number;
}

/** Un tramo: en cada uno pasa una cosa o ninguna. */
export const TRAMO = 100;
/** Calma a cada lado de un suceso: entre dos, al menos el doble. */
export const CALMA = 15;
/** Tramos por ronda: un turno por familia y dos vacíos. */
const RONDA = 7;
const TURNOS: (Familia | null)[] = ["gato", "perro", "pajaros", "cielo", "calle", null, null];
const PROB_SIESTA = 0.15;
const DUR_SIESTA = 600;

const semilla = (k: number, sal: number) => azar(((k % 1e9) * 131 + sal) | 0);

/** Los turnos de una ronda, barajados. Si la familia que cierra la anterior abre esta, se
 *  cambian los dos primeros; nunca el último, así ninguna ronda arrastra a las de antes. */
function barajar(r: number): (Familia | null)[] {
  const t = [...TURNOS];
  for (let i = t.length - 1; i > 0; i--) {
    const j = Math.floor(semilla(r, 30 + i) * (i + 1));
    [t[i], t[j]] = [t[j], t[i]];
  }
  return t;
}
function turnos(r: number): (Familia | null)[] {
  const t = barajar(r);
  const antes = barajar(r - 1)[RONDA - 1];
  if (antes && t[0] === antes) [t[0], t[1]] = [t[1], t[0]];
  return t;
}

function siestaDeRonda(r: number): Suceso | null {
  if (semilla(r, 7) >= PROB_SIESTA) return null;
  return { id: "siesta", variante: 0, inicio: r * RONDA * TRAMO + 4 * CALMA, dur: DUR_SIESTA };
}

/** Lo que pasa en el tramo `k`, si pasa algo, con la hora del principio del tramo: que no se
 *  corte a medias porque anochezca. */
export function sucesoDelTramo(k: number, horaEn: (t: number) => number): Suceso | null {
  const r = Math.floor(k / RONDA);
  const familia = turnos(r)[k - r * RONDA];

  if (!familia) return null;
  // El gato tampoco se asoma justo antes ni justo después de la siesta.
  const pos = k - r * RONDA;
  if (familia === "gato"
    && (siestaDeRonda(r) || (pos === 0 && siestaDeRonda(r - 1)) || (pos === RONDA - 1 && siestaDeRonda(r + 1)))) return null;
  const hora = horaEn(k * TRAMO);
  const candidatos = (Object.entries(SUCESOS) as [keyof typeof SUCESOS, Tipo][])
    .filter(([, s]) => s.familia === familia && s.cuando(hora));
  if (!candidatos.length) return null;
  let x = semilla(k, 2) * (candidatos.reduce((a, [, s]) => a + s.peso, 0) + (NADA[familia] ?? 0));
  const elegido = candidatos.find(([, s]) => (x -= s.peso) < 0);
  if (!elegido) return null;
  const [id, s] = elegido;
  return {
    id, dur: s.dur,
    variante: Math.floor(semilla(k, 3) * s.variantes),
    inicio: k * TRAMO + CALMA + Math.floor(semilla(k, 4) * Math.max(0, TRAMO - 2 * CALMA - s.dur)),
  };
}

export const familiaDe = (id: IdSuceso): Familia => id === "siesta" ? "gato" : SUCESOS[id].familia;

/** Lo que está pasando en `t`: la siesta si toca, y como mucho un suceso más. */
export function agenda(t: number, horaEn: (t: number) => number): Suceso[] {
  const dentro = (s: Suceso | null): s is Suceso => !!s && t >= s.inicio && t < s.inicio + s.dur;
  // La siesta empieza en su ronda y acaba en la siguiente.
  const r = Math.floor(t / TRAMO / RONDA);
  return [siestaDeRonda(r), siestaDeRonda(r - 1), sucesoDelTramo(Math.floor(t / TRAMO), horaEn)].filter(dentro);
}

// ── El viento y la farola ────────────────────────────────────────────────────

/** El viento de ahora, de 0 a 1: brisa lenta y alguna ráfaga. Lo comparten ropa, árbol y humo. */
export function viento(t: number): number {
  const brisa = 0.32 + 0.16 * Math.sin((2 * Math.PI * t) / 173) + 0.1 * Math.sin((2 * Math.PI * t) / 61 + 1.3);
  const k = Math.floor(t / 50);
  let rafaga = 0;
  if (semilla(k, 11) < 0.45) {
    const ini = k * 50 + 5 + semilla(k, 12) * 35, dur = 5 + semilla(k, 13) * 4;
    if (t >= ini && t < ini + dur) rafaga = Math.sin((Math.PI * (t - ini)) / dur) ** 2 * (0.4 + 0.3 * semilla(k, 14));
  }
  return Math.min(1, Math.max(0, brisa + rafaga));
}

/** Cuánto luce la farola (0 apagada, 1 entera): fija, salvo algún parpadeo cada pocos minutos. */
export function farolaLuz(t: number): number {
  const k = Math.floor(t / 210);
  if (semilla(k, 21) >= 0.6) return 1;
  const ini = k * 210 + 10 + semilla(k, 22) * 180, dur = 1.6 + semilla(k, 23) * 2;
  if (t < ini || t >= ini + dur) return 1;
  const tic = Math.floor(t * 9);
  return semilla(tic, 24) < 0.45 ? 0 : semilla(tic, 25) < 0.5 ? 0.55 : 1;
}
