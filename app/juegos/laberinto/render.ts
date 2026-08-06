// Dibujo del tablero del Laberinto que no cambia dentro de una partida. El resto del
// pintado (bola, estela, meta, overlays) vive en page.tsx, que es quien tiene el estado
// del frame.
import { BOARD_W, BOARD_H, WALL_W, type Seg } from "./engine";

/** Pre-renderiza las capas estáticas del laberinto (sombras + muros + highlights) a
 *  un canvas offscreen. Son fijas dentro de un laberinto; dibujarlas cada frame era
 *  el grueso del coste de draw(). Replica exactamente el dibujo directo: el alpha de
 *  la sombra queda incrustado en la capa y al pegarla (source-over) da el mismo color. */
export function buildStaticLayer(segs: Seg[]): HTMLCanvasElement {
  const layer = document.createElement("canvas");
  layer.width = BOARD_W;
  layer.height = BOARD_H;
  const lctx = layer.getContext("2d")!;

  // Sombras de muro — sobre un offscreen propio para no acumular alpha en esquinas.
  const sc = document.createElement("canvas");
  sc.width = BOARD_W;
  sc.height = BOARD_H;
  const sctx = sc.getContext("2d")!;
  sctx.strokeStyle = "#0f172a";
  sctx.lineWidth = WALL_W + 1;
  sctx.lineCap = "square";
  sctx.lineJoin = "miter";
  sctx.beginPath();
  for (const seg of segs) {
    sctx.moveTo(seg.x1 + 3.5, seg.y1 + 4.5);
    sctx.lineTo(seg.x2 + 3.5, seg.y2 + 4.5);
  }
  sctx.stroke();
  lctx.save();
  lctx.globalAlpha = 0.22;
  lctx.drawImage(sc, 0, 0);
  lctx.restore();

  // Muros con gradiente por segmento.
  lctx.save();
  lctx.lineWidth = WALL_W;
  lctx.lineCap = "square";
  const halfW = WALL_W / 2;
  for (const seg of segs) {
    const isHoriz = Math.abs(seg.y2 - seg.y1) < 0.001;
    const grad = isHoriz
      ? lctx.createLinearGradient(0, seg.y1 - halfW, 0, seg.y1 + halfW)
      : lctx.createLinearGradient(seg.x1 - halfW, 0, seg.x1 + halfW, 0);
    grad.addColorStop(0, "#a8e6d0");
    grad.addColorStop(0.45, "#00b87a");
    grad.addColorStop(1, "#004433");
    lctx.strokeStyle = grad;
    lctx.beginPath();
    lctx.moveTo(seg.x1, seg.y1);
    lctx.lineTo(seg.x2, seg.y2);
    lctx.stroke();
  }
  // Highlights — fillRect evita solapamiento en esquinas.
  lctx.fillStyle = "rgba(255,255,255,0.55)";
  for (const seg of segs) {
    const isHoriz = Math.abs(seg.y2 - seg.y1) < 0.001;
    if (isHoriz) {
      lctx.fillRect(seg.x1, seg.y1 - halfW + 0.5, seg.x2 - seg.x1, 1);
    } else {
      lctx.fillRect(seg.x1 - halfW + 0.5, seg.y1, 1, seg.y2 - seg.y1);
    }
  }
  lctx.restore();

  return layer;
}
