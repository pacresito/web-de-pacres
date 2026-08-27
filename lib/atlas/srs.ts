// El motor de Atlas: qué se pregunta, en qué orden y qué le pasa a la memoria al responder.
// Lógica pura, sin React ni DOM: se verifica con `npx tsx lib/atlas/srs.test.ts`.
//
// No es SM-2. Aquí no hay fechas de vencimiento ni tarjetas pendientes, porque Pablo juega
// cuando le apetece —cinco tarjetas o doscientas, hoy o dentro de dos semanas— y una cola con
// deuda visible es lo que mata los mazos: se abre, pone "418 pendientes" y se cierra.
//
// En su lugar cada dato guarda cuánto aguanta en la cabeza (`vida`, en días) y cuándo se vio.
// La cola es un ranking de sospecha, infinito y sin fondo: siempre hay una siguiente.

import { PAISES, PAIS_POR_ID, type Pais } from "./paises";

export const DATOS = ["nombre", "capital", "bandera", "lugar"] as const;
export type Dato = (typeof DATOS)[number];

export type Estado = { visto: number; vida: number }; // ms epoch · días
export type Mazo = Record<string, Partial<Record<Dato, Estado>>>; // paisId -> dato -> estado
// De peor a mejor, que es el orden en que se enseñan y el que valida lo que llega de fuera.
export const NOTAS = ["fallo", "bien", "facil"] as const;
export type Nota = (typeof NOTAS)[number];

const DIA = 86_400_000;

// Un dato está aprendido cuando aguanta más de tres semanas, el umbral clásico de Anki para
// separar lo que se está aprendiendo de lo que ya se sabe.
export const VIDA_APRENDIDO = 21;

// Vidas de arranque, para la primera vez: ahí no hay `transcurrido` del que tirar.
const VIDA_INICIAL: Record<Nota, number> = { fallo: 0.01, bien: 1, facil: 4 };
const FACTOR: Record<Nota, number> = { fallo: 0, bien: 2, facil: 4 };

/**
 * La vida nueva de un dato tras calificarlo.
 *
 * El `max(vida, transcurrido)` es la pieza central: si algo tenía vida de 3 días y se acierta
 * el día 14, la vida nueva se calcula sobre 14, no sobre 3. Volver tarde no es daño, es la
 * prueba de que aguantaba más de lo que el sistema creía.
 */
export function nuevaVida(estado: Estado | undefined, nota: Nota, ahora: number): number {
  if (!estado) return VIDA_INICIAL[nota];
  if (nota === "fallo") return VIDA_INICIAL.fallo;
  const transcurrido = (ahora - estado.visto) / DIA;
  return Math.max(estado.vida, transcurrido) * FACTOR[nota];
}

export function calificar(mazo: Mazo, paisId: string, dato: Dato, nota: Nota, ahora: number): Mazo {
  const previo = mazo[paisId]?.[dato];
  return {
    ...mazo,
    [paisId]: { ...mazo[paisId], [dato]: { visto: ahora, vida: nuevaVida(previo, nota, ahora) } },
  };
}

/**
 * Cuánto se sospecha que un dato se ha olvidado: 1 es "justo ha agotado su vida".
 *
 * Un dato sin ver da −1, el mínimo, así que nunca se tapa: queda a la vista como material de
 * estudio. Preguntar por algo que aún no se ha presentado no enseña, produce un fallo estéril.
 */
export function sospecha(estado: Estado | undefined, ahora: number): number {
  if (!estado) return -1;
  return (ahora - estado.visto) / DIA / estado.vida;
}

const aprendido = (e: Estado | undefined) => !!e && e.vida > VIDA_APRENDIDO;

/**
 * Cómo de agarrado está un dato, para la ficha de explorar. Mira el reloj sin tocarlo: explorar
 * no es repasar, y pasearse por los países no puede alterar cuándo vuelven.
 *
 * Los tres nombres son los que se enseñan: no hay traducción que mantener en dos sitios.
 */
export type Dominio = "sin ver" | "empezado" | "aprendido";
export const dominio = (e: Estado | undefined): Dominio => (!e ? "sin ver" : aprendido(e) ? "aprendido" : "empezado");

/**
 * Lo mismo para un país entero, que es por lo que se filtra en explorar. **Aprendido exige los
 * cuatro datos**; empezado basta con haber visto uno.
 */
export function dominioPais(mazo: Mazo, paisId: string): Dominio {
  if (DATOS.every((d) => aprendido(mazo[paisId]?.[d]))) return "aprendido";
  return DATOS.some((d) => mazo[paisId]?.[d]) ? "empezado" : "sin ver";
}

/**
 * Cuántos huecos lleva la tarjeta de un país. Va con la madurez, no con la sospecha: cuanto
 * menos se sabe un país, más datos se ven. Examinar de algo que aún no está codificado no
 * enseña, solo frustra; y lo visible es el material de estudio.
 *
 * **El tope de tres es lo que deja la pista**: `montar` tapa tantos como diga esto, así que
 * devolver cuatro sería una tarjeta sin nada por lo que preguntar.
 */
export function huecos(mazo: Mazo, paisId: string): number {
  const n = DATOS.filter((d) => aprendido(mazo[paisId]?.[d])).length;
  return n === 4 ? 3 : n >= 2 ? 2 : 1;
}

/**
 * Cuántos países se han visto y cuántos están enteros. Sale de `dominioPais` y no de su propia
 * cuenta: el contador y el filtro de explorar dicen «aprendido» de la misma palabra, y con dos
 * listones separados se contradirían a la vista el día que se moviera uno.
 *
 * Esto **no es el contador de Anki**, que es lo que hay que mirar antes de enseñarlo: aquel
 * cuenta deuda y sube solo mientras no vuelves; este cuenta trabajo hecho y solo sube cuando
 * trabajas. Y el freno de países nuevos limita a qué velocidad puede separarse el segundo
 * número del primero, así que no hay manera de volver y encontrarse un 0/418.
 */
export function cuenta(mazo: Mazo): { vistos: number; aprendidos: number } {
  let vistos = 0, aprendidos = 0;
  for (const p of PAISES) {
    const suyo = dominioPais(mazo, p.id);
    if (suyo === "sin ver") continue;
    vistos++;
    if (suyo === "aprendido") aprendidos++;
  }
  return { vistos, aprendidos };
}

export type Tarjeta = { pais: Pais; tapados: Dato[]; primeraVez: boolean };

/**
 * Monta la tarjeta de un país: se tapan los datos de más sospecha, nunca los cuatro. El que
 * queda visible es el de menos sospecha —la pista es lo que ya se tiene agarrado— y va
 * cambiando solo: al principio el nombre, meses después la bandera.
 *
 * La primera vez no se tapa nada y se califica igual: es el triaje de lo que ya se sabe.
 */
export function montar(mazo: Mazo, pais: Pais, ahora: number): Tarjeta {
  const primeraVez = DATOS.every((d) => !mazo[pais.id]?.[d]);
  if (primeraVez) return { pais, tapados: [], primeraVez };
  const orden = [...DATOS].sort((a, b) => sospecha(mazo[pais.id]?.[b], ahora) - sospecha(mazo[pais.id]?.[a], ahora));
  return { pais, tapados: orden.slice(0, huecos(mazo, pais.id)), primeraVez };
}

/**
 * El país que toca. Manda el dato de más sospecha de toda la cola; si nada ha superado su
 * propia vida, entra uno nuevo en el orden del barrido geográfico. Agotados los 195, se
 * adelanta el más sospechoso aunque no llegue a 1: la cola no se acaba nunca.
 *
 * El freno a los nuevos es invisible y no mira el calendario: mientras haya demasiados países
 * sin aprender peleando arriba, no entran más. Así una tarde de entusiasmo no se convierte en
 * una deuda de cuatrocientas tarjetas dentro de diez días.
 */
export const MAX_EN_EL_AIRE = 30;

export function siguiente(mazo: Mazo, orden: string[], ahora: number): Pais | null {
  let mejor: { id: string; s: number } | null = null;
  let enElAire = 0;
  for (const p of PAISES) {
    const visto = DATOS.some((d) => mazo[p.id]?.[d]);
    if (!visto) continue;
    if (!DATOS.some((d) => aprendido(mazo[p.id]?.[d]))) enElAire++;
    for (const d of DATOS) {
      const s = sospecha(mazo[p.id]?.[d], ahora);
      if (!mejor || s > mejor.s) mejor = { id: p.id, s };
    }
  }
  const nuevo = orden.find((id) => !DATOS.some((d) => mazo[id]?.[d]));
  const cedeAlNuevo = (!mejor || mejor.s < 1) && enElAire < MAX_EN_EL_AIRE;
  const id = cedeAlNuevo && nuevo ? nuevo : mejor?.id ?? nuevo;
  return id ? PAIS_POR_ID.get(id) ?? null : null;
}
