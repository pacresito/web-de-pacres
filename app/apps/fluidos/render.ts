// Pintado de Fluidos en canvas: paleta por material + overlay de celdas
// transportadas por la herramienta Mover. Sin React ni estado propio.

import {
  CELL, EMPTY, SAND, WATER, FIRE, VAPOR,
  WATER_HEAT_MAX, VAPOR_CONDENSE_MAX,
  type Carried, type Sim,
} from "./engine";

// Rampa lineal a trozos de color de cuerpo negro para la tierra (T en Kelvin absolutos)
// Paradas: 600 K → #220000 … 1700 K → #FFF8E8
const THERMAL_STOPS: [number, number, number, number][] = [
  [ 600,  34,   0,   0],
  [ 800, 102,  17,   0],
  [1000, 170,  51,   0],
  [1200, 221, 119,   0],
  [1400, 255, 187,  51],
  [1600, 255, 241, 184],
  [1700, 255, 248, 232],
];

function thermalRGB(T: number): [number, number, number] {
  if (T <= THERMAL_STOPS[0][0]) return [THERMAL_STOPS[0][1], THERMAL_STOPS[0][2], THERMAL_STOPS[0][3]];
  const last = THERMAL_STOPS[THERMAL_STOPS.length - 1];
  if (T >= last[0]) return [last[1], last[2], last[3]];
  for (let k = 0; k < THERMAL_STOPS.length - 1; k++) {
    const [t0, r0, g0, b0] = THERMAL_STOPS[k];
    const [t1, r1, g1, b1] = THERMAL_STOPS[k + 1];
    if (T >= t0 && T <= t1) {
      const p = (T - t0) / (t1 - t0);
      return [Math.round(r0 + p * (r1 - r0)), Math.round(g0 + p * (g1 - g0)), Math.round(b0 + p * (b1 - b0))];
    }
  }
  return [last[1], last[2], last[3]];
}

// Grano de tierra: hash estable por celda (textura constante entre frames),
// fundido hacia el color de cuerpo negro según su exceso de K
function sandColor(x: number, y: number, excessK: number): string {
  const hv = ((x * 374761393 + y * 668265263) >>> 0) & 0xff;
  const v1 = hv % 38, v2 = (hv >> 5) % 18;
  const nr = 178 + v1, ng = 146 + Math.floor(v1 * 0.5), nb = 82 + Math.floor(v1 * 0.15) - v2;
  if (excessK <= 0) return `rgb(${nr},${ng},${nb})`;

  const T = 300 + excessK;
  const [tr, tg, tb] = thermalRGB(T);
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

// Veta de madera con hash por celda; al arder pasa por naranja caliente → rojo →
// brasa → ceniza según se consume (burnAge baja de ~700 a 0)
function woodColor(x: number, y: number, burnAge: number): string {
  if (burnAge > 0) {
    const h = ((x * 1664525 + y * 1013904223) >>> 0) & 0xff;
    const p = Math.min(1, burnAge / 700) * 0.92 + (h % 24) / 300; // +textura por celda
    if (p > 0.6) {              // recién prendida: naranja caliente
      const k = (p - 0.6) / 0.4;
      return `rgb(${205 + Math.floor(k * 40)},${70 + Math.floor(k * 70)},${15 + Math.floor(k * 35)})`;
    }
    if (p > 0.25) {             // ardiendo: naranja → rojo
      const k = (p - 0.25) / 0.35;
      return `rgb(${150 + Math.floor(k * 55)},${30 + Math.floor(k * 40)},${10 + Math.floor(k * 5)})`;
    }
    const k = p / 0.25;         // brasa → ceniza
    return `rgb(${48 + Math.floor(k * 102)},${38 - Math.floor(k * 8)},${34 - Math.floor(k * 24)})`;
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
