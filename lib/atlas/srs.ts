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
//
// `fallado` es la última respuesta, y está aquí porque **no se puede deducir de las otras dos**:
// acertar lo que se acaba de fallar deja la vida igual de corta —solo suma el tiempo transcurrido,
// que son segundos— y el contador puede estar a cero por los dos caminos. Lo lee el descanso, que
// dura lo que dure la respuesta. Un mazo guardado antes de que existiera lo trae sin definir y
// cuenta como acierto, que es el lado que espera de más.
export type Estado = { visto: number; vida: number; aciertos: number; fallado?: boolean }; // ms epoch · días · racha
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
const VIDA_DOMINADO = 21;

// Vidas de arranque, para la primera vez: ahí no hay `transcurrido` del que tirar.
//
// **El «no» de un estreno vale un cuarto de hora, y es a propósito el más largo de los dos.**
// Estrenar un país produce fallos por definición, y como nada se estrena mientras algo haya pasado
// su vida, un plazo corto haría que el primer país abierto cerrase la puerta a los demás: la ronda
// se parte por la octava tarjeta y los que faltan llegan diez minutos después. Con este, los diez
// del tope caben seguidos, que es como se estrena — de golpe y mirándolos juntos.
const VIDA_INICIAL: Record<Nota, number> = { fallo: 0.01, bien: 1, facil: 4 };
// Y el «no» de algo ya conocido vale minuto y medio: siete u ocho tarjetas, que es volver a verlo
// dentro de la sesión sin que salga en la de al lado. Olvidar lo que ya sabías es lo que hay que
// reaprender hoy; no saber un país que acabas de conocer, no.
//
// **Cero no vale**: la sospecha divide por la vida, así que sería infinita, o `NaN` en el instante
// de calificar, y el ranking dejaría de ordenar nada.
const VIDA_OLVIDO = 0.001;
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
  if (nota === "fallo") return VIDA_OLVIDO;
  const transcurrido = (ahora - estado.visto) / DIA;
  return Math.max(estado.vida, transcurrido) + (FACTOR[nota] - 1) * transcurrido;
}

export function calificar(mazo: Mazo, paisId: string, dato: Dato, nota: Nota, ahora: number): Mazo {
  const previo = mazo[paisId]?.[dato];
  return {
    ...mazo,
    [paisId]: {
      ...mazo[paisId],
      [dato]: { visto: ahora, vida: nuevaVida(previo, nota, ahora),
                aciertos: nuevosAciertos(previo, nota), fallado: nota === "fallo" },
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

// **Cualquiera de los dos relojes lo firma**, y por eso van con un `o`: son dos maneras de haber
// llegado, no dos mitades de lo mismo. El contador es trabajo hecho y se gana en una tarde; la
// vida es calendario y no se acelera, así que aguantar tres semanas ya prueba lo que las cinco
// vueltas querían probar — y al revés, cinco aciertos valen aunque el calendario no haya corrido.
const aprendido = (e: Estado | undefined) => racha(e) >= ACIERTOS_APRENDIDO || (e?.vida ?? 0) > VIDA_DOMINADO;
// Dominado lo firma solo el calendario. No hace falta exigirle además la racha: no la pide para
// llegar, y la marca se sigue llenando en vez de cambiar de idea porque esto implica lo de arriba.
const dominado = (e: Estado | undefined) => (e?.vida ?? 0) > VIDA_DOMINADO;

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
  // **Los que descansan van detrás, no fuera.** El descanso decide qué país sale, pero si aquí no
  // se mirara, un país que vuelve por un dato vencido se llevaría por delante el que acabas de
  // acertar —y es el primero de la lista, porque acertar lo recién fallado deja la vida corta y
  // la sospecha alta—. Detrás y no fuera porque el país ya está elegido: si todos descansan hay
  // que preguntar por alguno igual, y una tarjeta sin nada tapado no es una tarjeta.
  //
  // El dato sin ver cae con ellos, que es donde estaba: preguntar por lo que no se ha presentado
  // no enseña, y su sospecha de −1 lo deja el último de todos.
  const preguntable = (d: Dato) => { const e = mazo[pais.id]?.[d]; return !!e && !descansando(e, ahora); };
  const orden = [...DATOS].sort((a, b) =>
    Number(preguntable(b)) - Number(preguntable(a)) || sospecha(mazo[pais.id]?.[b], ahora) - sospecha(mazo[pais.id]?.[a], ahora));
  return { pais, tapados: orden.slice(0, huecos(mazo, pais.id)), primeraVez };
}

/**
 * El país que toca. Manda el dato de más sospecha de toda la cola; si nada ha superado su
 * propia vida, entra uno nuevo en el orden del barrido geográfico. Agotados los 195, se
 * adelanta el más sospechoso aunque no llegue a 1: la cola no se acaba nunca.
 *
 * El freno a los nuevos es invisible: mientras haya demasiados países crudos peleando arriba, no
 * entran más. **Lo que dosifica es lo que hay que aprender, y solo eso** — lo que se marca «fácil»
 * sale del recuento en el acto y pasa de largo.
 *
 * **Es el techo de países nuevos de una tarde, y por eso vale su número exacto:** asentar uno pide
 * cuatro días de vida y eso no se compra contestando, así que una maratón abre hasta llenar el
 * cupo y ahí se queda. En una sesión corriente no se nota — al día siguiente de no jugar, la cola
 * de repaso se lleva la sesión entera y no entra ninguno. Las cifras, en `srs.medir.ts`.
 */
export const MAX_EN_EL_AIRE = 10;

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
 * Lo que descansa un dato al que se ha dicho que sí. **Lo decide la respuesta, no la vida**: quien
 * lo acierta lo aparta media hora, y quien lo falla espera solo lo que aguante —minuto y medio el
 * olvido, un cuarto de hora el estreno—, que es volver a verlo dentro de la sesión.
 *
 * Descansar hace falta porque **el ranking es relativo y la sospecha, un cociente**: dentro de una
 * sesión todo lo demás acaba de verse y compite con milésimas, así que al de menos vida no le hace
 * falta llegar a 1 para ganar, le basta con ser el máximo. Sin freno la sesión se estrecha a la
 * mitad de países y un dato sale nueve veces de cincuenta; con un freno plano para todos se va por
 * el otro lado, porque dura más que la sesión y aparta lo fallado en vez de traerlo de vuelta.
 *
 * **Y lo decide la respuesta y no la vida porque no son lo mismo**: acertar algo que se acaba de
 * fallar deja la vida en minutos —solo suma el tiempo transcurrido—, así que mirándola ese «sí» se
 * trataba como un «no» y volvía a los tres minutos. Cinco de esos llenan el contador de «aprendido»
 * en tres cuartos de hora. Las cifras salen de `srs.medir.ts`.
 */
export const DESCANSO = 30 * 60_000;

/** Si un dato aún no puede volver a salir: lo fallado espera lo que aguante, lo acertado el tope. */
const descansando = (e: Estado | undefined, ahora: number) =>
  !!e && ahora - e.visto < (e.fallado ? e.vida * DIA : DESCANSO);

/**
 * Cuántas tarjetas tienen que pasar antes de que un país pueda repetir. El descanso va por dato y
 * mide tiempo, así que no impide que el mismo país vuelva en la tarjeta de al lado con otro de sus
 * cuatro: en un mazo de diez países eso son veinte repeticiones seguidas de cincuenta tarjetas.
 *
 * Cinco no aprieta ni con el mazo más pequeño que puede haber: en ninguna escena medida deja la
 * cola vacía, que sería la señal de que el freno se pasa. Las cifras, en `srs.medir.ts`.
 */
export const HUECO = 5;

/** `recientes` son los últimos países servidos, del más antiguo al más nuevo; los aparta `HUECO`. */
export function siguiente(mazo: Mazo, orden: string[], ahora: number, recientes: string[] = []): Pais | null {
  let mejor: { id: string; s: number } | null = null;
  // Los frenos se sueltan de uno en uno, y el hueco es el último: cuando el descanso lo aparta
  // todo, antes de repetir un país se pregunta por otro que también descansaba. Sin este escalón
  // el descanso se paga repitiendo, que es lo que el hueco existe para impedir.
  let libre: { id: string; s: number } | null = null;
  // Y el del mazo entero, sin freno ninguno: a quién preguntar cuando no queda nadie más, y
  // **quien decide si hay sitio para un país nuevo**.
  let respaldo: { id: string; s: number } | null = null;
  let enElAire = 0;
  for (const p of PAISES) {
    const visto = DATOS.some((d) => mazo[p.id]?.[d]);
    if (!visto) continue;
    if (!DATOS.some((d) => asentado(mazo[p.id]?.[d]))) enElAire++;
    // El país acaba de salir: no compite, pero sigue contando para el respaldo, que es la vía de
    // escape de todos los frenos de aquí.
    const acabaDeSalir = recientes.slice(-HUECO).includes(p.id);
    for (const d of DATOS) {
      const estado = mazo[p.id]?.[d];
      const s = sospecha(estado, ahora);
      if (!respaldo || s > respaldo.s) respaldo = { id: p.id, s };
      if (acabaDeSalir) continue;
      if (!libre || s > libre.s) libre = { id: p.id, s };
      if (descansando(estado, ahora)) continue;
      if (!mejor || s > mejor.s) mejor = { id: p.id, s };
    }
  }
  const elegido = mejor ?? libre ?? respaldo;
  const nuevo = orden.find((id) => !DATOS.some((d) => mazo[id]?.[d]));
  // **Estrenar lo decide el mazo entero y no lo que los frenos dejan a mano**: un freno dice
  // «ahora no», nunca «ya no queda nada», y mirando solo lo disponible se estrena país debiendo
  // un repaso —basta con que el hueco aparte al país al que se le debe—. Con esto y con que un
  // fallo venza a los minuto y medio, no se abre nada mientras haya algo que ya tocaba; y hasta
  // que venza sí, que es lo que deja encadenar estrenos aunque en cada uno se falle algo.
  const cedeAlNuevo = (!respaldo || respaldo.s < 1) && enElAire < MAX_EN_EL_AIRE;
  const id = cedeAlNuevo && nuevo ? nuevo : elegido?.id ?? nuevo;
  return id ? PAIS_POR_ID.get(id) ?? null : null;
}
