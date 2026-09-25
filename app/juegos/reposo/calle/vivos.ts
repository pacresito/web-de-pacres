// Lo que se mueve sin cambiar de nivel —el árbol con el viento, la ropa tendida, la farola que
// parpadea— y el macetero, que es la copa del árbol en pequeño.
import { azar } from "../escena";
import type { Caja, Estacion } from "../render";
import { apoyo, disco, linea, px, trama, type Ctx, type Mano, type Pincel, type Rampa, type Vivo } from "./paleta";

// ── El árbol ────────────────────────────────────────────────────────────────

/** El color de la copa según la estación. En otoño, además, motas rojizas por encima. */
function follaje(m: Mano, est: Estacion): Rampa {
  if (est === "primavera") return m.tono({ l: 0.56, c: 0.14, h: 135 });
  if (est === "otoño") return m.tono({ l: 0.58, c: 0.12, h: 68 });
  return m.P.hoja;
}

/** El tronco desde el suelo hasta `arranque`, ensanchándose al bajar. Devuelve su grosor. */
function fuste(ctx: Ctx, m: Mano, b: Caja, cx: number, arranque: number): number {
  const tronco = Math.max(2, Math.round(b.w * 0.09)), pie = b.y + b.h, lado = m.luzDesde;
  for (let j = arranque; j < pie; j++) {
    const ancho = tronco + Math.floor((j - arranque) / 18) + (j > pie - 3 ? 2 : 0);
    const x0 = cx - Math.floor(ancho / 2);
    px(ctx, x0, j, ancho, 1, m.P.madera[2]);
    px(ctx, lado > 0 ? x0 : x0 + ancho - 1, j, 1, 1, m.P.madera[3]);
    px(ctx, lado > 0 ? x0 + ancho - 1 : x0, j, 1, 1, m.P.madera[1]);
    if ((j * 7) % 11 === 0) px(ctx, x0 + 1, j, 1, 2, m.P.madera[1]);              // corteza
  }
  return tronco;
}

/** Las luces de Navidad, que de noche parpadean. `k` las distingue. */
function bombilla(ctx: Ctx, m: Mano, x: number, y: number, k: number, vivo?: Vivo) {
  const color = [m.P.tela, m.P.luz, m.P.hoja, m.tono({ l: 0.6, c: 0.12, h: 250 })][k % 4];
  const apagada = m.noche && vivo && Math.sin(vivo.t * 1.7 + k * 2.3) < -0.6;
  px(ctx, x, y, 1, 1, m.noche && !apagada ? color[5] : color[3]);
}

/** El árbol sin hoja: las ramas se abren en horquillas, cada vez más finas, hasta las
 *  puntas. Por Navidad, con luces. */
function ramaje(ctx: Ctx, m: Mano, cx: number, arranque: number, r: number, vivo?: Vivo) {
  const puntas: [number, number][] = [];
  const rama = (x: number, y: number, ang: number, largo: number, prof: number, k: number) => {
    const x1 = x + Math.cos(ang) * largo, y1 = y + Math.sin(ang) * largo;
    linea(ctx, x, y, x1, y1, prof >= 2 ? m.P.madera[2] : m.P.madera[1], prof >= 3 ? 2 : 1);
    if (prof === 0) { puntas.push([Math.round(x1), Math.round(y1)]); return; }
    const abre = 0.28 + azar(k * 7 + 1) * 0.3;
    rama(x1, y1, ang - abre, largo * 0.74, prof - 1, k * 2 + 1);
    rama(x1, y1, ang + abre * 0.8, largo * 0.7, prof - 1, k * 2 + 2);
  };
  [-2.35, -1.95, -1.57, -1.2, -0.8].forEach((ang, i) =>
    rama(cx + (i - 2), arranque, ang + (azar(i + 90) - 0.5) * 0.2, r * 0.42, 4, i + 1));
  if (m.cal.navidad) puntas.forEach(([x, y], i) => i % 2 === 0 && bombilla(ctx, m, x, y, i, vivo));
}

/** Recién podado: el tronco y los muñones, y en cuanto no es invierno, los brotes. */
function podado(ctx: Ctx, m: Mano, b: Caja, est: Estacion, vivo?: Vivo) {
  const cx = b.x + Math.round(b.w / 2), arranque = b.y + Math.round(b.h * 0.5);
  const tronco = fuste(ctx, m, b, cx, arranque);
  const brote = follaje(m, est);
  [-2.4, -1.95, -1.2, -0.75].forEach((ang, i) => {
    const largo = b.w * (0.14 + azar(i + 70) * 0.05);
    const x0 = cx + Math.round((i - 1.5) * (tronco / 3));
    const x1 = Math.round(x0 + Math.cos(ang) * largo), y1 = Math.round(arranque + Math.sin(ang) * largo);
    linea(ctx, x0, arranque, x1, y1, m.P.madera[2], 2);
    disco(ctx, x1, y1, 2, m.P.madera[2]);                                             // el muñón
    px(ctx, x1 - 1, y1 - 2, 2, 1, m.P.madera[3]);
    if (est === "invierno") { if (m.cal.navidad) bombilla(ctx, m, x1, y1 - 3, i, vivo); return; }
    for (let k = 0; k < 6; k++) {                                                     // las varas nuevas
      const a = -Math.PI / 2 + (azar(i * 9 + k) - 0.5) * 1.3, l = 5 + Math.round(azar(i * 9 + k + 4) * 7);
      const xt = x1 + Math.cos(a) * l, yt = y1 - 2 + Math.sin(a) * l;
      linea(ctx, x1, y1 - 2, xt, yt, brote[2]);
      for (let h = 2; h < l; h += 3) px(ctx, Math.round(x1 + Math.cos(a) * h) + (h % 2 ? 1 : -1), Math.round(y1 - 2 + Math.sin(a) * h), 1, 1, brote[4]);
    }
  });
  apoyo(ctx, { ...b, x: cx - tronco * 2, w: tronco * 4 }, m.F.tinta);
  if (est === "otoño") hojarasca(ctx, m, cx, b.y + b.h, b.w * 0.3);
}

/** Las hojas caídas en la acera, al pie del árbol. */
function hojarasca(ctx: Ctx, m: Mano, cx: number, pie: number, r: number) {
  const colores = [m.P.ladrillo[4], m.tono({ l: 0.62, c: 0.12, h: 72 })[3], m.P.ladrillo[3]];
  for (let k = 0; k < 26; k++) {
    const x = Math.round(cx + (azar(k + 500) - 0.5) * r * 2.6), y = pie - 2 + Math.round(azar(k + 520) * 4);
    px(ctx, x, y, 2, 1, colores[k % 3]);
  }
}

/** La copa sobre su tronco, del tamaño que diga `v` (0..1). En invierno, solo las ramas. */
function planta(ctx: Ctx, m: Mano, b: Caja, v: number, est: Estacion, vivo?: Vivo) {
  const cx = b.x + Math.round(b.w / 2), cy = b.y + Math.round(b.h * 0.42), pie = b.y + b.h;
  const r = Math.max(3, Math.round((b.w / 2) * (0.45 + 0.55 * v)));
  const lado = m.luzDesde;
  const arranque = cy + Math.round(r * 0.35);
  const tronco = fuste(ctx, m, b, cx, arranque);
  if (est === "invierno") {
    ramaje(ctx, m, cx, arranque, r, vivo);
    apoyo(ctx, { ...b, x: cx - tronco * 2, w: tronco * 4 }, m.F.tinta);
    return;
  }
  for (const [dx, dy] of [[-0.5, -0.15], [0.45, -0.3], [0.05, -0.5]])
    for (let s = 0; s <= 10; s++) {
      const t = s / 10;
      px(ctx, Math.round(cx + dx * r * t), Math.round(arranque + (dy * r - r * 0.35) * t), t < 0.5 ? 2 : 1, 2, m.P.madera[2]);
    }
  apoyo(ctx, { ...b, x: cx - tronco * 2, w: tronco * 4 }, m.F.tinta);
  // El viento mece la copa, cada racimo con su fase: en bloque parece una pegatina.
  const mecer = (i: number, my: number) => vivo
    ? Math.round(vivo.viento * 2.2 * Math.max(0.2, (cy + r * 0.3 - my) / r) * Math.sin(vivo.t * 1.3 + i * 1.7) + vivo.viento * 0.8)
    : 0;
  // La copa se pinta por capas —sombra, medio tono, luz— y no racimo a racimo, para que se
  // lea como una masa y no como un montón de bolas.
  const racimos: [number, number, number][] = [
    [0, -0.3, 0.6], [-0.48, 0, 0.5], [0.48, -0.05, 0.5], [-0.25, 0.32, 0.46], [0.3, 0.3, 0.46],
    [-0.05, -0.62, 0.42], [0.5, -0.45, 0.36], [-0.52, -0.42, 0.36], [0.05, 0.1, 0.5],
  ];
  const pos = racimos.map(([dx, dy, dr], i) => {
    const my = cy + Math.round(dy * r * 0.9);
    return { x: cx + Math.round(dx * r) + mecer(i, my), y: my, r: Math.max(2, Math.round(dr * r)) };
  });
  const H = follaje(m, est);
  pos.forEach((q) => disco(ctx, q.x, q.y, q.r + 1, H[1]));
  // El borde deshilachado: hojas sueltas alrededor de cada racimo.
  pos.forEach((q, i) => {
    for (let k = 0; k < 10; k++) {
      const a = azar(i * 40 + k) * Math.PI * 2;
      px(ctx, Math.round(q.x + Math.cos(a) * (q.r + 2)), Math.round(q.y + Math.sin(a) * (q.r + 2)), 1, 1, H[azar(i * 40 + k + 7) > 0.5 ? 1 : 2]);
    }
  });
  for (const q of pos) disco(ctx, q.x + lado, q.y - 1, Math.max(1, q.r - 1), H[2]);
  for (const q of pos) if (q.y < cy + r * 0.2) disco(ctx, q.x + lado * Math.round(q.r * 0.35), q.y - Math.round(q.r * 0.35), Math.max(1, Math.round(q.r * 0.5)), H[3]);
  pos.forEach((q, i) => {                                                           // brillos sueltos
    if (q.y > cy) return;
    for (let k = 0; k < 4; k++)
      px(ctx, q.x + lado * Math.round(azar(i * 9 + k) * q.r * 0.7), q.y - Math.round(azar(i * 9 + k + 3) * q.r * 0.7), 1, 1, H[4]);
  });
  // Dos huecos oscuros: sin ellos la copa es una piedra.
  disco(ctx, cx + Math.round(r * 0.35), cy + Math.round(r * 0.3), Math.max(1, Math.round(r * 0.1)), H[0]);
  disco(ctx, cx - Math.round(r * 0.45), cy - Math.round(r * 0.05), Math.max(1, Math.round(r * 0.08)), H[0]);
  if (est === "primavera" || est === "otoño") {                                     // en flor, o virando al rojo
    const motas = est === "primavera"
      ? [m.tono({ l: 0.68, c: 0.17, h: 350 })[3], m.tono({ l: 0.68, c: 0.17, h: 350 })[4]]
      : [m.tono({ l: 0.5, c: 0.14, h: 38 })[2], m.tono({ l: 0.5, c: 0.14, h: 38 })[3]];
    pos.forEach((q, i) => {
      for (let k = 0; k < 7; k++) {
        const a = azar(i * 50 + k + 300) * Math.PI * 2, d = azar(i * 50 + k + 301) * q.r;
        px(ctx, Math.round(q.x + Math.cos(a) * d), Math.round(q.y + Math.sin(a) * d), 1, 1, motas[k % 3 ? 0 : 1]);
      }
    });
  }
  if (est === "otoño") hojarasca(ctx, m, cx, pie, r);
}

/** El árbol de la acera: su nivel 0 es el recién podado, y a partir de ahí crece. La estación
 *  le cambia el color, y en invierno lo deja en las ramas. */
export const arbol: Pincel = (ctx, m, b, p, n, vivo) => {
  if (n === 0) return podado(ctx, m, b, m.cal.estacion, vivo);
  planta(ctx, m, b, (n - 1) / (p.variantes - 2), m.cal.estacion, vivo);
};

/** El macetero: la misma planta, siempre de verano, en su jardinera. */
export const macetero: Pincel = (ctx, m, b, p, n) => {
  planta(ctx, m, b, Math.min(n, p.variantes - 1) / (p.variantes - 1), "verano");
  const y = b.y + Math.round(b.h * 0.5);
  for (let j = 0; j < b.h - (y - b.y); j++)
    px(ctx, b.x + 2 + Math.floor(j / 4), y + j, Math.max(2, b.w - 4 - Math.floor(j / 2)), 1, m.P.ladrillo[3]);
  px(ctx, b.x, y - 3, b.w, 4, m.P.ladrillo[4]);
  px(ctx, b.x, y - 3, b.w, 1, m.P.ladrillo[5]);
};

// ── La farola y la ropa ─────────────────────────────────────────────────────

/** La farola, un modelo por nivel: brazo curvo, fernandina o LED. Las tres tienen la cabeza en
 *  (cx + 4 … cx + 18, b.y), donde se posa el pájaro. */
export const farola: Pincel = (ctx, m, b, p, n, vivo) => {
  const v = n % p.variantes;
  const cx = b.x + Math.round(b.w / 2);
  const color = [m.F.tinta, m.tono({ l: 0.3, c: 0.05, h: 160 })[1], m.P.metal[3]][v];
  const brillo = [m.P.metal[3], m.tono({ l: 0.3, c: 0.05, h: 160 })[3], m.P.metal[5]][v];
  let foco: { x: number; y: number };
  if (v === 0) {                                  // brazo curvo con la cabeza de chapa
    px(ctx, cx - 2, b.y + 10, 4, b.h - 10, color);
    px(ctx, cx - 2, b.y + 10, 1, b.h - 10, brillo);
    for (let i = 0; i < 12; i++) px(ctx, cx - 2 + Math.round(i * 0.5), b.y + 10 - i, 3, 2, color);
    px(ctx, cx + 4, b.y, 14, 5, color);
    foco = { x: cx + 11, y: b.y + 5 };
  } else if (v === 1) {                           // fernandina: fuste con anillos, voluta y farol
    px(ctx, cx - 2, b.y + 8, 3, b.h - 8, color);
    px(ctx, cx - 2, b.y + 8, 1, b.h - 8, brillo);
    for (const k of [0.25, 0.55]) px(ctx, cx - 3, b.y + Math.round(b.h * k), 5, 2, color);
    px(ctx, cx - 4, b.y + b.h - 10, 7, 10, color);                            // la basa
    px(ctx, cx - 1, b.y + 8, 13, 2, color);                                   // el brazo recto
    for (let i = 0; i < 5; i++) px(ctx, cx + 1 + i, b.y + 10 + Math.round(Math.sin(i) * 1.5), 1, 1, color);   // la voluta
    px(ctx, cx + 8, b.y, 9, 2, color);                                        // el sombrerete
    px(ctx, cx + 9, b.y + 2, 7, 8, color);                                    // el farol
    px(ctx, cx + 10, b.y + 3, 5, 6, m.noche ? m.P.luz[5] : m.P.metal[4]);
    px(ctx, cx + 12, b.y + 3, 1, 6, color);
    px(ctx, cx + 10, b.y + 10, 5, 1, color);
    foco = { x: cx + 12, y: b.y + 10 };
  } else {                                        // de LED: fuste recto y cabeza plana
    px(ctx, cx - 1, b.y + 2, 3, b.h - 2, color);
    px(ctx, cx - 1, b.y + 2, 1, b.h - 2, brillo);
    px(ctx, cx - 3, b.y + b.h - 4, 7, 4, m.P.metal[2]);
    px(ctx, cx + 1, b.y + 1, 4, 1, color);
    px(ctx, cx + 3, b.y, 17, 3, m.P.metal[2]);
    px(ctx, cx + 3, b.y, 17, 1, brillo);
    px(ctx, cx + 5, b.y + 3, 13, 1, m.noche ? m.P.metal[5] : m.P.metal[4]);
    foco = { x: cx + 11, y: b.y + 4 };
  }
  if (!m.noche) return;
  const luz = vivo?.luz ?? 1;
  if (v === 0) px(ctx, cx + 5, b.y + 5, 12, 2, luz > 0.5 ? m.P.luz[5] : m.P.metal[2]);
  if (luz <= 0) return;
  // El cono, con el borde deshilachado: uniforme parece una chapa. El LED alumbra más blanco.
  const tinte = v === 2 ? m.P.metal[5] : m.P.luz[5];
  const bajo = m.suelo + 12, largo = bajo - foco.y;
  for (let j = 0; j < largo; j++) {
    const t = j / largo;
    const ancho = 8 + Math.round(j * 0.9);
    for (let i = 0; i < ancho; i++) {
      const lado = Math.abs(i / (ancho - 1) - 0.5) * 2;
      const x = foco.x - Math.round(ancho / 2) + i, y = foco.y + j;
      if (trama(x, y) < 0.42 * luz * (1 - t) * (1 - lado ** 2)) px(ctx, x, y, 1, 1, tinte);
    }
  }
};

/** La ropa tendida: una prenda más por nivel. */
export const ropa: Pincel = (ctx, m, b, p, n, vivo) => {
  // Con viento, el cable bota y cada prenda se aparta más cuanto más abajo.
  const bote = vivo ? 1 + 0.35 * vivo.viento * Math.sin(vivo.t * 1.1) : 1;
  const flecha = (x: number) => Math.round(2 * bote * Math.sin((x / b.w) * Math.PI));
  for (let x = 0; x < b.w; x++) px(ctx, b.x + x, b.y + flecha(x), 1, 1, m.F.tinta);
  const cuantas = 1 + (n % p.variantes);
  const paso = (b.w - 8) / p.variantes;
  for (let i = 0; i < cuantas; i++) {
    const x = b.x + 3 + Math.round(i * paso);
    const cuelga = b.y + flecha(x - b.x);
    const alto = Math.max(6, Math.round(b.h * 0.42) + ((i + n) % 3) * 4);
    const ancho = Math.max(4, Math.round(paso * 0.8));
    const R = [m.P.tela, m.P.metal, m.P.hoja, m.P.luz][(i + n) % 4];
    const vuelo = vivo
      ? vivo.viento * (2.2 + 1.6 * Math.sin(vivo.t * (1.5 + 0.2 * i) + i * 1.3)) + 0.7 * Math.sin(vivo.t * 0.7 + i)
      : 0;
    px(ctx, x + 3, cuelga, 1, 2, m.F.tinta);
    for (let j = 0; j <= alto; j++) {
      const dx = Math.round(vuelo * (j / alto) ** 1.3);
      if (j === alto) { px(ctx, x + dx, cuelga + 2 + j, ancho, 1, R[0]); break; }
      px(ctx, x + dx, cuelga + 2 + j, ancho, 1, R[3]);
      px(ctx, x + dx, cuelga + 2 + j, 1, 1, R[4]);
      px(ctx, x + dx + ancho - 1, cuelga + 2 + j, 1, 1, R[1]);
    }
  }
};
