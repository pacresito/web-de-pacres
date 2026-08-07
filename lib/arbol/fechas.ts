// Leer, escribir y restar las fechas del árbol. Puro: `npx tsx lib/arbol/fechas.test.ts`.

/** Una fecha con la precisión que consta: `"1986"` o `"1986-03-01"`. */
export type Fecha = string;

export const MS_DIA = 86_400_000;

/** De la mayoría solo se sabe el año; el día lo tienen los del calendario de cumpleaños. */
export const conDia = (f: Fecha): boolean => f.length > 4;

export const añoDe = (f: Fecha): number => Number(f.slice(0, 4));

/** Como se escribe en España, con los ceros: `"1986-03-01"` → `"01/03/1986"`. */
export const escribir = (f: Fecha): string =>
  conDia(f) ? `${f.slice(8, 10)}/${f.slice(5, 7)}/${f.slice(0, 4)}` : f;

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** Sin el año, para una lista que ya se sabe cuál es: `"2026-03-14"` → `"14 mar"`. */
export const escribirCorto = (f: Fecha): string =>
  conDia(f) ? `${Number(f.slice(8, 10))} ${MESES[Number(f.slice(5, 7)) - 1]}` : f;

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
