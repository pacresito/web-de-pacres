// La cámara del lienzo: dónde mira, cuánto acerca, hasta dónde se la deja llegar y por
// dónde queda el punto de vista cuando ya no se ve.
// Todo en coordenadas del árbol; los píxeles de pantalla entran solo como tamaño del hueco.
import { ALTO_NODO, ANCHO_NODO, type Layout } from "./layout";

export const ESCALA_MIN = 0.12;
export const ESCALA_MAX = 2.2;

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
