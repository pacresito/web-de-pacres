// Test del reparto en tres montones — ejecutar con: npx tsx app/trucos/magia/reparto.test.ts
// No es parte del build. Verifica sin navegador lo único que no se puede
// romper: que las 21 cartas queden identificables sobre el montón.
import { reparte, anchoDeCarta, type Spot } from "./reparto";

let fails = 0;
function check(name: string, ok: boolean, detail = "") {
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? "  " + detail : ""}`);
  if (!ok) fails++;
}

// Comprobación independiente de la del módulo: en vez de rotar el punto al
// sistema de la carta, se construye el polígono de la carta y se mira si el
// punto está a la izquierda de sus cuatro lados. Si el módulo se equivoca de
// signo en un seno, esto no se equivoca igual.
type Pt = [number, number];

function poligono(s: Spot, cardW: number, cardH: number): Pt[] {
  const cx = s.x + cardW / 2, cy = s.y + cardH / 2;
  const a = (s.r * Math.PI) / 180, cos = Math.cos(a), sin = Math.sin(a);
  const w = cardW / 2, h = cardH / 2;
  return ([[-w, -h], [w, -h], [w, h], [-w, h]] as Pt[])
    .map(([x, y]) => [cx + x * cos - y * sin, cy + x * sin + y * cos] as Pt);
}

function dentro([px, py]: Pt, poli: Pt[]): boolean {
  return poli.every((p, i) => {
    const q = poli[(i + 1) % poli.length];
    return (q[0] - p[0]) * (py - p[1]) - (q[1] - p[1]) * (px - p[0]) >= -0.5;
  });
}

// La banda del CardFace, en unidades del viewBox 100×142. Aquí se muestrea
// entera (una rejilla), no solo sus cuatro esquinas.
function puntosBanda(s: Spot, cardW: number, cardH: number): Pt[] {
  const cx = s.x + cardW / 2, cy = s.y + cardH / 2;
  const a = (s.r * Math.PI) / 180, cos = Math.cos(a), sin = Math.sin(a);
  const pts: Pt[] = [];
  for (let vx = 30; vx <= 72; vx += 6) {
    for (let vy = 18; vy <= 43; vy += 5) {
      const dx = (vx * cardW) / 100 - cardW / 2, dy = (vy * cardH) / 142 - cardH / 2;
      pts.push([cx + dx * cos - dy * sin, cy + dx * sin + dy * cos]);
    }
  }
  return pts;
}

// 1. Las 21 cartas legibles, en muchos repartos y a los anchos reales
for (const cardW of [40, 54, 62, 68]) {
  let tapadas = 0, peorAlto = 0, ancho = 0;
  for (let n = 0; n < 400; n++) {
    const { spots, cardH, alto, ancho: w } = reparte(cardW);
    ancho = w;
    peorAlto = Math.max(peorAlto, alto);
    spots.forEach((s, i) => {
      const pts = puntosBanda(s, cardW, cardH);
      const posteriores = spots.filter((_, j) => j > i && j % 3 === i % 3);
      if (posteriores.some(o => pts.some(p => dentro(p, poligono(o, cardW, cardH))))) tapadas++;
    });
  }
  check(`carta ${cardW} px: ninguna banda tapada en 400 repartos`, tapadas === 0,
    `tapadas=${tapadas} · montón ${ancho}×${peorAlto} px`);
}

// 2. Cabe en el ancho del viewport, del móvil estrecho al tope de 480
for (const vw of [320, 360, 390, 412, 480, 1280]) {
  const cardW = anchoDeCarta(vw);
  const { ancho } = reparte(cardW);
  const cabe = ancho <= Math.min(vw, 480) - 32;
  check(`viewport ${vw}: carta ${cardW} px y montones de ${ancho} px`, cabe);
}

// 3. Reparto en orden: carta i al montón i % 3, y cada montón cae hacia abajo
{
  const { spots } = reparte(64);
  const bienColumnadas = spots.every((s, i) => {
    const anterior = spots[i - 3];
    return i < 3 || (s.y > anterior.y && Math.abs(s.x - anterior.x) < 24);
  });
  check("cada montón cae hacia abajo y no se desvía de su columna", bienColumnadas);
}

// 4. Aleatorio de verdad: dos repartos no coinciden, pero con rand fijo sí
{
  const a = reparte(64).spots, b = reparte(64).spots;
  const distintos = a.some((s, i) => s.x !== b[i].x || s.y !== b[i].y || s.r !== b[i].r);
  const fijo = () => 0.5;
  const c = reparte(64, fijo).spots, d = reparte(64, fijo).spots;
  const iguales = c.every((s, i) => s.x === d[i].x && s.y === d[i].y && s.r === d[i].r);
  check("dos repartos son distintos; con rand fijo son idénticos", distintos && iguales);
}

console.log(fails ? `\n${fails} fallo(s)` : "\nTodo correcto");
process.exit(fails ? 1 : 0);
