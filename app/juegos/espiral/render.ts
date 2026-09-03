// Pintado del tablero del Espiral con la paleta terminal. El estado del frame lo trae
// el motor; aquí solo se dibuja.
//
// El surco (el canal excavado con su degradado) es fijo dentro de una partida, así que
// se pre-renderiza a un canvas offscreen y cada frame solo se pega: dibujarlo son cuatro
// pasadas sobre 90 segmentos y era el grueso del coste. Se reconstruye al cambiar el
// tamaño o el tema, que es lo único que lo altera — `surcoKey` da la clave.
import { PATH_CELLS, cellToPixel, type BoardState } from "./engine";

type Pt = { x: number; y: number };

export interface Tokens {
  paper: string; paper2: string; accent: string; accent2: string;
  soft: string; sombra: string; luz: string;
}

const DEAD = "#cc3333";

/** Lee la paleta del canvas. Hereda los tokens del tema (data-theme en <html>), así que
 *  el dibujo vira solo en oscuro sin que nadie le pase el tema. */
export function leerTokens(canvas: HTMLCanvasElement): Tokens {
  const cs = getComputedStyle(canvas);
  const v = (n: string, fb: string) => cs.getPropertyValue(n).trim() || fb;
  return {
    paper:  v("--t-paper", "#fafaf7"),
    paper2: v("--t-paper2", "#f4f1ea"),
    accent: v("--t-accent", "#00b87a"),
    accent2: v("--t-accent2", "#009764"),
    soft:   v("--t-accent-soft", "#d4f5e6"),
    sombra: v("--t-surco-sombra", "#ccc6b6"),
    luz:    v("--t-surco-luz", "#ffffff"),
  };
}

/** Clave de invalidación de la capa del surco: cambia con el tamaño, la densidad y el tema. */
export function surcoKey(size: number, dpr: number, C: Tokens) { return `${size}|${dpr}|${C.paper}`; }

/* --- geometría derivada del trazado del motor --- */

/** Los 91 puntos del trazado van de celda en celda; los tramos rectos son 18. Se
 *  recuperan colapsando los colineales: el degradado colorea tramo a tramo, no punto a
 *  punto, y así los escalones de color caen justo en los giros. */
function tramosDe(pts: Pt[]) {
  const tramos: { a: Pt; b: Pt; tm: number }[] = [];
  let ini = 0;
  for (let i = 1; i <= pts.length - 1; i++) {
    const finTramo =
      i === pts.length - 1 ||
      (pts[i].x - pts[ini].x) * (pts[i + 1].y - pts[i].y) !==
      (pts[i].y - pts[ini].y) * (pts[i + 1].x - pts[i].x);
    if (finTramo) {
      tramos.push({ a: pts[ini], b: pts[i], tm: (ini + i) / 2 / (pts.length - 1) });
      ini = i;
    }
  }
  return tramos;
}

function pixeles(path: typeof PATH_CELLS, origin: Pt, cell: number): Pt[] {
  return path.map(c => cellToPixel(c, origin, cell));
}

/* --- color --- */

function mezcla(a: string, b: string, t: number) {
  const v = (h: string, i: number) => parseInt(h.slice(i, i + 2), 16);
  return "#" + [1, 3, 5].map(i => {
    const n = Math.round(v(a, i) + (v(b, i) - v(a, i)) * t);
    return Math.max(0, Math.min(255, n)).toString(16).padStart(2, "0");
  }).join("");
}

function conAlfa(hex: string, a: number) {
  const v = (i: number) => parseInt(hex.slice(i, i + 2), 16);
  return `rgba(${v(1)},${v(3)},${v(5)},${a})`;
}

function camino(ctx: CanvasRenderingContext2D, pts: Pt[], dx = 0, dy = 0) {
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x + dx, p.y + dy) : ctx.moveTo(p.x + dx, p.y + dy)));
}

function halo(ctx: CanvasRenderingContext2D, p: Pt, r: number, color: string) {
  const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
  g.addColorStop(0, conAlfa(color, 0.55));
  g.addColorStop(0.45, conAlfa(color, 0.18));
  g.addColorStop(1, conAlfa(color, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
  ctx.fill();
}

/* --- capa estática: papel + canal excavado + degradado + meta --- */

export function buildSurcoLayer(
  size: number,
  dpr: number,
  path: typeof PATH_CELLS,
  origin: Pt,
  cell: number,
  C: Tokens
): HTMLCanvasElement {
  // La capa va a la misma densidad que el canvas al que se pega: creada a tamaño lógico se
  // pinta bien y luego se estira al doble, que es borrosidad sin error que la delate.
  const layer = document.createElement("canvas");
  layer.width = Math.round(size * dpr);
  layer.height = Math.round(size * dpr);
  const ctx = layer.getContext("2d")!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const pts = pixeles(path, origin, cell);

  ctx.fillStyle = C.paper;
  ctx.fillRect(0, 0, size, size);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  // Bisel: copia en sombra hacia arriba-izquierda y copia iluminada hacia abajo-derecha.
  ctx.globalAlpha = 0.85;
  ctx.strokeStyle = C.sombra;
  ctx.lineWidth = cell * 0.72;
  camino(ctx, pts, -cell * 0.05, -cell * 0.05);
  ctx.stroke();
  ctx.globalAlpha = 0.8;
  ctx.strokeStyle = C.luz;
  camino(ctx, pts, cell * 0.06, cell * 0.06);
  ctx.stroke();

  // Fondo del canal. Más estrecho que la celda (0.64) para que las vueltas vecinas no se
  // toquen: a grosor de celda entero la espiral se lee como una mancha.
  ctx.globalAlpha = 1;
  ctx.strokeStyle = C.paper2;
  ctx.lineWidth = cell * 0.64;
  camino(ctx, pts);
  ctx.stroke();

  // Degradado de recorrido: sigue el orden del trazado, así que cada tablero arranca claro
  // donde empieza su bola y se oscurece hacia su meta. Se queda a mitad de camino del verde
  // profundo (FONDO_MAX) porque la bola es del mismo verde: llegando al final, la bola se
  // pierde dentro del canal justo en el tramo que más importa.
  const FONDO_MAX = 0.5;
  ctx.lineWidth = cell * 0.62;
  for (const t of tramosDe(pts)) {
    ctx.strokeStyle = mezcla(C.soft, C.accent2, Math.pow(t.tm, 0.85) * FONDO_MAX);
    ctx.beginPath();
    ctx.moveTo(t.a.x, t.a.y);
    ctx.lineTo(t.b.x, t.b.y);
    ctx.stroke();
  }

  return layer;
}

/* --- frame --- */

export function drawBoard(
  ctx: CanvasRenderingContext2D,
  size: number,
  origin: Pt,
  state: BoardState,
  goalCell: { x: number; y: number },
  cell_size: number,
  surco: HTMLCanvasElement,
  C: Tokens
) {
  const cell = cell_size;
  ctx.clearRect(0, 0, size, size);
  ctx.drawImage(surco, 0, 0, size, size);

  const muerto = state.gameState === "dead";
  const col = muerto ? DEAD : C.accent;

  // Por donde pasó la bola: derrame ancho y tenue + núcleo estrecho y sólido.
  if (state.trail.length > 1) {
    ctx.save();
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    camino(ctx, state.trail);
    ctx.strokeStyle = conAlfa(col, 0.14);
    ctx.lineWidth = cell * 0.5;
    ctx.stroke();
    ctx.strokeStyle = conAlfa(col, 0.8);
    ctx.lineWidth = cell * 0.3;
    ctx.stroke();
    ctx.restore();
  }

  // Meta: va sobre el recorrido para que no la tape al completarse.
  const meta = cellToPixel(goalCell, origin, cell);
  ctx.save();
  halo(ctx, meta, cell * 1.15, C.accent);
  ctx.fillStyle = C.accent;
  ctx.beginPath();
  ctx.arc(meta.x, meta.y, cell * 0.26, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  if (state.gameState !== "idle") {
    ctx.save();
    halo(ctx, state.pos, cell * 0.85, col);
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(state.pos.x, state.pos.y, cell * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
