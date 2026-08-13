// La cámara del lienzo: dónde mira, cuánto acerca, hasta dónde se la deja llegar y por
// dónde queda el punto de vista cuando ya no se ve.
// Todo en coordenadas del árbol; los píxeles de pantalla entran solo como tamaño del hueco.
import { ALTO_NODO, ANCHO_COLUMNA, ANCHO_NODO, type Layout } from "./layout";

// Alejarse encoge el árbol y nada más: **la unidad la elige el riel y el tamaño, el
// pellizco**, y ninguno de los dos toca lo del otro. El zoom semántico —cambiar de unidad
// al cruzar una escala— dejaba sin enseñar el árbol abierto en pequeño, que es una vista
// que se quiere: la forma entera de lo desplegado, aunque los nombres ya no se lean.
export const ESCALA_MIN = 0.06;
export const ESCALA_MAX = 2.2;

/**
 * Las tres unidades con que se dibuja el árbol: una persona, un grupo de hermanos o una
 * rama entera. Se cambia de una a otra desde el riel.
 */
export type Parada = "ramas" | "bloques" | "personas";

/**
 * La altura en que cada unidad se lee cómoda. No es donde vive cada parada —el pellizco
 * llega a donde quiera desde cualquiera—: es a dónde lleva un salto que no lo ha pedido
 * nadie, como tocar un bloque para caer en su familia.
 */
export const ZOOM_DE: Record<Parada, number> = { ramas: 0.18, bloques: 0.42, personas: 1 };

/**
 * Los 130 recuadros del mapa de familias caben en un móvil a 0,25, y cada uno lleva escrito
 * de quién es: por debajo de ahí no es un mapa más pequeño, es una mancha.
 */
const SUELO_BLOQUES = 0.25;

/**
 * Lo que el riel le hace a la cámara al cambiar de unidad: **nada**, salvo que a esta altura
 * la unidad a la que va no se leyera. El árbol de personas no tiene suelo —verlo entero y
 * pequeño, sin nombres, es una vista que se quiere— y las ramas no miran la escala.
 */
export function alCambiarDeUnidad(v: Vista, parada: Parada): Vista {
  return parada !== "bloques" || v.escala >= SUELO_BLOQUES ? v : { ...v, escala: ZOOM_DE.bloques };
}

/**
 * Por debajo de esto, un bloque es una caja con sus marcas y nada más: su título acabaría
 * en una mancha. Un mapa esconde los rótulos antes que dibujarlos ilegibles.
 */
export const ZOOM_TITULO_BLOQUE = 0.34;

/** La cámara se guarda relativa al punto de vista: así lo persigue sin efectos ni saltos. */
export interface Vista {
  dx: number;
  dy: number;
  escala: number;
}

/** Lo que hace falta para acotarla: dónde está el ancla y qué ocupa el árbol en pantalla. */
export interface Encuadre {
  ancla: { x: number; y: number };
  limites: Layout["limites"];
  w: number;
  h: number;
}

/** Acerca o aleja dejando quieto el punto que hay bajo los dedos (o bajo el cursor). */
export function conZoom(v: Vista, factor: number, px: number, py: number, caja: DOMRect): Vista {
  const escala = Math.min(ESCALA_MAX, Math.max(ESCALA_MIN, v.escala * factor));
  if (escala === v.escala) return v;
  const desfase = 1 / v.escala - 1 / escala;
  return {
    escala,
    dx: v.dx + (px - caja.left - caja.width / 2) * desfase,
    dy: v.dy + (py - caja.top - caja.height / 2) * desfase,
  };
}

/**
 * El centro de la pantalla nunca sale de la caja del árbol: por lejos que se arrastre,
 * el cuadrante que mira hacia él sigue lleno y siempre hay a quien volver. Y cuando el
 * árbol cabe entero en el hueco, la misma cuenta pide que no se salga por ningún borde
 * —arrastrarlo hasta perderlo de vista tampoco lleva a ninguna parte—.
 */
function acotarEje(centro: number, min: number, max: number, mitad: number): number {
  const solape = Math.min(mitad, max - min);
  return Math.min(max - solape + mitad, Math.max(min + solape - mitad, centro));
}

export function acotar(v: Vista, { ancla, limites, w, h }: Encuadre): Vista {
  if (w === 0 || h === 0) return v; // sin hueco medido no hay nada que acotar contra
  const dx = acotarEje(ancla.x + v.dx, limites.minX, limites.maxX, w / (2 * v.escala)) - ancla.x;
  const dy = acotarEje(ancla.y + v.dy, limites.minY, limites.maxY, h / (2 * v.escala)) - ancla.y;
  // Devolver la misma vista cuando no sobra nada deja que React se ahorre el render.
  return dx === v.dx && dy === v.dy ? v : { ...v, dx, dy };
}

/** Una marca de la regla de generación: a quién rotula y en qué píxel del hueco se escribe. */
export interface Marca {
  nivel: number;
  /** El centro de lo que se ve de su columna, no el de la columna: la que asoma por un
   *  borde se rotula igual de bien, y así dos marcas nunca se pisan. */
  x: number;
  etiqueta: string;
}

/** Por debajo de esto la columna asoma pero no le cabe la etiqueta, así que no se rotula. */
const ASOMO_MINIMO = 32;

/**
 * La regla de generación en píxeles del hueco. Con el eje de izquierda a derecha rotula
 * **columnas y no bandas**: las mismas que ya distingue el claroscuro del fondo.
 *
 * El signo se invierte respecto al `nivel` del layout —ahí los ancestros son positivos
 * porque van a la izquierda—: en pantalla se cuentan generaciones desde ti, y las de
 * encima son las negativas.
 */
export function reglaDe(niveles: number[], centroX: number, escala: number, w: number): Marca[] {
  const ancho = ANCHO_COLUMNA * escala;
  const marcas: Marca[] = [];
  for (const nivel of niveles) {
    const centro = w / 2 + (-nivel * ANCHO_COLUMNA - centroX) * escala;
    const izquierda = Math.max(0, centro - ancho / 2);
    const derecha = Math.min(w, centro + ancho / 2);
    // La tuya se rotula aunque no le quepa la etiqueta: alejando del todo las columnas
    // miden menos que su rótulo, y una regla sin el «tú» no es una regla, es una franja.
    if (derecha <= izquierda || (derecha - izquierda < ASOMO_MINIMO && nivel !== 0)) continue;
    marcas.push({ nivel, x: (izquierda + derecha) / 2, etiqueta: etiquetaDe(nivel) });
  }
  return marcas;
}

/**
 * La tuya se rotula «tú» y no «0»: un cero pide que alguien explique desde dónde se cuenta,
 * y con el «tú» puesto los `−1` y `+1` de al lado se leen sin que nadie los presente.
 */
const etiquetaDe = (nivel: number) => (nivel === 0 ? "tú" : nivel > 0 ? `−${nivel}` : `+${-nivel}`);

/** Dónde asoma la brújula, en píxeles del hueco, y hacia dónde apunta (grados, 0 = derecha). */
export interface Rumbo {
  x: number;
  y: number;
  angulo: number;
}

// Lo que se separa del borde: por los lados, media pastilla; por arriba y por abajo, lo
// que ocupan el recuento y los botones —una fila de 44 a 12 del borde— más media pastilla.
const MARGEN = { lado: 56, alto: 72 };

/**
 * Por dónde queda el punto de vista cuando se ha ido de la pantalla, o `null` mientras se
 * le vea: asoma por el punto en que la recta desde el centro sale del hueco. El tope del
 * paneo impide perder el árbol; esto impide perder a la persona desde la que se lee.
 */
export function brujulaDe(v: Vista, w: number, h: number): Rumbo | null {
  if (w === 0 || h === 0) return null;
  // La cámara se guarda respecto al punto de vista, así que él está en el centro menos
  // lo arrastrado — sin pasar por el layout.
  const dx = -v.dx * v.escala;
  const dy = -v.dy * v.escala;
  const asoma = { x: (ANCHO_NODO / 2) * v.escala, y: (ALTO_NODO / 2) * v.escala };
  if (Math.abs(dx) < w / 2 + asoma.x && Math.abs(dy) < h / 2 + asoma.y) return null;
  // Hasta dónde llega el rayo del centro antes de salirse del hueco ya descontado el margen.
  const dentro = (medio: number, margen: number) => Math.max(0, medio - margen);
  const hasta = Math.min(
    dx === 0 ? Infinity : dentro(w / 2, MARGEN.lado) / Math.abs(dx),
    dy === 0 ? Infinity : dentro(h / 2, MARGEN.alto) / Math.abs(dy),
  );
  return {
    x: w / 2 + dx * hasta,
    y: h / 2 + dy * hasta,
    angulo: (Math.atan2(dy, dx) * 180) / Math.PI,
  };
}
