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

// `aciertos` es la racha sin fallar, y un mazo guardado antes de que existiera lo trae sin
// definir: cuenta como cero y se rehace solo. Lo absorbe `racha`, que es quien lo lee.
export type Estado = { visto: number; vida: number; aciertos: number }; // ms epoch · días · racha
export type Mazo = Record<string, Partial<Record<Dato, Estado>>>; // paisId -> dato -> estado
// De peor a mejor, que es el orden en que se enseñan y el que valida lo que llega de fuera.
export const NOTAS = ["fallo", "bien", "facil"] as const;
export type Nota = (typeof NOTAS)[number];

const DIA = 86_400_000;

// Un dato está **aprendido** cuando se ha acertado cinco veces seguidas. Con esta cola, que
// reparte como un round-robin, cinco aciertos son cinco vueltas enteras al mazo: se gana
// trabajando y no esperando, que es lo que hace que se pueda ganar en una tarde.
//
// Y es el tope del contador: por encima del listón nadie lee ese número, así que no se guarda.
export const ACIERTOS_APRENDIDO = 5;

// **Dominado** es aprendido y, además, aguantando más de tres semanas —el umbral clásico de Anki
// para separar lo que se está aprendiendo de lo que ya se sabe—. Los dos listones dicen cosas
// distintas a propósito: aprendido lo firma el trabajo hecho, dominado lo firma el calendario, y
// el calendario no se puede hacer más deprisa.
export const VIDA_DOMINADO = 21;

// Vidas de arranque, para la primera vez: ahí no hay `transcurrido` del que tirar.
const VIDA_INICIAL: Record<Nota, number> = { fallo: 0.01, bien: 1, facil: 4 };
// Por cuánto multiplica la nota la resistencia demostrada, cuando se demuestra entera. Fallar no
// tiene factor: se atiende antes y no llega a usarse.
const FACTOR: Record<Exclude<Nota, "fallo">, number> = { bien: 2, facil: 4 };
// Lo que cada nota le suma al contador, y lo que le resta un fallo. Fallar **no lo pone a cero**:
// la vida sí se desploma, porque era una predicción y quedó refutada, pero el contador es trabajo
// hecho y haberlo acertado cuatro veces sigue siendo cierto. Dos aciertos lo devuelven a su sitio.
const SUMA: Record<Exclude<Nota, "fallo">, number> = { bien: 1, facil: 2 };
const CASTIGO = 2;

const racha = (e: Estado | undefined) => e?.aciertos ?? 0;

/** La racha nueva tras calificar: satura en el listón y no baja de cero. */
export function nuevosAciertos(estado: Estado | undefined, nota: Nota): number {
  if (nota === "fallo") return Math.max(0, racha(estado) - CASTIGO);
  return Math.min(racha(estado) + SUMA[nota], ACIERTOS_APRENDIDO);
}

/** Cuántos aciertos hacen falta para aguantar `vida` días, subiendo la escalera 1, 2, 4, 8… Es
 *  con lo que `sembrar` rellena el contador: un mazo inventado tiene vidas pero no historia. */
export const aciertosDe = (vida: number) =>
  Math.max(0, Math.min(ACIERTOS_APRENDIDO, Math.round(Math.log2(vida)) + 1));

/**
 * La vida nueva de un dato tras calificarlo. **Solo el tiempo transcurrido suma.**
 *
 * Si algo tenía vida de 3 días y se acierta el día 14, la vida nueva se calcula sobre 14 y no
 * sobre 3: volver tarde no es daño, es la prueba de que aguantaba más de lo que el sistema creía.
 * Y al revés, un acierto sin tiempo por medio no prueba nada, así que no multiplica: suma los
 * días que hayan pasado, que son ninguno. Multiplicar por la vida que ya se tenía convierte esto
 * en `2^(número de aciertos)` —siete seguidos en tres minutos valdrían cuatro meses de acordarse—
 * y la vida deja de medir nada.
 *
 * Llegar justo a tiempo (transcurrido = vida) da exactamente el factor de la nota: 2 o 4.
 */
export function nuevaVida(estado: Estado | undefined, nota: Nota, ahora: number): number {
  if (!estado) return VIDA_INICIAL[nota];
  if (nota === "fallo") return VIDA_INICIAL.fallo;
  const transcurrido = (ahora - estado.visto) / DIA;
  return Math.max(estado.vida, transcurrido) + (FACTOR[nota] - 1) * transcurrido;
}

export function calificar(mazo: Mazo, paisId: string, dato: Dato, nota: Nota, ahora: number): Mazo {
  const previo = mazo[paisId]?.[dato];
  return {
    ...mazo,
    [paisId]: {
      ...mazo[paisId],
      [dato]: { visto: ahora, vida: nuevaVida(previo, nota, ahora), aciertos: nuevosAciertos(previo, nota) },
    },
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

const aprendido = (e: Estado | undefined) => racha(e) >= ACIERTOS_APRENDIDO;
const dominado = (e: Estado | undefined) => aprendido(e) && (e?.vida ?? 0) > VIDA_DOMINADO;

/**
 * Cómo de agarrado está un dato, para la ficha de explorar. Mira el reloj sin tocarlo: explorar
 * no es repasar, y pasearse por los países no puede alterar cuándo vuelven.
 *
 * Los tres nombres son los que se enseñan: no hay traducción que mantener en dos sitios.
 */
export type Dominio = "sin ver" | "empezado" | "aprendido" | "dominado";
export const dominio = (e: Estado | undefined): Dominio =>
  !e ? "sin ver" : dominado(e) ? "dominado" : aprendido(e) ? "aprendido" : "empezado";

/**
 * Lo mismo para un país entero, que es por lo que se filtra en explorar. **Aprendido exige los
 * cuatro datos**; empezado basta con haber visto uno.
 *
 * Aquí no hay «dominado»: ese cuarto estado es de dato y solo lo pinta su marca. Como país sería
 * un cajón más en el recorrido de explorar, y uno que se llena vaciando el de «aprendidos» —los
 * países desaparecerían de la lista que se acaban de ganar.
 */
export function dominioPais(mazo: Mazo, paisId: string): Exclude<Dominio, "dominado"> {
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
 * El freno a los nuevos es invisible: mientras haya demasiados países crudos peleando arriba, no
 * entran más. **Lo que dosifica es lo que hay que aprender, y solo eso** — lo que se marca «fácil»
 * sale del recuento en el acto y pasa de largo. Con veinte, un país acertado a diario tarda cuatro
 * días en asentarse, así que entran veinte datos nuevos al día: el mismo ritmo que Anki trae por
 * defecto. Las cifras, en `srs.medir.ts`.
 */
export const MAX_EN_EL_AIRE = 20;

/**
 * Cuándo deja un dato de estar crudo: cuando aguanta al menos lo que un «ya me lo sé» de entrada.
 * Es lo único que el freno mira, y va con la vida y no con el contador, porque el contador se
 * llena dando vueltas y dando vueltas se llena en una tarde.
 *
 * **Un «fácil» de primera vez nace justo en el listón, así que asienta el país en el acto y el
 * freno no lo cuenta.** Es deliberado y no un descuido: decir «esto ya me lo sé» es el triaje, y
 * el freno está para dosificar lo que hay que aprender, no lo que ya se sabe. Quien lo diga de
 * más lo paga solo —al fallarlo, la vida se desploma y el país vuelve a estar crudo—. Subirlo un
 * día cerraría esa puerta, a cambio de que marcar «fácil» no sirviera para nada: `srs.medir.ts`
 * mide las dos.
 */
const VIDA_ASENTADO = VIDA_INICIAL.facil;
const asentado = (e: Estado | undefined) => !!e && e.vida >= VIDA_ASENTADO;

/**
 * Cuánto descansa un dato antes de poder volver a salir. **Es tiempo real y no sospecha**, que es
 * lo único que no se puede acelerar contestando rápido: la sospecha es un cociente, así que
 * dentro de una sesión —donde todo lo demás acaba de verse y compite con milésimas— el dato de
 * menos vida gana el ranking una y otra vez y se queda con la sesión entera.
 *
 * Tres minutos es lo más largo que aún deja volver a ver lo fallado dentro de la sesión: con
 * cinco ya no vuelve, y sin descanso se la come —sale dieciséis veces de veinticinco tarjetas, y
 * los países distintos de esas tarjetas caen de 24 a 10—. Las cifras salen de `srs.medir.ts`.
 */
export const DESCANSO = 3 * 60_000;

export function siguiente(mazo: Mazo, orden: string[], ahora: number): Pais | null {
  let mejor: { id: string; s: number } | null = null;
  // El mejor sin mirar el descanso, para cuando descansa el mazo entero. Sin él, ahí el descanso
  // colaría un país nuevo saltándose el freno, que es justo lo que el freno existe para impedir.
  let respaldo: { id: string; s: number } | null = null;
  let enElAire = 0;
  for (const p of PAISES) {
    const visto = DATOS.some((d) => mazo[p.id]?.[d]);
    if (!visto) continue;
    if (!DATOS.some((d) => asentado(mazo[p.id]?.[d]))) enElAire++;
    for (const d of DATOS) {
      const estado = mazo[p.id]?.[d];
      const s = sospecha(estado, ahora);
      if (!respaldo || s > respaldo.s) respaldo = { id: p.id, s };
      if (estado && ahora - estado.visto < DESCANSO) continue;
      if (!mejor || s > mejor.s) mejor = { id: p.id, s };
    }
  }
  const elegido = mejor ?? respaldo;
  const nuevo = orden.find((id) => !DATOS.some((d) => mazo[id]?.[d]));
  const cedeAlNuevo = (!elegido || elegido.s < 1) && enElAire < MAX_EN_EL_AIRE;
  const id = cedeAlNuevo && nuevo ? nuevo : elegido?.id ?? nuevo;
  return id ? PAIS_POR_ID.get(id) ?? null : null;
}
