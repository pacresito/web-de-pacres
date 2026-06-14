// Pintado de Órbitas en canvas: fondo negro cosmos, color por temperatura estelar,
// estelas por desvanecido y los overlays del gesto y del radar. Sin React ni estado propio.

import type { Body } from "./engine";

const TAU = Math.PI * 2;

// Rampa de "temperatura estelar" por masa: poca masa → azul/blanco, mucha → naranja/rojo.
// (Elección estética del plan; no es la astrofísica real.) El rojo pleno llega a masa 3000.
// Sin colores fuera de esta rampa.
const MASS_STOPS: [number, number, number, number][] = [
  [   4, 180, 214, 255], // azul claro (cuerpo ligero)
  [  40, 232, 240, 255], // blanco azulado
  [ 200, 255, 240, 206], // amarillo pálido
  [ 900, 255, 168,  74], // naranja
  [3000, 255,  92,  48], // rojo-naranja
];

// `scale` estira el eje de masa: scale=2 → el rojo llega al doble (6000), p. ej. para la
// línea de estado, donde la masa total es mayor que la de un solo cuerpo.
export function massToColor(mass: number, scale = 1): [number, number, number] {
  const m = mass / scale;
  if (m <= MASS_STOPS[0][0]) return [MASS_STOPS[0][1], MASS_STOPS[0][2], MASS_STOPS[0][3]];
  const last = MASS_STOPS[MASS_STOPS.length - 1];
  if (m >= last[0]) return [last[1], last[2], last[3]];
  for (let k = 0; k < MASS_STOPS.length - 1; k++) {
    const [m0, r0, g0, b0] = MASS_STOPS[k];
    const [m1, r1, g1, b1] = MASS_STOPS[k + 1];
    if (m >= m0 && m <= m1) {
      const p = (m - m0) / (m1 - m0);
      return [Math.round(r0 + p * (r1 - r0)), Math.round(g0 + p * (g1 - g0)), Math.round(b0 + p * (b1 - b0))];
    }
  }
  return [last[1], last[2], last[3]];
}

// Variante legible de la rampa para texto sobre el fondo claro (papel), p. ej. las etiquetas
// de los botones: los extremos fríos (azul/blanco) son ilegibles ahí, así que oscurecemos el
// color (manteniendo el tono) solo cuando supera un techo de luminancia. El rojo/naranja ya
// contrastan y no se tocan.
export function massToReadableColor(mass: number, scale = 1): [number, number, number] {
  const [r, g, b] = massToColor(mass, scale);
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const MAX_LUM = 150; // techo de luminancia para contrastar sobre --t-paper
  if (lum <= MAX_LUM) return [r, g, b];
  const t = MAX_LUM / lum; // escalar hacia 0 conserva el tono, solo baja el brillo
  return [Math.round(r * t), Math.round(g * t), Math.round(b * t)];
}

// Color de la masa total en la línea de estado: el color real de la estrella, pero los valores
// bajos (≲1000) son demasiado claros sobre el papel, así que se oscurecen un poco (sin cambiar el
// tono). El factor sube de 0.7 a 1 conforme la masa va de 0 a 1000; por encima no se toca.
export function massToStatusColor(mass: number, scale = 1): [number, number, number] {
  const [r, g, b] = massToColor(mass, scale);
  const f = 0.7 + 0.3 * Math.min(1, mass / 1000);
  return [Math.round(r * f), Math.round(g * f), Math.round(b * f)];
}

// Estelas: en vez de borrar a negro opaco, se pinta un velo negro semitransparente cada
// frame → las posiciones viejas se desvanecen solas. α menor = estela más larga. Se funde
// a negro PURO (no a un gris) para que la estela no deje un rastro permanente por el camino.
export function fadeCanvas(ctx: CanvasRenderingContext2D, W: number, H: number, alpha = 0.3) {
  ctx.fillStyle = `rgba(0,0,0,${alpha})`;
  ctx.fillRect(0, 0, W, H);
}

// Un cuerpo: halo muy sutil + disco de color + núcleo blanco degradado
export function drawBody(ctx: CanvasRenderingContext2D, b: Body) {
  const [r, g, bl] = massToColor(b.mass);

  // halo apenas perceptible, pegado al cuerpo
  const glowR = b.radius * 2;
  const halo = ctx.createRadialGradient(b.x, b.y, b.radius * 0.7, b.x, b.y, glowR);
  halo.addColorStop(0, `rgba(${r},${g},${bl},0.14)`);
  halo.addColorStop(1, `rgba(${r},${g},${bl},0)`);
  ctx.fillStyle = halo;
  ctx.beginPath(); ctx.arc(b.x, b.y, glowR, 0, TAU); ctx.fill();

  // disco de color
  ctx.fillStyle = `rgb(${r},${g},${bl})`;
  ctx.beginPath(); ctx.arc(b.x, b.y, b.radius, 0, TAU); ctx.fill();

  // núcleo blanco degradado (centro caliente que se funde con el color del cuerpo)
  const core = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.radius);
  core.addColorStop(0, "rgba(255,255,255,0.9)");
  core.addColorStop(0.45, "rgba(255,255,255,0.25)");
  core.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = core;
  ctx.beginPath(); ctx.arc(b.x, b.y, b.radius, 0, TAU); ctx.fill();

  // cuerpo fijo (congelado al tocarlo, o sol de un preset): punto negro sutil en el centro
  // — la marca visual de "agujero negro" que ya no se mueve. Borde suave para no chocar.
  if (b.fixed) {
    const dotR = Math.max(1.5, b.radius * 0.22);
    const dot = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, dotR);
    dot.addColorStop(0, "rgba(0,0,0,0.85)");
    dot.addColorStop(0.65, "rgba(0,0,0,0.85)");
    dot.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = dot;
    ctx.beginPath(); ctx.arc(b.x, b.y, dotR, 0, TAU); ctx.fill();
  }
}

// Intersección del rayo centro→cuerpo con el borde del viewport (inset por `margin`).
// Devuelve null si el cuerpo está dentro del recuadro.
function edgePoint(W: number, H: number, b: Body, margin: number): { x: number; y: number } | null {
  if (b.x >= 0 && b.x <= W && b.y >= 0 && b.y <= H) return null;
  const cx = W / 2, cy = H / 2;
  const dx = b.x - cx, dy = b.y - cy;
  if (dx === 0 && dy === 0) return null;
  // t más pequeño que lleva el rayo a cada plano del recuadro interior
  let t = Infinity;
  if (dx > 0) t = Math.min(t, (W - margin - cx) / dx);
  if (dx < 0) t = Math.min(t, (margin - cx) / dx);
  if (dy > 0) t = Math.min(t, (H - margin - cy) / dy);
  if (dy < 0) t = Math.min(t, (margin - cy) / dy);
  return { x: cx + t * dx, y: cy + t * dy };
}

// Flecha-radar para un cuerpo fuera de cuadro: en el borde, apuntando hacia el cuerpo.
// Animación de escape: cuanto más lejos, más se estrecha la base del triángulo (hasta
// quedar en una fina línea) y más se atenúa, hasta desaparecer al escapar (FADE_FAR).
const FADE_NEAR = 40;    // px fuera del borde a partir de los cuales empieza a atenuarse
const FADE_FAR = 1400;   // px a los que la flecha ya se ha apagado ("escape")
const ARROW_LEN = 8;     // largo fijo del triángulo
const ARROW_BASE = 5;    // semiancho de la base cuando el cuerpo está cerca
export function drawRadarArrow(ctx: CanvasRenderingContext2D, W: number, H: number, b: Body) {
  const edge = edgePoint(W, H, b, 14);
  if (!edge) return;
  const dist = Math.hypot(b.x - edge.x, b.y - edge.y);
  const fade = 1 - Math.min(1, Math.max(0, (dist - FADE_NEAR) / (FADE_FAR - FADE_NEAR)));
  if (fade <= 0.02) return;

  const angle = Math.atan2(b.y - edge.y, b.x - edge.x);
  const base = ARROW_BASE * fade; // la base se cierra hasta ser una línea al escapar
  const [r, g, bl] = massToColor(b.mass);

  ctx.save();
  ctx.translate(edge.x, edge.y);
  ctx.rotate(angle);
  ctx.globalAlpha = 0.5 * fade; // sutil
  ctx.fillStyle = `rgb(${r},${g},${bl})`;
  ctx.beginPath();
  ctx.moveTo(ARROW_LEN, 0);
  ctx.lineTo(-ARROW_LEN * 0.6, base);
  ctx.lineTo(-ARROW_LEN * 0.6, -base);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.globalAlpha = 1;
}

// Explosión al eliminar una estrella (clic): destello que se hincha + onda expansiva que se
// abre y desvanece. `p` es el progreso 0→1; el color es el de la estrella que desaparece.
export function drawExplosion(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, baseR: number,
  color: [number, number, number], p: number,
) {
  const [r, g, b] = color;
  const ease = 1 - Math.pow(1 - p, 3); // ease-out: rápido al principio
  const alpha = 1 - p;

  // destello central que se hincha y se apaga
  const flashR = baseR * (1 + ease * 2.5);
  const flash = ctx.createRadialGradient(x, y, 0, x, y, flashR);
  flash.addColorStop(0, `rgba(255,255,255,${0.9 * alpha})`);
  flash.addColorStop(0.4, `rgba(${r},${g},${b},${0.55 * alpha})`);
  flash.addColorStop(1, `rgba(${r},${g},${b},0)`);
  ctx.fillStyle = flash;
  ctx.beginPath(); ctx.arc(x, y, flashR, 0, TAU); ctx.fill();

  // onda expansiva (anillo que se abre y adelgaza)
  ctx.save();
  ctx.globalAlpha = alpha * 0.7;
  ctx.strokeStyle = `rgb(${r},${g},${b})`;
  ctx.lineWidth = Math.max(0.5, baseR * 0.5 * (1 - p));
  ctx.beginPath(); ctx.arc(x, y, baseR * (1 + ease * 6), 0, TAU); ctx.stroke();
  ctx.restore();
}

// Preview del gesto de creación: bola-fantasma latiendo en el origen + flecha de
// lanzamiento en la dirección de tirachinas (origen − puntero = velocidad inicial).
export function drawDragPreview(
  ctx: CanvasRenderingContext2D,
  origin: { x: number; y: number },
  pointer: { x: number; y: number },
  mass: number,
  radius: number,
) {
  const [r, g, bl] = massToColor(mass);

  // bola-fantasma
  ctx.fillStyle = `rgba(${r},${g},${bl},0.55)`;
  ctx.beginPath(); ctx.arc(origin.x, origin.y, radius, 0, TAU); ctx.fill();
  ctx.strokeStyle = `rgba(${r},${g},${bl},0.8)`;
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(origin.x, origin.y, radius, 0, TAU); ctx.stroke();

  // flecha de lanzamiento (dirección y módulo = origen − puntero)
  const lvx = origin.x - pointer.x, lvy = origin.y - pointer.y;
  const len = Math.hypot(lvx, lvy);
  if (len < 4) return;
  const tipX = origin.x + lvx, tipY = origin.y + lvy;
  const ang = Math.atan2(lvy, lvx);

  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(origin.x, origin.y); ctx.lineTo(tipX, tipY); ctx.stroke();

  ctx.save();
  ctx.translate(tipX, tipY);
  ctx.rotate(ang);
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.beginPath();
  ctx.moveTo(7, 0); ctx.lineTo(-3, 4); ctx.lineTo(-3, -4); ctx.closePath();
  ctx.fill();
  ctx.restore();
}
