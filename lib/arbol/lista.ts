// A quién quiero que me avisen cuando celebre algo. Puro: `npx tsx lib/arbol/lista.test.ts`.
//
// No es una regla del árbol, es una lista mía, y por eso vive aparte de `celebraciones.ts`:
// aquello es el panel de la web, que se mueve con quien lo mire, y esto es de quien recibe el
// mensaje. A quién felicita uno no se deduce de un pedigrí —hay primos terceros con los que se
// cena cada mes y primos hermanos a los que no se ve desde hace veinte años—, así que se
// escribe entera y a mano: se añade a quien haga falta y se quita a quien sobre, aquí y sin
// tocar nada más.
//
// **Cada id lleva su nombre al lado, y el test comprueba que sigue siendo quien dice ser**:
// los ids salen de un JSON que se regenera, y uno que cambiara de dueño en silencio pondría a
// felicitar a un desconocido el día que no era.

import { descendientes, type Grafo } from "./grafo";
import { declinar, PAREJAS, parentescos, SIN_PARENTESCO, type Parentesco } from "./parentesco";

/** Un id con el nombre al lado. Manda el id; el nombre está para poder leer esta lista. */
type Quien = { id: string; nombre: string };

export const YO: Quien = { id: "p25", nombre: "Pablo" };

/** Mi pareja: los suyos entran por ella y se nombran desde ella. */
export const PAREJA: Quien = { id: "p24", nombre: "Carmen" };

/** De los míos, los que me son esto. */
const MIOS = ["bisabuelos", "abuelos", "padres", "tíos", "hermanos", "primos", "hijos", "sobrinos", "nietos"];

/** De los suyos, los que le son esto a ella. */
const SUYOS = ["abuelos", "padres", "tíos", "hermanos", "primos", "sobrinos", "sobrinos segundos"];

/**
 * Ramas enteras: toda la descendencia de un matrimonio, hasta el último nieto y sin tope de
 * grado. Es la forma de meter a una familia con la que uno se sigue viendo cuando el
 * parentesco ya se ha quedado corto para nombrarla.
 */
const RAMAS: [Quien, Quien][] = [
  // Mis abuelos maternos: la rama Velasco entera.
  [{ id: "p395", nombre: "José" }, { id: "p396", nombre: "Catalina" }],
];

/**
 * Los que no entran por ninguna regla y quiero igual. `como` solo lo lleva quien además no
 * me es nada: sin parentesco del que sacarlo, o se escribe aquí o la lista no sabe nombrarlo.
 */
const SUELTOS: (Quien & { como?: string })[] = [
  // Aina no es hija de Javi, así que no le es sangre a nadie de la familia; pero es de casa.
  { id: "p425", nombre: "Aina", como: "la hija de Ana" },
  // Los de Vicente. Sobrinos segundos tengo catorce y no quiero saber de los otros doce:
  // por eso entran por su id y no abriendo la regla, que es de lo que va esta lista.
  { id: "p144", nombre: "Ricardo" },
  { id: "p145", nombre: "Guillermo" },
];

/** Y los que entran por una regla y prefiero no saber. Gana esta lista. */
const FUERA: Quien[] = [];

/** Todos los que la lista nombra por id: lo que el test tiene que vigilar. */
export const CITADOS: Quien[] = [YO, PAREJA, ...RAMAS.flat(), ...SUELTOS, ...FUERA];

/** Lo que la lista sabe de cada uno: cómo lo llamo y de qué se le avisa. */
export interface Entrada {
  /** Lo que me es, para poder nombrarlo. Nulo solo en mí. */
  como: string | null;
  /**
   * Si además del cumpleaños se avisa de su onomástica. **Solo de los míos de sangre y de mi
   * pareja**: el santo es una costumbre de casa, y felicitárselo a la familia política era
   * doblar el mensaje con lo que ni ellos esperan ni yo felicito.
   */
  santo: boolean;
}

/**
 * La lista, con el nombre que le doy a cada uno. **Entran también los muertos** —un abuelo es
 * de los míos aunque ya no cumpla años—: quitarlos es cosa de quien mire el calendario, no de
 * quien decida a quién quiere.
 */
export function laLista(g: Grafo): Map<string, Entrada> {
  const desdeMi = parentescos(g, YO.id);
  const desdeElla = parentescos(g, PAREJA.id);

  const dentro = new Set<string>();
  for (const [id, { termino }] of desdeMi) if (MIOS.includes(termino)) dentro.add(id);
  for (const [id, { termino }] of desdeElla) if (SUYOS.includes(termino)) dentro.add(id);
  for (const [uno, otra] of RAMAS) for (const suyo of descendenciaDe(g, uno, otra)) dentro.add(suyo);
  for (const { id } of SUELTOS) dentro.add(id);

  // Las parejas al final y de todos, que es lo que mete a la familia política de una sola
  // regla: quien comparte la vida con alguien de la lista está en la lista. Y no arrastra más
  // que a la pareja —a los suyos no—, o cualquiera acabaría trayendo a un árbol entero detrás.
  for (const id of [...dentro]) for (const otro of parejaActual(g, id)) dentro.add(otro);

  for (const { id } of FUERA) dentro.delete(id);

  const deSangre = (id: string) => {
    const suyo = desdeMi.get(id)!.termino;
    return suyo !== PAREJAS && suyo !== SIN_PARENTESCO;
  };
  return new Map(
    [...dentro].map((id) => [
      id,
      { como: comoLoLlamo(g, id, desdeMi, desdeElla), santo: deSangre(id) || id === PAREJA.id },
    ]),
  );
}

/**
 * Cómo lo llamo: por lo que me es, y si no me es nada, por lo que le es a ella —«la prima de
 * Carmen»—, que es por donde lo conozco. Y si tampoco, por lo que diga su línea de la lista.
 * A mí no me llamo de ninguna manera.
 */
function comoLoLlamo(g: Grafo, id: string, desdeMi: Mapa, desdeElla: Mapa): string | null {
  if (id === YO.id) return null;
  return (
    porLoQueEs(g, id, desdeMi, "") ??
    porLoQueEs(g, id, desdeElla, ` de ${PAREJA.nombre}`) ??
    SUELTOS.find((s) => s.id === id)?.como ??
    null
  );
}

type Mapa = Map<string, Parentesco>;

/** Su término declinado; y al que solo entró por su pareja, con quién está, que es lo que lo sitúa. */
function porLoQueEs(g: Grafo, id: string, mapa: Mapa, sufijo: string): string | null {
  const { termino } = mapa.get(id)!;
  if (termino === SIN_PARENTESCO) return null;
  if (termino !== PAREJAS) {
    return `${declinar(termino, 1, g.personaPorId.get(id)!.sexo === "m" ? 1 : 0)}${sufijo}`;
  }
  for (const otro of parejaActual(g, id)) {
    if (otro === YO.id) return "tu pareja";
    const suyo = mapa.get(otro)!.termino;
    if (suyo !== PAREJAS && suyo !== SIN_PARENTESCO) return `pareja de ${g.personaPorId.get(otro)!.nombre}`;
  }
  return null;
}

/** Con quién está hoy: el divorcio saca de la lista, como saca del panel. */
function* parejaActual(g: Grafo, id: string): Generator<string> {
  for (const unionId of g.unionesDePartner.get(id) ?? []) {
    const union = g.unionPorId.get(unionId)!;
    if (union.roto) continue;
    for (const otro of union.partners) if (otro !== id) yield otro;
  }
}

/** La descendencia de los dos, sin ellos: a los de arriba se los mete por parentesco. */
function descendenciaDe(g: Grafo, uno: Quien, otra: Quien): Set<string> {
  const union = (g.unionesDePartner.get(uno.id) ?? [])
    .map((id) => g.unionPorId.get(id)!)
    .find((u) => u.partners.includes(otra.id));
  if (!union) throw new Error(`No consta unión entre ${uno.nombre} y ${otra.nombre}.`);

  const salida = new Set<string>();
  for (const hijo of union.children) {
    salida.add(hijo);
    for (const suyo of descendientes(g, hijo)) salida.add(suyo);
  }
  return salida;
}
