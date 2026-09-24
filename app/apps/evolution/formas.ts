// La geometría del mundo: dónde está casa, por dónde se anda y qué tapa la vista. **La sortea la
// semilla**, como el clima, y es la otra perilla que reparte los mundos: lo que la forma decide es
// lo lejos que queda la comida de casa, cuánta casa hay para tanto suelo y **quién puede
// encontrarse con quién**.
//
// - **caja**: el rectángulo con casa en todo el perímetro. La de siempre.
// - **donut**: casa alrededor de un hueco central y la pared, fuera. Le da la vuelta a la caja:
//   cuanto más lejos de casa, **más** suelo hay.
// - **barrera**: la caja partida por un muro con un solo paso en medio: dos salas.
// - **trebol**: un disco con casa en el borde, partido en tres salas por un muro en «Y» que deja una
//   plaza en el centro. Las salas se tocan en el punto más lejano de casa, como el paso de la barrera.
// - **islas**: dos cajas iguales en el mar, con una fundadora idéntica en cada una. Lo mismo dos
//   veces, para ver si sale lo mismo.
//
// Probado y descartado:
// - el **círculo**, casa en todo el borde. Con el tamaño que hace comerse la comida se comporta como la
//   caja —mismos genes, misma mezcla entre mitades— y se extingue algo más. No enseñaba nada que la
//   caja no enseñe.
// - la **herradura**, el donut cortado por un muro, buscando una especie en anillo: que cada uno solo
//   se cruzara con sus vecinos y los dos extremos acabaran distintos pared con pared. No sale: los
//   arcos vecinos se separan tanto como los extremos, así que el anillo se parte en trozos que no se
//   ven —ninguna sala marca dónde acaba cada uno— y aguanta peor que el trébol, que parte mejor.
//
// Lo que corre en el tick cumple la promesa 3 del motor: solo `+ - * /` y `sqrt`. Lo de pintar
// (`lazos`, `trazar*`) no la necesita y va aparte, al final.

export const FORMAS = ["caja", "donut", "barrera", "trebol", "islas"] as const;
export type Forma = (typeof FORMAS)[number];

/** Lo que la geometría lee de la configuración. `ancho` y `alto` son la caja que la contiene. */
export type Geometria = { forma: Forma; ancho: number; alto: number; casa: number };

/**
 * Las medidas de cada forma, de `formas.medir.ts`, con el criterio que fijó los 288×200 de la caja:
 * **que la comida del día se coma**. A 300 días, la caja deja sin comer el 0,6% y amanece limpia
 * nueve noches de cada diez; el donut, a 240 de diámetro, lo mismo. A 190 se lo comía todo siempre,
 * y sin suelo que barrer el excedente se va a la camada.
 *
 * La barrera se queda con la caja entera, porque lo que se mira ahí es el muro: le sobra el 2% —el
 * paso está en el centro, que es lo más lejos de casa—. Cada isla es media caja con media comida.
 *
 * El trébol, a 240 como el donut, se extinguía uno de cada tres mundos: con los muros la comida
 * lejana ya no la paga el viaje. A 215 aguanta como la caja —41 de 48 semillas vivas a 300 días,
 * contra 43— y le sobra el 1%.
 *
 * Lo que separa cada una, con `formas.medir.ts`: la distancia entre salas en unidades de lo que se
 * dispersa cada sala por dentro es 0,95 entre las mitades de la caja, 1,35 en la barrera, 1,74 entre
 * las salas del trébol y **3,30 entre las islas**, que no se cruzan nunca.
 */
export const MEDIDAS: Record<Forma, { ancho: number; alto: number }> = {
  caja: { ancho: 288, alto: 200 },
  donut: { ancho: 240, alto: 240 },
  barrera: { ancho: 288, alto: 200 },
  trebol: { ancho: 215, alto: 215 },
  islas: { ancho: 312, alto: 200 },
};

/** El radio del hueco del donut, en fracción del diámetro. */
export const HUECO = 0.16;

/** Los muros: su grosor, y el paso que la barrera deja en medio. */
export const MURO = { grosor: 4, paso: 32 };

/** El radio de la plaza del trébol, donde acaban sus tres muros: deja entre punta y punta un paso como el de la barrera. */
export const PLAZA = 20;

/** El mar entre las dos islas. */
export const MAR = 24;

export const huecoDe = (g: Geometria): number => g.ancho * HUECO;

/** Con mar alrededor: lo de fuera del mundo no es casa. */
export const conMar = (g: Geometria) => g.forma === "donut" || g.forma === "islas";

/** El ancho de una isla. */
const anchoIsla = (g: Geometria) => (g.ancho - MAR) / 2;

/**
 * En qué isla cae un punto: la 0 o la 1, y la 0 en cualquier forma que no sea de islas. Es lo único
 * que el motor necesita saber de ellas fuera de la geometría: cada isla es su propia población.
 */
export const isla = (g: Geometria, x: number): number => (g.forma === "islas" && x > g.ancho / 2 ? 1 : 0);

/** Dónde empieza la isla `i` y cuánto mide; en las demás formas, la caja entera. */
const tramo = (g: Geometria, i: number): [number, number] =>
  g.forma === "islas" ? [i ? g.ancho - anchoIsla(g) : 0, anchoIsla(g)] : [0, g.ancho];

/** Los muros, como segmentos de `MURO.grosor`: los de la barrera y la «Y» del trébol. */
export function muros(g: Geometria): [number, number, number, number][] {
  const R = g.ancho / 2;
  if (g.forma === "barrera") {
    const p0 = g.alto / 2 - MURO.paso / 2, p1 = g.alto / 2 + MURO.paso / 2;
    return [[R, 0, R, p0], [R, p1, R, g.alto]];
  }
  if (g.forma === "trebol") {
    const s = Math.sqrt(3) / 2;
    return ([[0, 1], [-s, -0.5], [s, -0.5]] as const).map(([dx, dy]) =>
      [R + dx * PLAZA, R + dy * PLAZA, R + dx * R, R + dy * R]);
  }
  return [];
}

/** Distancia al cuadrado de un punto a un segmento, y el punto del segmento más cercano. */
function alSegmento(x: number, y: number, ax: number, ay: number, bx: number, by: number): [number, number, number] {
  const sx = bx - ax, sy = by - ay, l2 = sx * sx + sy * sy;
  let t = l2 > 1e-12 ? ((x - ax) * sx + (y - ay) * sy) / l2 : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const cx = ax + t * sx, cy = ay + t * sy, dx = x - cx, dy = y - cy;
  return [dx * dx + dy * dy, cx, cy];
}

/** Si un punto está a más de `m` de todo muro, contando su grosor. */
function lejosDeMuros(g: Geometria, x: number, y: number, m: number): boolean {
  const lim = MURO.grosor / 2 + m;
  for (const [ax, ay, bx, by] of muros(g)) if (alSegmento(x, y, ax, ay, bx, by)[0] < lim * lim) return false;
  return true;
}

/**
 * Hacia dónde está casa y a qué distancia de su pared, que es la que casa tiene detrás: la del
 * mundo en la caja, el trébol y cada isla; la del hueco en el donut. Pisar casa es
 * estar a menos de `casa` de esa pared, y llegar del todo, a menos de la mitad.
 *
 * **Los muros no son casa**: se vuelve a la pared de siempre, y en ninguna forma el camino recto
 * hasta ella cruza un muro.
 */
export function haciaCasa(g: Geometria, x: number, y: number): [number, number, number] {
  if (g.forma === "donut" || g.forma === "trebol") {
    const R = g.ancho / 2, ex = x - R, ey = y - R, r = Math.sqrt(ex * ex + ey * ey);
    // El centro exacto no tiene dirección: se contesta algo fijo y no un NaN. En el donut no se
    // llega, que es el hueco.
    if (g.forma === "trebol") return r < 1e-9 ? [1, 0, R] : [ex / r, ey / r, R - r];
    return r < 1e-9 ? [1, 0, 0] : [-ex / r, -ey / r, r - huecoDe(g)];
  }
  const [x0, w] = tramo(g, isla(g, x));
  const izq = x - x0, der = x0 + w - x, arr = y, aba = g.alto - y;
  let d = izq, dx = -1, dy = 0;
  if (der < d) { d = der; dx = 1; dy = 0; }
  if (arr < d) { d = arr; dx = 0; dy = -1; }
  if (aba < d) { d = aba; dx = 0; dy = 1; }
  return [dx, dy, d];
}

/** Si un punto cae en casa. */
export const enFranja = (g: Geometria, x: number, y: number): boolean => haciaCasa(g, x, y)[2] < g.casa;

export type Movil = { x: number; y: number; hx: number; hy: number };

/** Refleja el rumbo sobre la normal `n` si apunta hacia el lado `s` de ella. */
function reflejar(b: Movil, nx: number, ny: number, s: number) {
  const p = b.hx * nx + b.hy * ny;
  if (p * s > 0) { b.hx -= 2 * p * nx; b.hy -= 2 * p * ny; }
}

/** Contra un muro: el centro se queda a `lim` más medio grosor del segmento. */
function contraMuro(b: Movil, ax: number, ay: number, bx: number, by: number, lim: number) {
  const m = lim + MURO.grosor / 2;
  const [d2, cx, cy] = alSegmento(b.x, b.y, ax, ay, bx, by);
  if (d2 >= m * m) return;
  let nx: number, ny: number;
  if (d2 < 1e-12) {
    // Con el centro sobre el eje del muro no hay lado: sale por la perpendicular, fija.
    const sx = bx - ax, sy = by - ay, l = Math.sqrt(sx * sx + sy * sy);
    nx = -sy / l; ny = sx / l;
  } else {
    const d = Math.sqrt(d2);
    nx = (b.x - cx) / d; ny = (b.y - cy) / d;
  }
  b.x = cx + nx * m; b.y = cy + ny * m;
  reflejar(b, nx, ny, -1);
}

/**
 * Las paredes: el cuerpo se para tangente a ellas y el rumbo rebota. En la caja es lo que siempre
 * fue, eje a eje, y por eso una semilla que saque caja da el mismo mundo que antes de las formas.
 */
export function chocar(g: Geometria, b: Movil, lim: number) {
  if (g.forma === "donut" || g.forma === "trebol") {
    const R = g.ancho / 2, ex = b.x - R, ey = b.y - R, r = Math.sqrt(ex * ex + ey * ey);
    if (r > R - lim) {
      const nx = ex / r, ny = ey / r;
      b.x = R + nx * (R - lim); b.y = R + ny * (R - lim);
      reflejar(b, nx, ny, 1);
    } else if (g.forma === "donut") {
      const H = huecoDe(g);
      if (r < H + lim) {
        const nx = r > 1e-9 ? ex / r : 1, ny = r > 1e-9 ? ey / r : 0;
        b.x = R + nx * (H + lim); b.y = R + ny * (H + lim);
        reflejar(b, nx, ny, -1);
      }
    }
  } else {
    const [x0, w] = tramo(g, isla(g, b.x));
    let x = b.x, y = b.y;
    if (x < x0 + lim) { x = x0 + lim; b.hx = Math.abs(b.hx); }
    else if (x > x0 + w - lim) { x = x0 + w - lim; b.hx = -Math.abs(b.hx); }
    if (y < lim) { y = lim; b.hy = Math.abs(b.hy); }
    else if (y > g.alto - lim) { y = g.alto - lim; b.hy = -Math.abs(b.hy); }
    b.x = x; b.y = y;
  }
  for (const [ax, ay, bx, by] of muros(g)) contraMuro(b, ax, ay, bx, by, lim);
}

/** Signo del giro de `a→b` a `a→c`. */
const giro = (ax: number, ay: number, bx: number, by: number, cx: number, cy: number) =>
  (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);

/**
 * Si desde `a` se ve `b`. **Los muros, el hueco y el mar tapan la vista**: sin eso un bicho ve comida
 * al otro lado y se pasa el día empujando la pared, y eso no lo puede corregir ningún gen — nadie
 * puede leer que lo que ve está detrás de algo.
 */
export function seVe(g: Geometria, ax: number, ay: number, bx: number, by: number): boolean {
  if (g.forma === "islas") return isla(g, ax) === isla(g, bx);
  for (const [px, py, qx, qy] of muros(g)) {
    if (giro(px, py, qx, qy, ax, ay) * giro(px, py, qx, qy, bx, by) < 0 &&
        giro(ax, ay, bx, by, px, py) * giro(ax, ay, bx, by, qx, qy) < 0) return false;
  }
  if (g.forma === "donut") {
    const R = g.ancho / 2, H = huecoDe(g);
    return alSegmento(R, R, ax, ay, bx, by)[0] >= H * H;
  }
  return true;
}

/** Vector unitario uniforme por rechazo en el cuadrado, como `unidad` en el motor. */
function unidad(azar: () => number): [number, number] {
  for (;;) {
    const x = azar() * 2 - 1, y = azar() * 2 - 1, d2 = x * x + y * y;
    if (d2 > 1e-6 && d2 <= 1) { const d = Math.sqrt(d2); return [x / d, y / d]; }
  }
}

/** Un punto al azar en la línea media de casa: donde amanece la fundadora `i`, que en las islas elige isla. */
export function puntoEnCasa(g: Geometria, azar: () => number, i = 0): [number, number] {
  const v = g.casa / 2;
  for (;;) {
    let p: [number, number];
    if (g.forma === "donut" || g.forma === "trebol") {
      const R = g.ancho / 2, [ux, uy] = unidad(azar);
      const r = g.forma === "trebol" ? R - v : huecoDe(g) + v;
      p = [R + ux * r, R + uy * r];
    } else {
      const [x0, w] = tramo(g, i % 2);
      let d = azar() * (2 * (w + g.alto));
      if (d < w) p = [x0 + d, v];
      else if ((d -= w) < g.alto) p = [x0 + w - v, d];
      else if ((d -= g.alto) < w) p = [x0 + w - d, g.alto - v];
      else p = [x0 + v, d - w];
    }
    // Casa pasa por debajo de los muros: ahí no se amanece.
    if (lejosDeMuros(g, p[0], p[1], v)) return p;
  }
}

/**
 * Un bocado al azar en el campo, a `margen` de casa y a `r` de toda pared. En las islas, el `k`-ésimo
 * cae en la isla `k % 2`: la comida se reparte a medias, y quien llama rota `k` para que el bocado
 * impar no sea siempre de la misma.
 */
export function puntoComida(g: Geometria, margen: number, r: number, azar: () => number, k = 0): [number, number] {
  if (g.forma === "caja" || g.forma === "islas") {
    const [x0, w] = tramo(g, k % 2);
    return [x0 + margen + azar() * (w - 2 * margen), margen + azar() * (g.alto - 2 * margen)];
  }
  for (;;) {
    const x = azar() * g.ancho, y = azar() * g.alto;
    if (haciaCasa(g, x, y)[2] <= margen) continue;
    if (g.forma === "donut") {
      const R = g.ancho / 2, ex = x - R, ey = y - R;
      if (ex * ex + ey * ey > (R - r) * (R - r)) continue;
    }
    if (lejosDeMuros(g, x, y, r)) return [x, y];
  }
}

// ─── Para pintar ──────────────────────────────────────────────────────────────
//
// Fuera del tick, así que aquí sí hay trigonometría.

/** Un punto de la orilla del campo, con la normal que apunta a casa. */
export type PuntoOrilla = { x: number; y: number; nx: number; ny: number };

/** Un rectángulo como lazo de orilla, con la normal hacia fuera. */
function lazoCaja(x0: number, y0: number, x1: number, y1: number, paso: number): PuntoOrilla[] {
  const lazo: PuntoOrilla[] = [];
  for (let x = x0; x < x1; x += paso) lazo.push({ x, y: y0, nx: 0, ny: -1 });
  for (let y = y0; y < y1; y += paso) lazo.push({ x: x1, y, nx: 1, ny: 0 });
  for (let x = x1; x > x0; x -= paso) lazo.push({ x, y: y1, nx: 0, ny: 1 });
  for (let y = y1; y > y0; y -= paso) lazo.push({ x: x0, y, nx: -1, ny: 0 });
  return lazo;
}

/**
 * La orilla entre el campo y casa, muestreada cada `paso` unidades: una lista de lazos cerrados.
 * Los muros se pintan encima.
 */
export function lazos(g: Geometria, paso: number): PuntoOrilla[][] {
  if (g.forma === "donut" || g.forma === "trebol") {
    const R = g.ancho / 2, s = g.forma === "trebol" ? 1 : -1;
    const r = g.forma === "trebol" ? R - g.casa : huecoDe(g) + g.casa;
    const n = Math.max(12, Math.round((2 * Math.PI * r) / paso));
    const lazo: PuntoOrilla[] = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 2 * Math.PI, cx = Math.cos(a), cy = Math.sin(a);
      lazo.push({ x: R + cx * r, y: R + cy * r, nx: s * cx, ny: s * cy });
    }
    return [lazo];
  }
  const k = g.casa;
  return (g.forma === "islas" ? [0, 1] : [0]).map((i) => {
    const [x0, w] = tramo(g, i);
    return lazoCaja(x0 + k, k, x0 + w - k, g.alto - k, paso);
  });
}

/** El trazo del campo —lo que no es casa ni pared—, para recortar con él el suelo. */
export function trazarCampo(g: Geometria, c: CanvasRenderingContext2D) {
  const R = g.ancho / 2;
  if (g.forma === "trebol") { c.moveTo(R + R - g.casa, R); c.arc(R, R, R - g.casa, 0, 2 * Math.PI); return; }
  if (g.forma === "donut") {
    c.moveTo(R + R, R); c.arc(R, R, R, 0, 2 * Math.PI);
    const r = huecoDe(g) + g.casa;
    c.moveTo(R + r, R); c.arc(R, R, r, 0, 2 * Math.PI, true);
    return;
  }
  for (const i of g.forma === "islas" ? [0, 1] : [0]) {
    const [x0, w] = tramo(g, i);
    c.rect(x0 + g.casa, g.casa, w - 2 * g.casa, g.alto - 2 * g.casa);
  }
}

/** El trazo del mundo en las formas con mar: lo que queda fuera de él es mar. */
export function trazarMundo(g: Geometria, c: CanvasRenderingContext2D) {
  const R = g.ancho / 2;
  if (g.forma === "donut") { c.moveTo(R + R, R); c.arc(R, R, R, 0, 2 * Math.PI); return; }
  for (const i of [0, 1]) { const [x0, w] = tramo(g, i); c.rect(x0, 0, w, g.alto); }
}
