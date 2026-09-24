// El gato, el perro y los pájaros: dibujados con primitivas, como el resto de la calle, para
// que cada postura salga de unos pocos números —la cola, la cabeza, la zancada— y no de un
// inventario de sprites.
//
// **El contorno es lo que los separa del fondo.** Todo bicho se pinta dos veces: primero cada
// forma en tinta desplazada un píxel a los cuatro lados, después en su color. A esta escala un
// gato sin contorno es una mancha naranja sobre una fachada naranja.
import { px, type Ctx } from "./paleta";
import type { Mano } from "./pincel";

const R = Math.round;

type Forma = (ctx: Ctx, dx: number, dy: number, color?: string) => void;

export function elipse(ctx: Ctx, cx: number, cy: number, rx: number, ry: number, color: string) {
  cx = R(cx); cy = R(cy);
  for (let j = -ry; j <= ry; j++) {
    const w = R(rx * Math.sqrt(Math.max(0, 1 - (j / (ry + 0.5)) ** 2)));
    px(ctx, cx - w, cy + j, 2 * w + 1, 1, color);
  }
}

const E = (cx: number, cy: number, rx: number, ry: number, c: string): Forma =>
  (ctx, dx, dy, col) => elipse(ctx, cx + dx, cy + dy, rx, ry, col ?? c);
const Rc = (x: number, y: number, w: number, h: number, c: string): Forma =>
  (ctx, dx, dy, col) => px(ctx, R(x) + dx, R(y) + dy, w, h, col ?? c);
/** Una oreja: triángulo con la base abajo y la punta en `(xp, y)`. */
const Oreja = (x: number, y: number, w: number, h: number, xp: number, c: string): Forma =>
  (ctx, dx, dy, col) => {
    for (let j = 0; j < h; j++) {
      const t = (j + 1) / h;
      const a = R(xp + (x - xp) * t), b = R(xp + (x + w - 1 - xp) * t);
      px(ctx, a + dx, R(y) + j + dy, b - a + 1, 1, col ?? c);
    }
  };
/** Un trazo grueso por una lista de puntos: la cola, las patas que se doblan. */
const Trazo = (pts: [number, number][], g: number, c: string): Forma =>
  (ctx, dx, dy, col) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
      const pasos = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
      for (let s = 0; s <= pasos; s++)
        px(ctx, R(x0 + ((x1 - x0) * s) / pasos - (g - 1) / 2) + dx, R(y0 + ((y1 - y0) * s) / pasos - (g - 1) / 2) + dy, g, g, col ?? c);
    }
  };

function silueta(ctx: Ctx, formas: Forma[], tinta: string) {
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) for (const f of formas) f(ctx, dx, dy, tinta);
  for (const f of formas) f(ctx, 0, 0);
}

// ── El gato ─────────────────────────────────────────────────────────────────

/** Un gato atigrado naranja: con la luz de la hora, como todo lo demás. De noche le brillan
 *  los ojos, que es lo primero que se ve de un gato a oscuras. */
function pelaje(m: Mano) {
  const L = m.P.ladrillo;
  return {
    base: L[3], sombra: L[2], luz: L[4], raya: L[1], tinta: m.F.tinta,
    blanco: m.P.piedra[5], nariz: m.P.tela[4], ojo: m.noche ? m.P.luz[5] : m.P.hoja[4],
  };
}

/** Sentado de espaldas, mirando la calle: la postura de un gato en una ventana. `giro` vuelve
 *  la cabeza (-1 a la izquierda, 1 a la derecha) y enseña un ojo; `cola` es el vaivén. */
export function gatoSentado(ctx: Ctx, m: Mano, cx: number, suelo: number, t: number, giro = 0, lado = 1) {
  const c = pelaje(m);
  const vaiven = Math.sin(t * 1.6) * 2.2 + Math.sin(t * 0.43) * 1.2;
  const hx = cx + R(giro * 2);
  const cola: [number, number][] = [
    [cx + lado * 9, suelo - 2], [cx + lado * 15, suelo - 1], [cx + lado * 20, suelo - 2],
    [cx + lado * (23 + vaiven * 0.5), suelo - 5], [cx + lado * (24 + vaiven), suelo - 9],
  ];
  silueta(ctx, [
    Trazo(cola, 3, c.base),
    E(cx, suelo - 6, 12, 5, c.base),
    E(cx, suelo - 13, 10, 9, c.base),
    E(hx, suelo - 27, 8, 6, c.base),
    Oreja(hx - 8, suelo - 38, 6, 7, hx - 7, c.base),
    Oreja(hx + 2, suelo - 38, 6, 7, hx + 7, c.base),
  ], c.tinta);
  // Rayas del lomo y de la cabeza, en el tono de sombra.
  for (let j = 0; j < 4; j++) px(ctx, cx - 5 + (j % 2), suelo - 20 + j * 4, 10 - (j % 2) * 2, 1, c.raya);
  px(ctx, hx - 1, suelo - 32, 2, 3, c.raya);
  px(ctx, hx - 4, suelo - 31, 1, 2, c.raya);
  px(ctx, hx + 3, suelo - 31, 1, 2, c.raya);
  px(ctx, hx - 6, suelo - 35, 2, 3, c.nariz);
  px(ctx, hx + 4, suelo - 35, 2, 3, c.nariz);
  // Sombra de un lado del cuerpo: la luz viene de la calle, que está delante de él.
  for (let j = 0; j < 12; j++) px(ctx, cx + 6, suelo - 16 + j, 3, 1, c.sombra);
  // Con la cabeza vuelta se le ve un ojo y el perfil del hocico.
  if (giro !== 0) {
    const s = Math.sign(giro);
    px(ctx, hx + s * 6, suelo - 28, 2, 2, c.ojo);
    px(ctx, hx + s * 6 + (s > 0 ? 1 : 0), suelo - 28, 1, 2, c.tinta);
    px(ctx, hx + s * 8, suelo - 25, 2, 1, c.blanco);
  }
  for (let i = 0; i < 3; i++) px(ctx, R(cola[4][0]) - 1, R(cola[4][1]) + i, 3, 1, i === 0 ? c.raya : c.base);
}

/** Andando de perfil. `paso` es la fase de la zancada, `dir` hacia dónde mira. */
export function gatoAndando(ctx: Ctx, m: Mano, cx: number, suelo: number, paso: number, dir: 1 | -1, t: number) {
  const c = pelaje(m);
  const s = dir;
  const pata = (x: number, fase: number): Forma => {
    const a = Math.sin(paso + fase);
    return Trazo([[cx + s * x, suelo - 8], [cx + s * (x + a * 2.5), suelo - 1 + (Math.cos(paso + fase) > 0.3 ? -1 : 0)]], 2, c.sombra);
  };
  const vaiven = Math.sin(t * 2.1) * 1.5;
  const cola: [number, number][] = [
    [cx - s * 12, suelo - 12], [cx - s * 17, suelo - 16], [cx - s * 19, suelo - 22], [cx - s * (17 - vaiven), suelo - 27],
  ];
  const bote = Math.cos(paso * 2) > 0.5 ? -1 : 0;
  silueta(ctx, [
    pata(-9, Math.PI), pata(8, 0),
    Trazo(cola, 3, c.base),
    E(cx, suelo - 11 + bote, 13, 5, c.base),
    E(cx + s * 9, suelo - 12 + bote, 5, 5, c.base),
    pata(-11, 0), pata(6, Math.PI),
    E(cx + s * 15, suelo - 17 + bote, 6, 5, c.base),
    Oreja(cx + s * 11 - (s < 0 ? 5 : 0), suelo - 27 + bote, 5, 6, cx + s * 11 + (s < 0 ? -2 : 1), c.base),
    Oreja(cx + s * 16 - (s < 0 ? 5 : 0), suelo - 27 + bote, 5, 6, cx + s * 18, c.base),
  ], c.tinta);
  for (let k = 0; k < 4; k++) px(ctx, cx - s * (8 - k * 4), suelo - 15 + bote, 1, 4, c.raya);
  px(ctx, cx + s * 17 - (s < 0 ? 1 : 0), suelo - 19 + bote, 2, 2, c.ojo);
  px(ctx, cx + s * 18 - (s < 0 ? 1 : 0), suelo - 19 + bote, 1, 2, c.tinta);
  px(ctx, cx + s * 20 - (s < 0 ? 1 : 0), suelo - 16 + bote, 2, 1, c.blanco);
  px(ctx, cx + s * 21 - (s < 0 ? 1 : 0), suelo - 17 + bote, 1, 1, c.nariz);
  px(ctx, cx + s * 6, suelo - 9 + bote, 5, 2, c.blanco);
}

/** Hecho una bola, dormido. Respira: el lomo sube un píxel cada pocos segundos. */
export function gatoDormido(ctx: Ctx, m: Mano, cx: number, suelo: number, t: number) {
  const c = pelaje(m);
  const aire = Math.sin((t * 2 * Math.PI) / 4.2) > 0.1 ? 1 : 0;
  const oreja = Math.sin(t * 0.37) > 0.985 ? 1 : 0;      // de vez en cuando, un respingo
  const punta = Math.sin(t * 0.21) > 0.9 ? Math.round(Math.sin(t * 5)) : 0;
  silueta(ctx, [
    E(cx + 1, suelo - 7 - aire, 15, 7 + aire, c.base),
    E(cx - 10, suelo - 7, 7, 6, c.base),
    Oreja(cx - 17, suelo - 17 - oreja, 5, 5, cx - 17, c.base),
    Oreja(cx - 10, suelo - 17, 5, 5, cx - 6, c.base),
    Trazo([[cx + 14, suelo - 3], [cx + 8, suelo - 1], [cx - 2, suelo - 1], [cx - 9 + punta, suelo - 2]], 3, c.base),
  ], c.tinta);
  for (let k = 0; k < 4; k++) px(ctx, cx - 1 + k * 4, suelo - 12 - aire + (k % 2), 1, 4, c.raya);
  px(ctx, cx - 14, suelo - 8, 3, 1, c.tinta);               // el ojo cerrado
  px(ctx, cx - 8, suelo - 8, 3, 1, c.tinta);
  px(ctx, cx - 11, suelo - 5, 2, 1, c.nariz);
  px(ctx, cx - 10 + punta, suelo - 3, 3, 1, c.raya);
}

/** La cabeza de frente, asomando. `mira` desplaza las pupilas; `cierra` es un parpadeo.
 *  `cuerpo` es lo que asoma con ella —una cabeza sola flota—: los hombros si sube desde abajo,
 *  el lomo hacia fuera si entra por la derecha. */
export function gatoCabeza(
  ctx: Ctx, m: Mano, cx: number, cy: number, mira: number, cierra: boolean,
  cuerpo?: "abajo" | "derecha",
) {
  const c = pelaje(m);
  cx = R(cx); cy = R(cy);
  const debajo: Forma[] = cuerpo === "abajo" ? [E(cx, cy + 14, 14, 9, c.base)]
    : cuerpo === "derecha" ? [E(cx + 18, cy + 11, 18, 6, c.base), Rc(cx - 7, cy + 12, 5, 5, c.base)]
    : [];
  silueta(ctx, [
    ...debajo,
    E(cx, cy + 2, 10, 6, c.base),
    E(cx, cy - 1, 9, 7, c.base),
    Oreja(cx - 9, cy - 13, 7, 8, cx - 9, c.base),
    Oreja(cx + 3, cy - 13, 7, 8, cx + 9, c.base),
  ], c.tinta);
  if (cuerpo === "abajo") px(ctx, cx - 4, cy + 9, 8, 6, c.blanco);          // la pechera
  if (cuerpo === "derecha") px(ctx, cx - 7, cy + 16, 4, 1, c.blanco);
  px(ctx, cx - 7, cy - 10, 2, 4, c.nariz);
  px(ctx, cx + 6, cy - 10, 2, 4, c.nariz);
  px(ctx, cx - 1, cy - 7, 2, 3, c.raya);
  px(ctx, cx - 4, cy - 6, 1, 2, c.raya);
  px(ctx, cx + 3, cy - 6, 1, 2, c.raya);
  px(ctx, cx - 4, cy + 2, 8, 4, c.blanco);                   // el morro blanco
  px(ctx, cx - 1, cy + 1, 2, 1, c.nariz);
  px(ctx, cx - 1, cy + 3, 1, 1, c.tinta);
  px(ctx, cx, cy + 3, 1, 1, c.tinta);
  for (const ox of [-5, 3]) {
    if (cierra) { px(ctx, cx + ox, cy - 1, 3, 1, c.tinta); continue; }
    px(ctx, cx + ox, cy - 2, 3, 3, c.ojo);
    px(ctx, cx + ox + 1 + R(mira), cy - 2, 1, 3, c.tinta);
  }
  px(ctx, cx - 13, cy + 2, 4, 1, c.luz);                     // bigotes
  px(ctx, cx + 10, cy + 2, 4, 1, c.luz);
}

/** La cola sola, colgando desde arriba del encuadre: el gato está en lo alto del armario. */
export function gatoCola(ctx: Ctx, m: Mano, x0: number, largo: number, t: number) {
  const c = pelaje(m);
  const pts: [number, number][] = [];
  // Péndulo en ese: la base casi quieta, la punta barriendo y enroscándose.
  const barrido = Math.sin(t * 0.9) * 9, enrosca = Math.sin(t * 1.7 + 1);
  for (let i = 0; i <= 14; i++) {
    const f = i / 14;
    pts.push([x0 + barrido * f * f + Math.sin(f * 3.2 + t * 1.3) * 2.5 * f + (f > 0.85 ? enrosca * (f - 0.85) * 40 : 0),
      -2 + f * largo - (f > 0.85 ? Math.abs(enrosca) * (f - 0.85) * 20 : 0)]);
  }
  silueta(ctx, [Trazo(pts, 5, c.base)], c.tinta);
  for (let i = 2; i <= 13; i += 3) px(ctx, R(pts[i][0]) - 2, R(pts[i][1]), 5, 2, c.raya);
  const [xp, yp] = pts[14];
  px(ctx, R(xp) - 2, R(yp) - 2, 5, 4, c.raya);
}

// ── El perro ────────────────────────────────────────────────────────────────

/** Un perro pequeño, marrón con pechera blanca, a la escala de la calle —cabe tres veces en el
 *  contenedor—. Sus posturas: andando, olisqueando (cabeza abajo) y sentado. */
export function perro(
  ctx: Ctx, m: Mano, cx: number, suelo: number, dir: 1 | -1, t: number,
  postura: "anda" | "huele" | "sentado" | "rasca", paso = 0,
) {
  const s = dir;
  // El hocico en marrón claro y no en blanco: blanco y a esta escala, se lee como un pico.
  const pelo = m.P.madera[4], oscuro = m.P.madera[2], claro = m.P.madera[5], blanco = m.P.piedra[5], tinta = m.F.tinta;
  cx = R(cx);
  const meneo = R(Math.sin(t * 11) * 1.5);
  if (postura === "sentado" || postura === "rasca") {
    // Sentado de perfil: el cuarto trasero en el suelo, el pecho erguido y la cabeza adelantada,
    // con el hocico por delante. Con la cabeza encima del cuerpo parece un pingüino.
    const rasca = postura === "rasca" ? R(Math.sin(t * 22)) : 0;
    const o = (n: number) => (s < 0 ? n : 0);
    silueta(ctx, [
      Trazo([[cx - s * 5, suelo - 1], [cx - s * 9, suelo - 2 - meneo]], 1, pelo),
      E(cx - s * 2, suelo - 3, 5, 3, pelo),
      E(cx + s * 1, suelo - 7, 3, 4, pelo),
      Rc(cx + s * 3 - o(1), suelo - 5, 2, 5, pelo),
      E(cx + s * 3, suelo - 12, 3, 3, pelo),
      Rc(cx + s * 5 - o(3), suelo - 11, 4, 2, claro),
      postura === "rasca"
        ? Trazo([[cx - s * 2, suelo - 3], [cx + s * rasca, suelo - 9]], 2, pelo)
        : Rc(cx - s * 1 - o(2), suelo - 2, 3, 2, pelo),
    ], tinta);
    px(ctx, cx + s * 2 - o(1), suelo - 9, 2, 3, blanco);                  // pechera
    px(ctx, cx + s * 1 - o(1), suelo - 15, 2, 5, oscuro);                 // la oreja caída
    px(ctx, cx + s * 4 - o(0), suelo - 13, 1, 1, tinta);
    px(ctx, cx + s * 8 - o(0), suelo - 11, 1, 1, tinta);
    return;
  }
  const baja = postura === "huele" ? 3 : 0;
  const pata = (x: number, fase: number): Forma => {
    const a = postura === "anda" ? Math.sin(paso + fase) * 1.5 : 0;
    return Rc(cx + s * x + R(a) - (s < 0 ? 1 : 0), suelo - 3, 2, 3, oscuro);
  };
  silueta(ctx, [
    pata(-4, 0), pata(3, Math.PI),
    Trazo([[cx - s * 6, suelo - 7], [cx - s * (8 + (postura === "anda" ? 0 : 1)), suelo - 10 - meneo]], 1, pelo),
    E(cx, suelo - 6, 6, 3, pelo),
    pata(-5, Math.PI), pata(4, 0),
    E(cx + s * 7, suelo - 10 + baja, 3, 3, pelo),
    Rc(cx + s * 9 - (s < 0 ? 2 : 0), suelo - 10 + baja, 3, 2, claro),
  ], tinta);
  px(ctx, cx + s * 3 - (s < 0 ? 2 : 0), suelo - 5, 3, 2, blanco);      // pechera
  px(ctx, cx - s * 2 - (s < 0 ? 3 : 0), suelo - 9, 4, 2, oscuro);      // la mancha del lomo
  px(ctx, cx + s * 6 - (s < 0 ? 1 : 0), suelo - 12 + baja, 2, 3, oscuro);
  px(ctx, cx + s * 8, suelo - 11 + baja, 1, 1, tinta);
  px(ctx, cx + s * 11 - (s < 0 ? 0 : 0), suelo - 10 + baja, 1, 1, tinta);
}

// ── Pájaros ─────────────────────────────────────────────────────────────────

/** Un pájaro en vuelo: una uve que aletea. */
export function pajaroVuela(ctx: Ctx, x: number, y: number, t: number, color: string) {
  x = R(x); y = R(y);
  const ala = Math.sin(t * 16) > 0 ? -1 : 1;
  px(ctx, x, y, 2, 1, color);
  px(ctx, x - 1, y + ala, 1, 1, color);
  px(ctx, x + 2, y + ala, 1, 1, color);
  px(ctx, x - 2, y + 2 * ala, 1, 1, color);
  px(ctx, x + 3, y + 2 * ala, 1, 1, color);
}

/** Un pájaro posado, de perfil: cuerpo, cabeza y cola. `pica` baja la cabeza. */
export function pajaroPosado(ctx: Ctx, m: Mano, x: number, y: number, dir: 1 | -1, pica: boolean) {
  x = R(x); y = R(y);
  const cuerpo = m.P.metal[1], pecho = m.P.ladrillo[3];
  px(ctx, x - 2, y - 3, 5, 3, cuerpo);
  px(ctx, x - dir * 3 - (dir < 0 ? 1 : 0), y - 2, 2, 1, cuerpo);        // cola
  px(ctx, x + dir * 1, y - 2, 2, 2, pecho);
  const hy = pica ? y - 2 : y - 5;
  px(ctx, x + dir * 2 - (dir < 0 ? 1 : 0), hy, 2, 2, cuerpo);
  px(ctx, x + dir * 4 - (dir < 0 ? 0 : 0), hy + 1, 1, 1, m.P.luz[3]);
  px(ctx, x - 1, y, 1, 1, m.F.tinta);
  px(ctx, x + 1, y, 1, 1, m.F.tinta);
}
