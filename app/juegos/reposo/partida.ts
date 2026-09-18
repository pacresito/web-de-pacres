// La mecánica de una visita: enganchar el toque a un objeto, y qué pasa al tocarlo. Puro,
// sin React ni canvas — page.tsx lo conecta a los eventos y render.ts pinta el resultado.
//
// Una visita es corta y acaba sola: tres fallos la cierran. **El castigo no quita nada** —lo
// encontrado se queda—, porque en un juego que solo se rejuega dentro de una semana cualquier
// castigo pesa diez veces más que en uno diario: el límite existe para matar el barrido a
// clics, no para escarmentar.
import type { Cambio } from "./escena";
import type { Zona } from "./render";

/** Lo que se perdona de puntería. La pieza más pequeña de la calle mide 25×39 px en
 *  escritorio (lo vigila render.test.ts), así que diez píxeles cubren el pulso sin llegar a
 *  robarle el toque al vecino de al lado. */
export const GRACIA = 10;

export const FALLOS = 3;

/** De todo lo que el toque alcanza —lo que pisa, más lo que pasa a menos de `gracia`—, gana
 *  **el más pequeño**. El tamaño va antes que la distancia, y esa es la parte que no es obvia:
 *  con la distancia primero, el edificio en obras se queda el toque que pasaba a seis píxeles
 *  de la papelera, porque el punto cae dentro de él y la papelera está «más lejos». Los
 *  objetos chicos viven dentro de los grandes —el escaparate en el local, la papelera en la
 *  acera de la obra—, así que la distancia solo desempata entre dos del mismo tamaño. Es la
 *  regla del Atlas, que allí resuelve lo mismo poniendo el punto antes que el contorno para
 *  que Andorra no se la trague España.
 *
 *  **Lo que ya no está conserva su zona:** `zonas()` las da todas, también las de lo que hoy
 *  no se pinta. Un objeto que desapareció sigue siendo un objetivo real —su ausencia es
 *  justo el cambio— y sin zona sería el único cambio imposible de señalar. */
/** Cuánto más pequeño tiene que ser lo de al lado para robarle el toque a lo que te contiene.
 *  Ocho veces, y el número sale de los dos casos que lo aprietan por los dos lados: el
 *  escaparate cabe cuatro veces en el local y **no** debe robarle el centro —son la misma
 *  cosa a dos tamaños—, y la papelera cabe ochenta veces en la obra que tiene detrás y **sí**
 *  debe robárselo, porque esa obra es el fondo sobre el que está. Entre cuatro y ochenta, ocho
 *  deja sitio a los dos. */
const FONDO = 1 / 8;

export function enganchar(zonas: Zona[], x: number, y: number, gracia = GRACIA): string | null {
  // **Lo que te contiene gana, salvo que lo de al lado sea mucho más pequeño.** Con la regla
  // simple —gana el más pequeño dentro de la gracia— un objeto pequeño que pase cerca le roba
  // el toque a su vecino aunque el dedo haya caído dentro del vecino, y cuánto es «cerca»
  // depende de la escala a la que se sirva la calle: la gracia va en píxeles de pantalla y las
  // cajas encogen con el encuadre. Al enmarcar la calle en una ventana, la bici quedó a ocho
  // píxeles del centro del macetero y el macetero dejó de poder tocarse — sin error y sin
  // aviso, solo un objeto que ya nunca se puede señalar.
  //
  // Pero la gracia tiene que seguir existiendo, o fallar por seis píxeles al apuntar a la
  // papelera te devuelve la fachada de doscientos mil píxeles que hay detrás. La diferencia
  // entre los dos casos es el tamaño relativo: la bici y el macetero son del mismo orden —son
  // vecinos—, mientras que la fachada es fondo. De ahí el umbral: lo cercano solo le gana a lo
  // que te contiene si cabría varias veces dentro.
  let dentro: { id: string; area: number } | null = null;
  let cerca: { id: string; dist: number; area: number } | null = null;
  for (const z of zonas) {
    const dx = Math.max(z.x - x, 0, x - (z.x + z.w));
    const dy = Math.max(z.y - y, 0, y - (z.y + z.h));
    const area = z.w * z.h;
    if (dx === 0 && dy === 0) {
      if (!dentro || area < dentro.area) dentro = { id: z.id, area };
      continue;
    }
    const dist = Math.hypot(dx, dy);
    if (dist > gracia) continue;
    if (!cerca || dist < cerca.dist || (dist === cerca.dist && area < cerca.area)) {
      cerca = { id: z.id, dist, area };
    }
  }
  if (dentro && cerca && cerca.area < dentro.area * FONDO) return cerca.id;
  return dentro ? dentro.id : cerca && cerca.id;
}

export interface Visita {
  /** En el orden en que se encontraron: la crónica los lee así. */
  encontrados: string[];
  /** Fallados. Se marcan en la calle para no gastar el siguiente toque en lo mismo — con solo
   *  tres fallos, el chivatazo es minúsculo y evita repetir a ciegas. */
  descartados: string[];
  fallos: number;
  cerrada: boolean;
}

export const nuevaVisita = (): Visita => ({ encontrados: [], descartados: [], fallos: 0, cerrada: false });

export type Respuesta =
  | { tipo: "acierto"; id: string }
  | { tipo: "fallo"; id: string }
  | { tipo: "repetido"; id: string }
  | { tipo: "nada" };

/** Un toque sobre `id`, con los cambios que de verdad hay. Devuelve la visita nueva —no toca
 *  la que recibe— y qué contestar. Volver a tocar algo ya resuelto no gasta fallo: sería
 *  castigar el pulso, no la puntería. */
export function tocar(visita: Visita, id: string | null, cambios: Cambio[]): { visita: Visita; respuesta: Respuesta } {
  if (!id || visita.cerrada) return { visita, respuesta: { tipo: "nada" } };
  if (visita.encontrados.includes(id) || visita.descartados.includes(id)) {
    return { visita, respuesta: { tipo: "repetido", id } };
  }
  if (cambios.some((c) => c.id === id)) {
    return {
      visita: { ...visita, encontrados: [...visita.encontrados, id] },
      respuesta: { tipo: "acierto", id },
    };
  }
  const fallos = visita.fallos + 1;
  return {
    visita: { ...visita, descartados: [...visita.descartados, id], fallos, cerrada: fallos >= FALLOS },
    respuesta: { tipo: "fallo", id },
  };
}

/** Cómo se llama cada objeto cuando el juego habla de él, y qué se dice de cada nivel. La
 *  frase del acierto es el único sitio donde el juego se explica, así que nombra la cosa y lo
 *  que le ha pasado, nunca el mecanismo: «el toldo, recogido» y no «toldo, nivel 3». */
export const NOMBRES: Record<string, string> = {
  coche: "el coche de la esquina", ropa: "la ropa tendida", puesto: "el puesto de fruta",
  papelera: "la papelera", buzon: "el buzón", persiana: "la persiana del segundo",
  contenedor: "el contenedor", escaparate: "el escaparate", bici: "la bici atada a la farola",
  toldo: "el toldo", macetero: "el macetero", terraza: "la terraza", mesas: "las mesas de fuera",
  cortina: "la cortina", sombrilla: "la sombrilla", letrero: "el letrero del local",
  obra: "la obra", cartel: "el cartel pegado", grafiti: "el grafiti", farola: "la farola",
  banco: "el banco", fachada: "la fachada", arbol: "el árbol", comercio: "el local de abajo",
};

const UNIDADES: [number, string, string][] = [
  [365 * 24 * 3600e3, "año", "años"],
  [30 * 24 * 3600e3, "mes", "meses"],
  [24 * 3600e3, "día", "días"],
  [3600e3, "hora", "horas"],
];

/** «hace doce días». Redondea a la unidad que se entiende de un vistazo: el jugador quiere
 *  saber si esto es de esta mañana o de la primavera pasada, no cuántos minutos son. */
export function haceCuanto(ms: number): string {
  for (const [unidad, singular, plural] of UNIDADES) {
    const n = Math.floor(ms / unidad);
    if (n >= 1) return `hace ${n} ${n === 1 ? singular : plural}`;
  }
  return "hace un rato";
}
