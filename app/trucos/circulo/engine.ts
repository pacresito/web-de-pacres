// Puntuación del trazo del Círculo perfecto. Lógica pura, sin React ni canvas:
// page.tsx solo la alimenta con los puntos que va soltando el puntero.

export type Pt = { x: number; y: number };

const TAU = Math.PI * 2;

// Radio mínimo para que el trazo cuente como intento y no como un garabato.
const MIN_RADIUS = 20;
// Hueco que anula el término de cierre: un cuarto de vuelta sin trazar.
const MAX_GAP = Math.PI / 2;
// Puntos del remuestreo. De sobra para que el paso angular nunca alcance π,
// que es lo que rompería el desenrollado del barrido.
const SAMPLES = 240;
// Cuánto pesa la dispersión del radio. Sin amplificar, la métrica se apelmaza
// arriba: un óvalo claro se queda a un punto de un círculo bueno.
const ROUNDNESS_K = 3;

// Trazo remuestreado a puntos equiespaciados en longitud. Los eventos de puntero
// llegan tanto más juntos cuanto más despacio va la mano, y al cerrar el círculo
// todo el mundo frena: ponderando por punto, ese último tramo pesa varias veces
// más que el resto y hunde la nota justo al terminar.
function resample(pts: Pt[], n = SAMPLES): Pt[] {
  const acc = [0];
  for (let i = 1; i < pts.length; i++) {
    acc.push(acc[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  }
  const total = acc[acc.length - 1];
  if (total === 0) return [...pts];

  const out: Pt[] = [];
  let j = 0;
  for (let k = 0; k < n; k++) {
    const target = (total * k) / (n - 1);
    while (j < acc.length - 2 && acc[j + 1] < target) j++;
    const seg = acc[j + 1] - acc[j];
    const t = seg > 0 ? (target - acc[j]) / seg : 0;
    out.push({
      x: pts[j].x + (pts[j + 1].x - pts[j].x) * t,
      y: pts[j].y + (pts[j + 1].y - pts[j].y) * t,
    });
  }
  return out;
}

// Circunferencia que mejor ajusta la nube, por mínimos cuadrados (Kåsa). El
// centroide no sirve: en un arco abierto cae hacia el arco, y entonces un trazo
// impecable pero sin cerrar puntúa como deforme. Aquí lo de no cerrar lo cobra
// el término de cierre, y la redondez mide solo la forma.
export function fitCircle(pts: Pt[]): { cx: number; cy: number; r: number } {
  const n = pts.length;
  const mx = pts.reduce((s, p) => s + p.x, 0) / n;
  const my = pts.reduce((s, p) => s + p.y, 0) / n;

  // Coordenadas centradas en el centroide: mismo ajuste, sistema mejor condicionado.
  let Suu = 0, Svv = 0, Suv = 0, Suuu = 0, Svvv = 0, Suvv = 0, Svuu = 0;
  for (const p of pts) {
    const u = p.x - mx, v = p.y - my;
    Suu += u * u; Svv += v * v; Suv += u * v;
    Suuu += u * u * u; Svvv += v * v * v;
    Suvv += u * v * v; Svuu += v * u * u;
  }

  const det = Suu * Svv - Suv * Suv;
  // Trazo recto (o casi): no hay circunferencia que ajustar.
  if (Math.abs(det) < 1e-9) return { cx: mx, cy: my, r: 0 };

  const b1 = (Suuu + Suvv) / 2;
  const b2 = (Svvv + Svuu) / 2;
  const uc = (b1 * Svv - b2 * Suv) / det;
  const vc = (b2 * Suu - b1 * Suv) / det;

  return {
    cx: mx + uc,
    cy: my + vc,
    r: Math.sqrt(uc * uc + vc * vc + (Suu + Svv) / n),
  };
}

// Ángulo total barrido alrededor del centro, con signo y desenrollado: mide
// cuánta vuelta se ha dado de verdad, no dónde acabó la mano.
function sweptAngle(pts: Pt[], cx: number, cy: number): number {
  let sweep = 0;
  let prev = Math.atan2(pts[0].y - cy, pts[0].x - cx);
  for (let i = 1; i < pts.length; i++) {
    const a = Math.atan2(pts[i].y - cy, pts[i].x - cx);
    let d = a - prev;
    if (d > Math.PI) d -= TAU;
    else if (d < -Math.PI) d += TAU;
    sweep += d;
    prev = a;
  }
  return sweep;
}

export function computeScore(pts: Pt[]): number {
  if (pts.length < 20) return 0;

  const s = resample(pts);
  const { cx, cy, r } = fitCircle(s);
  if (r < MIN_RADIUS) return 0;

  const dists = s.map(p => Math.hypot(p.x - cx, p.y - cy));
  const mean = dists.reduce((a, d) => a + d, 0) / dists.length;
  const std = Math.sqrt(dists.reduce((a, d) => a + (d - mean) ** 2, 0) / dists.length);
  const roundness = Math.max(0, 1 - (ROUNDNESS_K * std) / mean);

  // Dar la vuelta entera es el máximo, y seguir trazando no resta: si la segunda
  // pasada se va por otro lado, ya lo cobra la redondez.
  const gap = Math.max(0, TAU - Math.abs(sweptAngle(s, cx, cy)));
  const closure = Math.max(0, 1 - gap / MAX_GAP);

  return Math.min(1, roundness * 0.7 + closure * 0.3);
}
