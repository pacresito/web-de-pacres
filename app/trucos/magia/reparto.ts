// Dónde cae cada carta al repartir los tres montones. Lógica pura: se verifica
// con reparto.test.ts (npx tsx), sin navegador.
//
// El montón es el estado final —la carta se elige sobre él—, así que la banda
// que identifica a cada carta (valor y palo, arriba) no puede quedar tapada por
// ninguna carta posterior. Eso es la restricción dura; el alto del montón cede
// antes que ella.

export interface Spot { x: number; y: number; r: number }

export interface Reparto {
  spots: Spot[];        // 21 posiciones en orden de reparto: carta i → montón i % 3
  ancho: number;
  alto: number;
  pitch: number;        // separación entre montones
  margen: number;       // borde izquierdo del primer montón
  montonAncho: number;  // huella horizontal de un montón: su caja de clic
  cardH: number;
}

// Ritmo y desorden calibrados a ojo con un prototipo suelto, a ancho de carta
// REF; a cualquier otro ancho se escalan.
// `prisa` es lo que se multiplica a lo que queda de reparto cuando alguien
// pincha sin esperar: quien ya ha visto su carta no tiene por qué aguantar.
export const RITMO = { intervalo: 200, vuelo: 1000, prisa: 0.25, ease: "cubic-bezier(.22,1.1,.36,1)" };
const REF = 64, CAIDA = 50, DESX = 5, DESY = 10, GIRO = 15, SEP = 12;

// La banda identificativa, en unidades del viewBox 100×142 del CardFace.
const BANDA = { x0: 30, x1: 72, y0: 18, y1: 43 };
// Sin margen, una esquina a décimas de píxel del borde de la carta que la tapa
// sale «libre» aquí y tapada en el hit-test del navegador.
const MARGEN = 1.5;

interface Caja { cardW: number; cardH: number }
// Rectángulo girado: centro, semiejes y los dos ejes propios.
interface Obb { cx: number; cy: number; ex: number; ey: number; ux: number; uy: number }

/** Ancho de carta que cabe en el viewport: tres montones más sus márgenes. */
export function anchoDeCarta(vw: number): number {
  // pitch ≈ cardW · (cos GIRO + 1,42 · sen GIRO + 2 · DESX/REF) + SEP
  const factor = Math.cos(rad(GIRO)) + 1.42 * Math.sin(rad(GIRO)) + (2 * DESX) / REF;
  return Math.min(68, Math.max(40, Math.floor((Math.min(vw, 480) - 32 - 3 * SEP) / (3 * factor))));
}

function rad(deg: number) { return (deg * Math.PI) / 180; }

/** La banda de una carta, como rectángulo girado en coordenadas del escenario. */
export function obbBanda(s: Spot, { cardW, cardH }: Caja): Obb {
  const cos = Math.cos(rad(s.r)), sin = Math.sin(rad(s.r));
  const bw = (BANDA.x1 - BANDA.x0) * cardW / 100, bh = (BANDA.y1 - BANDA.y0) * cardH / 142;
  // centro de la banda en el sistema de la carta, medido desde su centro
  const lx = (BANDA.x0 + BANDA.x1) / 2 * cardW / 100 - cardW / 2;
  const ly = (BANDA.y0 + BANDA.y1) / 2 * cardH / 142 - cardH / 2;
  return {
    cx: s.x + cardW / 2 + lx * cos - ly * sin,
    cy: s.y + cardH / 2 + lx * sin + ly * cos,
    ex: bw / 2, ey: bh / 2, ux: cos, uy: sin,
  };
}

/** La carta entera, con el margen de seguridad. */
export function obbCarta(s: Spot, { cardW, cardH }: Caja): Obb {
  return {
    cx: s.x + cardW / 2, cy: s.y + cardH / 2,
    ex: cardW / 2 + MARGEN, ey: cardH / 2 + MARGEN,
    ux: Math.cos(rad(s.r)), uy: Math.sin(rad(s.r)),
  };
}

// Solape exacto de dos rectángulos girados (eje separador). Muestrear puntos de
// la banda no basta: una carta girada se mete en medio de la banda sin tocar
// ninguna de sus esquinas.
export function solapan(a: Obb, b: Obb): boolean {
  const dx = b.cx - a.cx, dy = b.cy - a.cy;
  const ejes = [[a.ux, a.uy], [-a.uy, a.ux], [b.ux, b.uy], [-b.uy, b.ux]];
  return ejes.every(([ex, ey]) => {
    const alcance = (o: Obb) =>
      o.ex * Math.abs(o.ux * ex + o.uy * ey) + o.ey * Math.abs(-o.uy * ex + o.ux * ey);
    return Math.abs(dx * ex + dy * ey) <= alcance(a) + alcance(b);
  });
}

// Muestreo con rechazo: tira posiciones al azar y se queda con la primera que no
// tape ninguna banda ya puesta. Aleatorio de verdad —montón distinto en cada
// partida— y con las siete cartas legibles; si el desorden pedido no cabe en el
// solape, afloja primero el desorden y luego baja la carta hasta que se lee.
function monton(baseX: number, caja: Caja, esc: number, rand: () => number): Spot[] {
  const caida = CAIDA * esc, desx = DESX * esc, desy = DESY * esc;
  const spots: Spot[] = [], bandas: Obb[] = [];
  const libre = (s: Spot) => {
    const carta = obbCarta(s, caja);
    return bandas.every(b => !solapan(carta, b));
  };

  for (let k = 0; k < 7; k++) {
    let elegida: Spot | null = null;
    for (let t = 0; t < 120 && !elegida; t++) {
      const relax = t < 90 ? 1 : (120 - t) / 30;
      const cand: Spot = {
        x: baseX + (rand() * 2 - 1) * desx * relax,
        y: k * caida + (rand() * 2 - 1) * desy * relax,
        r: (rand() * 2 - 1) * GIRO * relax,
      };
      if (libre(cand)) elegida = cand;
    }
    if (!elegida) {
      const forzada: Spot = { x: baseX, y: k * caida, r: (rand() * 2 - 1) * GIRO };
      while (!libre(forzada)) forzada.y += 2;
      elegida = forzada;
    }
    spots.push(elegida);
    bandas.push(obbBanda(elegida, caja));
  }
  return spots;
}

export function reparte(cardW: number, rand: () => number = Math.random): Reparto {
  const cardH = Math.round((cardW * 142) / 100);
  const caja: Caja = { cardW, cardH };
  const esc = cardW / REF;

  // La separación parte de la huella girada de la carta: si dos montones se
  // mezclan, el truco pierde su pregunta («¿en qué montón está tu carta?»).
  const huella = cardW * Math.cos(rad(GIRO)) + cardH * Math.sin(rad(GIRO));
  const pitch = Math.round(huella + 2 * DESX * esc + SEP * esc);
  const margen = Math.round((huella - cardW) / 2 + DESX * esc);

  const pilas = [0, 1, 2].map(p => monton(margen + p * pitch, caja, esc, rand));
  const spots = Array.from({ length: 21 }, (_, i) => pilas[i % 3][Math.floor(i / 3)]);

  return {
    spots,
    pitch,
    margen,
    montonAncho: pitch - Math.round(SEP * esc),
    cardH,
    ancho: 2 * pitch + 2 * margen + cardW,
    alto: Math.round(Math.max(...spots.map(s => s.y)) + cardH + cardW * Math.sin(rad(GIRO))),
  };
}
