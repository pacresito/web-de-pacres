// Pintado de Fluidos en canvas: paleta por material + overlay de celdas
// transportadas por la herramienta Mover. Sin React ni estado propio.

import {
  CELL, EMPTY, SAND, WATER, FIRE, VAPOR,
  WATER_HEAT_MAX, VAPOR_CONDENSE_MAX,
  type Carried, type Sim,
} from "./engine";

// Una rampa de color lineal a trozos: paradas [posición, r, g, b] ordenadas por posición.
type ColorStop = [number, number, number, number];

// Muestrea la rampa en `at` (aclampado a los extremos) y devuelve [r, g, b].
function sampleRamp(stops: ColorStop[], at: number): [number, number, number] {
  if (at <= stops[0][0]) { const [, r, g, b] = stops[0]; return [r, g, b]; }
  const last = stops[stops.length - 1];
  if (at >= last[0]) { const [, r, g, b] = last; return [r, g, b]; }
  for (let i = 1; i < stops.length; i++) {
    const [t0, r0, g0, b0] = stops[i - 1];
    const [t1, r1, g1, b1] = stops[i];
    if (at <= t1) {
      const p = (at - t0) / (t1 - t0);
      return [Math.round(r0 + p * (r1 - r0)), Math.round(g0 + p * (g1 - g0)), Math.round(b0 + p * (b1 - b0))];
    }
  }
  const [, r, g, b] = last; return [r, g, b];
}

// Color de cuerpo negro para la tierra caliente (T en Kelvin): 600 K → #220000 … 1700 K → #FFF8E8
const THERMAL_STOPS: ColorStop[] = [
  [ 600,  34,   0,   0],
  [ 800, 102,  17,   0],
  [1000, 170,  51,   0],
  [1200, 221, 119,   0],
  [1400, 255, 187,  51],
  [1600, 255, 241, 184],
  [1700, 255, 248, 232],
];

// Grano de tierra: hash estable por celda (textura constante entre frames),
// fundido hacia el color de cuerpo negro según su exceso de K
function sandColor(x: number, y: number, excessK: number): string {
  const hv = ((x * 374761393 + y * 668265263) >>> 0) & 0xff;
  const v1 = hv % 38, v2 = (hv >> 5) % 18;
  const nr = 178 + v1, ng = 146 + Math.floor(v1 * 0.5), nb = 82 + Math.floor(v1 * 0.15) - v2;
  if (excessK <= 0) return `rgb(${nr},${ng},${nb})`;

  const T = 300 + excessK;
  const [tr, tg, tb] = sampleRamp(THERMAL_STOPS, T);
  // fundido: 0 a 600 K, 1 a 1700 K — el brillo visible empieza en rojo cereza
  const blend = Math.min(1, Math.max(0, (T - 600) / 1100));
  // ruido por grano: baja un poco la saturación (±8 % del canal térmico)
  const noise = ((hv % 17) - 8) * 0.008 * blend;
  const r = Math.round(nr + blend * (tr - nr + noise * tr));
  const g = Math.round(ng + blend * (tg - ng + noise * tg));
  const b = Math.round(nb + blend * (tb - nb + noise * tb));
  return `rgb(${Math.max(0, Math.min(255, r))},${Math.max(0, Math.min(255, g))},${Math.max(0, Math.min(255, b))})`;
}

// Azul profundo con brillo suave; funde a blanco según heat (0..1)
function waterColor(x: number, y: number, H: number, t: number, heat: number): string {
  const w = Math.floor(Math.sin(x * 0.35 + t / 500) * 4);
  const depth = Math.min(y / H, 1);
  const r = Math.max(18, 32 - Math.floor(depth * 12) + w);
  const g = Math.max(70, 105 - Math.floor(depth * 25) + w);
  const b = Math.min(255, 215 + w);
  return `rgb(${Math.round(r + heat * (255 - r))},${Math.round(g + heat * (255 - g))},${Math.round(b + heat * (255 - b))})`;
}

// Núcleo blanco-amarillo → naranja → rojo oscuro según se apaga
function fireColor(x: number, y: number, t: number, age: number): string {
  const flick = ((x * 7 + y * 11 + Math.floor(t / 50)) & 0x1f) / 31;
  const ageR = Math.min(1, age / 140) * 0.72 + flick * 0.28;
  if (ageR > 0.6) {
    const p = (ageR - 0.6) / 0.4;
    return `rgb(255,${Math.floor(140 + p * 115)},${Math.floor(p * 55)})`;
  }
  if (ageR > 0.28) {
    const p = (ageR - 0.28) / 0.32;
    return `rgb(255,${Math.floor(40 + p * 100)},0)`;
  }
  const p = ageR / 0.28;
  return `rgb(${Math.floor(120 + p * 135)},${Math.floor(p * 40)},0)`;
}

// La madera ardiendo recorre una rampa de hoguera: rojo tenue al prender, pico amarillo en
// plena combustión y descenso a rojo profundo y ceniza. La posición en la rampa es el tiempo
// desde la ignición (0 = recién prendida, 1 = a punto de desaparecer).
const BURN_STOPS: ColorStop[] = [
  [0.00, 0x8b, 0x1a, 0x00], // ignición: rojo oscuro
  [0.10, 0xff, 0x55, 0x00], // naranja oscuro
  [0.18, 0xff, 0x88, 0x00], // naranja
  [0.26, 0xff, 0xaa, 0x00], // naranja amarillo
  [0.34, 0xff, 0xbb, 0x00], // amarillo naranja
  [0.42, 0xff, 0xd0, 0x33], // pico: amarillo brillante
  [0.50, 0xff, 0x66, 0x00], // carbón con fuego
  [0.58, 0xcc, 0x22, 0x00], // rojo intenso
  [0.66, 0xaa, 0x22, 0x00], // rojo naranja oscuro
  [0.74, 0x77, 0x00, 0x00], // rojo profundo
  [0.82, 0x55, 0x00, 0x00], // rojo oscuro
  [0.88, 0x44, 0x00, 0x00], // rojo apagado
  [0.93, 0x3a, 0x16, 0x00], // marrón quemado
  [0.97, 0x33, 0x00, 0x00], // rojo muy oscuro
  [1.00, 0x2e, 0x2a, 0x28], // guiño a ceniza antes de desaparecer
];

// burnAge cuenta hacia atrás desde ~600–800 al prender (ver engine.ts); ~700 es su vida típica.
const BURN_LIFETIME = 700;

function woodColor(x: number, y: number, burnAge: number): string {
  if (burnAge > 0) {
    const hash = ((x * 1664525 + y * 1013904223) >>> 0) & 0xff;
    // tiempo desde la ignición ∈ [0,1] + ruido por celda → moteado de brasas (sampleRamp aclampa)
    const elapsed = (BURN_LIFETIME - burnAge) / BURN_LIFETIME + ((hash % 32) - 16) / 240;
    const [r, g, b] = sampleRamp(BURN_STOPS, elapsed);
    return `rgb(${r},${g},${b})`;
  }
  const grain = ((y * 4 + (x >> 3)) & 0xff) % 4;
  const h = ((x * 1664525 + y * 1013904223) >>> 0) & 0xff;
  const v = h % 20;
  const g = grain < 2 ? 10 : 0;
  return `rgb(${130 + v + g},${80 + Math.floor(v * 0.7) + g},${38 + Math.floor(v * 0.3)})`;
}

// Pinta un frame completo: cuadrícula y, si la hay, la carga de la herramienta Mover
export function render(ctx: CanvasRenderingContext2D, sim: Sim, carried: Carried[], carryPos: { x: number; y: number } | null) {
  const { W, H, grid, ages, sandHeat } = sim;
  const t = Date.now();
  ctx.clearRect(0, 0, W * CELL, H * CELL);

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const type = grid[i];
      if (type === EMPTY) continue;

      if (type === VAPOR) {
        // Blanco → gris oscuro según condensación; se dibuja como cruz mayor que la celda
        const condensation = Math.min(1, ages[i] / VAPOR_CONDENSE_MAX);
        const base = Math.floor(235 - condensation * 185);
        const v = Math.floor(((x * 13 + y * 7 + Math.floor(t / 80)) & 0x1f) / 31 * 20);
        ctx.fillStyle = `rgb(${Math.min(255, base + v)},${Math.min(255, base + 8 + v)},${Math.min(255, base + 35 + v)})`;
        const px = x * CELL, py = y * CELL, half = CELL / 2;
        const ext = Math.round(CELL * 2.2), arm = Math.max(1, Math.round(CELL * 0.75));
        ctx.fillRect(px + half - ext, py + half - arm, ext * 2, arm * 2); // horizontal
        ctx.fillRect(px + half - arm, py + half - ext, arm * 2, ext * 2); // vertical
        continue;
      }

      ctx.fillStyle =
        type === SAND ? sandColor(x, y, sandHeat[i]) :
        type === WATER ? waterColor(x, y, H, t, ages[i] > 0 ? Math.min(1, ages[i] / WATER_HEAT_MAX) : 0) :
        type === FIRE ? fireColor(x, y, t, ages[i]) :
        woodColor(x, y, ages[i]);
      ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
    }
  }

  // Overlay de celdas transportadas
  if (carried.length > 0 && carryPos) {
    ctx.globalAlpha = 0.88;
    for (const { dx, dy, type, age } of carried) {
      const cx = carryPos.x + dx, cy = carryPos.y + dy;
      if (cx < 0 || cx >= W || cy < 0 || cy >= H) continue;
      ctx.fillStyle =
        type === SAND ? sandColor(cx, cy, 0) :
        type === WATER ? waterColor(cx, cy, H, t, 0) :
        fireColor(cx, cy, t, age); // fuego; el vapor transportado también se pinta así
      ctx.fillRect(cx * CELL, cy * CELL, CELL, CELL);
    }
    ctx.globalAlpha = 1;
  }
}
