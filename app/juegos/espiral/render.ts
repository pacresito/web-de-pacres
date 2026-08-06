// Pintado del tablero del Espiral con la paleta terminal. El estado del frame lo trae
// el motor; aquí solo se dibuja.
import { PATH_CELLS, cellToPixel, type BoardState } from "./engine";

export function drawBoard(
  ctx: CanvasRenderingContext2D,
  size: number,
  path: typeof PATH_CELLS,
  origin: { x: number; y: number },
  state: BoardState,
  goalCell: { x: number; y: number },
  cell_size: number
) {
  ctx.clearRect(0, 0, size, size);
  // El fondo es el papel de la terminal y el jugador el verde de acento: los leemos de
  // los tokens (el canvas hereda los tokens del tema, en data-theme de <html>) para que viren en
  // dark — en oscuro el acento es más claro y la bola resalta. La espiral y la meta se quedan.
  const cs = getComputedStyle(ctx.canvas);
  const paper = cs.getPropertyValue("--t-paper").trim() || "#fafaf7";
  const accent = cs.getPropertyValue("--t-accent").trim() || "#00b87a";
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = "rgba(0,184,122,0.18)";
  ctx.lineWidth = cell_size - 2;
  ctx.lineCap = "square";
  ctx.lineJoin = "miter";
  ctx.beginPath();
  path.forEach((cell, i) => {
    const p = cellToPixel(cell, origin, cell_size);
    if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
  });
  ctx.stroke();

  const goal = cellToPixel(goalCell, origin, cell_size);
  ctx.beginPath();
  ctx.arc(goal.x, goal.y, Math.max(4, cell_size / 6), 0, Math.PI * 2);
  ctx.fillStyle = "#00b87a";
  ctx.shadowColor = "#00b87a";
  ctx.shadowBlur = 12;
  ctx.fill();
  ctx.shadowBlur = 0;

  if (state.gameState !== "idle") {
    ctx.beginPath();
    ctx.arc(state.pos.x, state.pos.y, Math.max(5, cell_size / 4.5), 0, Math.PI * 2);
    ctx.fillStyle = accent;
    ctx.shadowColor = "#00b87a";
    ctx.shadowBlur = 16;
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}
