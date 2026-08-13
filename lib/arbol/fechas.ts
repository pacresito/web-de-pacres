// Leer, escribir y restar las fechas del árbol. Puro: `npx tsx lib/arbol/fechas.test.ts`.

/** Una fecha con la precisión que consta: `"1986"` o `"1986-03-01"`. */
export type Fecha = string;

export const MS_DIA = 86_400_000;

/** De la mayoría solo se sabe el año; el día lo tienen los del calendario de cumpleaños. */
export const conDia = (f: Fecha): boolean => f.length > 4;

export const añoDe = (f: Fecha): number => Number(f.slice(0, 4));

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** Sin el año, para una lista que ya se sabe cuál es: `"2026-03-14"` → `"14 mar"`. */
export const escribirCorto = (f: Fecha): string =>
  conDia(f) ? `${Number(f.slice(8, 10))} ${MESES[Number(f.slice(5, 7)) - 1]}` : f;

const MESES_LARGOS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

/** El día que se celebra, escrito entero: `"2026-03-01"` → `"1 de marzo"`. Pide día. */
export const escribirDiaDeMes = (f: Fecha): string =>
  `${Number(f.slice(8, 10))} de ${MESES_LARGOS[Number(f.slice(5, 7)) - 1]}`;

/**
 * Los años cumplidos entre dos fechas, contados con la precisión que tengan las dos:
 * exacta si a ambas les consta el día, y por años naturales si a alguna solo el año —como
 * si hubiera caído el 1 de enero—. Mezclar las dos cuentas haría que añadir el día de
 * nacimiento de alguien le quitara un año de golpe, y eso no es un dato nuevo, es un susto.
 */
export function edadEntre(desde: Fecha, hasta: Fecha): number {
  const años = añoDe(hasta) - añoDe(desde);
  if (!conDia(desde) || !conDia(hasta)) return años;
  return hasta.slice(5) >= desde.slice(5) ? años : años - 1;
}

/**
 * Los documentos anotan la defunción, pero no siempre. A quien hoy la alcanzara sin que
 * conste nada, el árbol no lo da por vivo: callar no es decir que sigue aquí. La mayor
 * edad que se llega a enseñar son, pues, 99 años.
 */
export const EDAD_IMPROBABLE = 100;

/** Se le supone fallecido aunque el documento no lo diga: hoy pasaría de lo que se cumple. */
export const seLeSuponeFallecido = (p: { birth?: Fecha; death?: Fecha }, hoy: Fecha): boolean =>
  !p.death && p.birth !== undefined && edadEntre(p.birth, hoy) >= EDAD_IMPROBABLE;

/**
 * La edad que tiene, o la que tenía al morir. `hoy` llega del servidor y no de este
 * proceso: calcularlo aquí lo pondría a discrepar entre el render de Next y la hidratación
 * cada vez que uno de los dos cruzara la medianoche antes que el otro. A quien se le supone
 * fallecido no se le da ninguna: la que saldría se cuenta hasta hoy, y hoy ya no está.
 */
export function edadDe(p: { birth?: Fecha; death?: Fecha }, hoy: Fecha): number | null {
  if (!p.birth || seLeSuponeFallecido(p, hoy)) return null;
  return edadEntre(p.birth, p.death ?? hoy);
}

/**
 * Qué se dice de la vida de una persona en el hueco que el bloque de identidad reserva
 * detrás de su nombre. **La edad viene de serie**: en una familia se sabe quién es mayor
 * que quién mucho antes que en qué año nació cada uno, y el año se queda a un toque para
 * quien vaya a comparar fechas. La fecha entera solo la tienen los que salen del
 * calendario de cumpleaños. Es un interruptor global: nunca se elige por persona.
 */
export type ModoFechas = "ocultar" | "año" | "edad" | "completa";

export const FECHAS_POR_DEFECTO: ModoFechas = "edad";

/**
 * Lo que consta, tal como consta: si solo se sabe el fallecimiento, se dice así, y la
 * fecha entera se escribe en el orden en que está guardada —de más grueso a más fino—,
 * que es el que deja comparar dos fechas leyéndolas de izquierda a derecha.
 */
export function escribirVida(p: { birth?: Fecha; death?: Fecha }, modo: ModoFechas, hoy: Fecha): string {
  if (modo === "ocultar") return "";
  // La edad de un fallecido tiene que decir por sí sola que lo es: lo dice el verbo, que
  // no hay que descifrar ni buscar en ninguna leyenda.
  if (modo === "edad") {
    const edad = edadDe(p, hoy);
    if (edad === null) return "";
    const años = `${edad} ${edad === 1 ? "año" : "años"}`;
    return p.death ? `vivió ${años}` : años;
  }
  const fecha = (f: Fecha) => (modo === "completa" ? f : f.slice(0, 4));
  if (p.birth && p.death) return `${fecha(p.birth)} – ${fecha(p.death)}`;
  if (p.birth) return fecha(p.birth);
  if (p.death) return `† ${fecha(p.death)}`;
  return "";
}
