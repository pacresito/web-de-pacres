// Genera data/fuera-de-ruta/zonas-mapa.ts: para cada provincia de /fuera-de-ruta, su contorno
// REAL pero muy poligonal (Douglas-Peucker agresivo) partido en zonas del mismo
// tamaño. El reparto se hace sobre una rejilla de píxeles (diagrama de potencia:
// cada píxel va a la semilla más cercana, con un peso por zona que se ajusta hasta
// que todas valen igual) y el borde de cada zona se traza sobre esa rejilla. Es lo
// que garantiza que las zonas no se crucen ni se solapen: no hay recorte de
// polígonos, solo píxeles que pertenecen a una zona o a otra.
// Todo geometría pura, sin dependencias.
// Uso puntual: `node scripts/build-zonas-mapa.mjs`. NO editar la salida a mano.
import fs from "node:fs";

const FUENTE = "https://raw.githubusercontent.com/codeforgermany/click_that_hood/main/public/data/spain-provinces.geojson";
const SALIDA = new URL("../data/fuera-de-ruta/zonas-mapa.ts", import.meta.url);

const VB_W = 400, VB_H = 430, PAD = 22;      // lienzo de MapaZonas
const TOL = 20;                               // px de simplificación (chunky, muy poligonal pero reconocible)
const GAP = 10;                               // px que se encoge cada zona → hueco entre pegatinas
const ESCALERA = 2;                           // px: limpia la escalera de 1 px del trazado por rejilla
const PASADAS = 150;                          // iteraciones del reparto (igualar áreas y compactar)
const RELAJA = 0.25;                          // cuánto se arrastra la semilla al centro de su zona en cada pasada
const ALTO = 35;                              // alto de la etiqueta: el nombre a dos líneas, con holgura
const CHAR = 6.4;                             // ancho por carácter del nombre (Baloo 2 700 12px, medido en el navegador)
const AIRE = 6;                               // margen a los lados del nombre
const BADGE_Y = 0.8;                          // altura del badge dentro de la zona (0 = abajo, 1 = arriba)
const BADGE_FUERA = 3;                        // px que el badge se sale del borde derecho
const BADGE_R = 17;                           // radio que el badge le quita a la zona (círculo de 13 + aire)

// Zonas por provincia: id + nombre + semilla en fracción del bbox (0,0 = NO, 1,1 = SE).
// Navarra conserva los ids de navarra.json (mapeo zona→destinos). El resto son
// escaparate; ids por slug. Las semillas se colocan según la geografía del nombre.
const PROVINCIAS = {
  Navarra: [
    { id: "baztan-otsondo", nombre: "Baztán y Otsondo", seed: [0.34, 0.10] },
    { id: "irati-aezkoa", nombre: "Selva de Irati y Aezkoa", seed: [0.74, 0.20] },
    { id: "urbasa-andia", nombre: "Urbasa Andía", seed: [0.24, 0.46] },
    { id: "tierra-estella", nombre: "Tierra Estella", seed: [0.42, 0.66] },
    { id: "ribera", nombre: "Ribera de Navarra", seed: [0.58, 0.90] },
  ],
  Huesca: [
    { id: "jacetania-alto-gallego", nombre: "Jacetania–Alto Gállego", seed: [0.22, 0.14] },
    { id: "sobrarbe", nombre: "Sobrarbe", seed: [0.50, 0.12] },
    { id: "ribagorza", nombre: "Ribagorza", seed: [0.80, 0.18] },
    { id: "somontano-hoya", nombre: "Somontano–Hoya", seed: [0.48, 0.55] },
    { id: "monegros", nombre: "Monegros", seed: [0.44, 0.90] },
  ],
  Madrid: [
    { id: "sierra-de-guadarrama", nombre: "Sierra de Guadarrama", seed: [0.40, 0.22] },
    { id: "cuenca-del-manzanares", nombre: "Cuenca del Manzanares", seed: [0.72, 0.45] },
    { id: "sureste-vegas", nombre: "Sureste–Vegas", seed: [0.66, 0.80] },
    { id: "suroeste", nombre: "Suroeste", seed: [0.26, 0.68] },
  ],
  Murcia: [
    { id: "noroeste", nombre: "Noroeste", seed: [0.20, 0.26] },
    { id: "altiplano", nombre: "Altiplano", seed: [0.74, 0.24] },
    { id: "valle-de-ricote", nombre: "Valle de Ricote", seed: [0.44, 0.52] },
    { id: "costa-calida", nombre: "Costa Cálida", seed: [0.76, 0.78] },
  ],
};

// ---------- geometría pura ----------
const areaFirmada = (p) => {
  let a = 0;
  for (let i = 0, n = p.length; i < n; i++) { const [x1, y1] = p[i], [x2, y2] = p[(i + 1) % n]; a += x1 * y2 - x2 * y1; }
  return a / 2;
};

const centroide = (p) => {
  let a = 0, cx = 0, cy = 0;
  for (let i = 0, n = p.length; i < n; i++) {
    const [x1, y1] = p[i], [x2, y2] = p[(i + 1) % n], f = x1 * y2 - x2 * y1;
    a += f; cx += (x1 + x2) * f; cy += (y1 + y2) * f;
  }
  if (Math.abs(a) < 1e-9) return [p.reduce((s, q) => s + q[0], 0) / p.length, p.reduce((s, q) => s + q[1], 0) / p.length];
  return [cx / (3 * a), cy / (3 * a)];
};

const dentro = (p, poly) => {                    // point-in-polygon (ray casting)
  let d = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > p[1]) !== (yj > p[1]) && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) d = !d;
  }
  return d;
};

// Douglas-Peucker sobre un anillo cerrado (se ancla en el punto más lejano al centroide).
function simplifica(ring, tol) {
  const dp = (pts, s, e, keep) => {
    let dmax = 0, idx = -1;
    const [ax, ay] = pts[s], [bx, by] = pts[e], dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1;
    for (let i = s + 1; i < e; i++) {
      const d = Math.abs((pts[i][0] - ax) * dy - (pts[i][1] - ay) * dx) / len;
      if (d > dmax) { dmax = d; idx = i; }
    }
    if (dmax > tol) { dp(pts, s, idx, keep); keep.add(idx); dp(pts, idx, e, keep); }
  };
  const c = centroide(ring);
  let far = 0, fd = -1;
  ring.forEach((p, i) => { const d = Math.hypot(p[0] - c[0], p[1] - c[1]); if (d > fd) { fd = d; far = i; } });
  const rot = [...ring.slice(far), ...ring.slice(0, far)];
  const keep = new Set([0, rot.length - 1]);
  dp(rot, 0, rot.length - 1, keep);
  return [...keep].sort((a, b) => a - b).map((i) => rot[i]);
}

// ---------- reparto por rejilla ----------
// Rejilla de 1 px que cubre la provincia: 1 = píxel interior.
function rejillaInterior(provincia) {
  const xs = provincia.map((p) => p[0]), ys = provincia.map((p) => p[1]);
  const x0 = Math.floor(Math.min(...xs)), y0 = Math.floor(Math.min(...ys));
  const w = Math.ceil(Math.max(...xs)) - x0 + 1, h = Math.ceil(Math.max(...ys)) - y0 + 1;
  const suelo = new Uint8Array(w * h);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    if (dentro([x0 + i + 0.5, y0 + j + 0.5], provincia)) suelo[j * w + i] = 1;
  }
  return { x0, y0, w, h, suelo };
}

// Asigna cada píxel interior a una semilla minimizando d² − peso y repite ajustando
// dos cosas en cada pasada: el peso de las zonas que se quedan cortas (hasta que
// todas tienen el mismo área) y la semilla, que se arrastra hacia el centro de su
// zona (Lloyd) para que salgan compactas y no tiras alargadas donde no cabe la
// etiqueta. La semilla se mueve poco a poco: arrastrarla del todo perdería la
// geografía que dice su nombre. Devuelve el índice de zona por píxel (−1 = fuera).
function reparte(rej, semillas) {
  const { x0, y0, w, h, suelo } = rej;
  const n = semillas.length;
  const seeds = semillas.map((s) => [...s]);
  const objetivo = suelo.reduce((s, v) => s + v, 0) / n;
  const pesos = new Float64Array(n);
  const zonaDe = new Int8Array(w * h).fill(-1);
  let cuenta = new Array(n).fill(0);
  for (let it = 0; it < PASADAS; it++) {
    cuenta = new Array(n).fill(0);
    const sx = new Float64Array(n), sy = new Float64Array(n);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const k = j * w + i;
      if (!suelo[k]) continue;
      const px = x0 + i + 0.5, py = y0 + j + 0.5;
      let mejor = 0, mejorV = Infinity;
      for (let s = 0; s < n; s++) {
        const dx = px - seeds[s][0], dy = py - seeds[s][1], v = dx * dx + dy * dy - pesos[s];
        if (v < mejorV) { mejorV = v; mejor = s; }
      }
      zonaDe[k] = mejor; cuenta[mejor]++; sx[mejor] += px; sy[mejor] += py;
    }
    const lr = objetivo * (0.08 - 0.06 * (it / PASADAS));   // paso decreciente: converge sin oscilar
    for (let s = 0; s < n; s++) {
      pesos[s] += lr * (objetivo - cuenta[s]) / objetivo;
      if (!cuenta[s]) continue;
      seeds[s][0] += RELAJA * (sx[s] / cuenta[s] - seeds[s][0]);
      seeds[s][1] += RELAJA * (sy[s] / cuenta[s] - seeds[s][1]);
    }
  }
  return { zonaDe, cuenta, objetivo };
}

// Ancho que pide el nombre: el de su línea más larga. El nombre se pinta siempre a dos
// líneas partidas por palabras (`dosLineas` en MapaZonas), así que el corte se replica
// aquí para saber cuánto ocupa la más larga. Se estima de más a propósito: pasarse deja
// aire de sobra, quedarse corto pega el texto al borde. Es un número basto (±20% según
// las letras), así que no avisar de «no cabe» comparando contra él: salta con nombres
// que sí entran. El ancho que se logra por zona se imprime, y el mapa es el juez.
function anchoNombre(nombre) {
  const palabras = nombre.split(" ");
  let largo = nombre.length, dif = Infinity;
  for (let i = 1; i < palabras.length; i++) {
    const a = palabras.slice(0, i).join(" ").length, b = palabras.slice(i).join(" ").length;
    if (Math.abs(a - b) < dif) { dif = Math.abs(a - b); largo = Math.max(a, b); }
  }
  return largo * CHAR + AIRE;
}

// Sitio de la etiqueta: el punto MÁS CENTRAL de la zona donde entra la caja del nombre.
// La caja no se busca, se conoce: el alto lo fija el diseño (ALTO) y el ancho lo pide el
// texto. Quedan muchos sitios válidos y de esos gana el más cercano al centro de la
// zona, que es contra lo que el ojo lo compara. Elegir por tamaño —el hueco más ancho, o
// la caja más grande de una proporción dada— coloca mal: el hueco más holgado de una
// zona rara vez está en su centro, ni tiene la forma del texto. Se mide contra la
// máscara con una imagen integral, así que vale para cualquier forma. Si el nombre no
// entra en ningún sitio se estrecha la caja hasta que entre; el ancho que devuelve dice
// si hubo que hacerlo.
function sitioEtiqueta(mask, w, h, x0, y0, pedido) {
  const I = new Int32Array((w + 1) * (h + 1));
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    I[(j + 1) * (w + 1) + i + 1] = mask[j * w + i] + I[j * (w + 1) + i + 1] + I[(j + 1) * (w + 1) + i] - I[j * (w + 1) + i];
  }
  const lleno = (i0, j0, i1, j1) =>
    i0 >= 0 && j0 >= 0 && i1 <= w && j1 <= h &&
    I[j1 * (w + 1) + i1] - I[j0 * (w + 1) + i1] - I[j1 * (w + 1) + i0] + I[j0 * (w + 1) + i0] === (i1 - i0) * (j1 - j0);
  let cx = 0, cy = 0, n = 0;                              // centro de la zona = centro de masa de sus píxeles
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (mask[j * w + i]) { cx += i; cy += j; n++; }
  cx /= n; cy /= n;
  const hh = Math.round(ALTO / 2);
  for (let a = Math.round(pedido / 2); a > 0; a--) {      // a = media anchura de la caja, en px
    let mejor = null, mejorD = Infinity;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      if (!mask[j * w + i] || !lleno(i - a, j - hh, i + a, j + hh)) continue;
      const d = (i - cx) ** 2 + (j - cy) ** 2;
      if (d < mejorD) { mejorD = d; mejor = [x0 + i + 0.5, y0 + j + 0.5]; }
    }
    if (mejor) return { punto: mejor, ancho: 2 * a };
  }
  return { punto: [x0 + cx, y0 + cy], ancho: 0 };
}

// Badge en el borde derecho de la zona, a BADGE_Y de altura: del todo a la derecha para
// que sobresalga de la pegatina, pero no en el pico de arriba (ahí flotaba, lejos de la
// masa de la zona). La zona es conexa, así que esa fila existe seguro.
function sitioBadge(mask, w, h, x0, y0) {
  const filas = [];
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (mask[j * w + i]) { filas.push(j); break; }
  const arriba = filas[0], abajo = filas[filas.length - 1];   // en SVG la y crece hacia abajo
  const j = Math.round(abajo - BADGE_Y * (abajo - arriba));
  let i = w - 1;
  while (!mask[j * w + i]) i--;
  return [x0 + i + 0.5 + BADGE_FUERA, y0 + j + 0.5];
}

// El badge tapa lo que haya debajo, así que se le quita su disco a la zona antes de
// buscarle sitio a la etiqueta: son los dos únicos que se disputan la superficie.
function sinBadge(mask, w, h, x0, y0, [bx, by]) {
  const out = Uint8Array.from(mask);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const dx = x0 + i + 0.5 - bx, dy = y0 + j + 0.5 - by;
    if (dx * dx + dy * dy <= BADGE_R * BADGE_R) out[j * w + i] = 0;
  }
  return out;
}

// Encoge el conjunto de celdas g px en toda dirección (erosión con disco) → hueco
// entre pegatinas. Sobre la rejilla, un apéndice más fino que 2g simplemente
// desaparece; desplazando los bordes del polígono hacia dentro se invertía y salía
// un pincho.
function erosiona(mask, w, h, g) {
  const disco = [];
  for (let dj = -g; dj <= g; dj++) for (let di = -g; di <= g; di++) if (di * di + dj * dj <= g * g) disco.push([di, dj]);
  const out = new Uint8Array(w * h);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    if (!mask[j * w + i]) continue;
    const cabe = disco.every(([di, dj]) => {
      const ni = i + di, nj = j + dj;
      return ni >= 0 && ni < w && nj >= 0 && nj < h && mask[nj * w + ni];
    });
    if (cabe) out[j * w + i] = 1;
  }
  return out;
}

// Componente conexa (4-vecinos) más grande: descarta los trozos sueltos que deja el
// corte al cruzarse con un entrante de la provincia.
function mayorComponente(mask, w, h) {
  const visto = new Uint8Array(w * h);
  let mejor = [], total = 0;
  for (let k = 0; k < w * h; k++) {
    if (!mask[k]) continue;
    total++;
    if (visto[k]) continue;
    const pila = [k], celdas = [];
    visto[k] = 1;
    while (pila.length) {
      const c = pila.pop(); celdas.push(c);
      const i = c % w, j = (c - i) / w;
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const ni = i + di, nj = j + dj, nk = nj * w + ni;
        if (ni < 0 || nj < 0 || ni >= w || nj >= h || visto[nk] || !mask[nk]) continue;
        visto[nk] = 1; pila.push(nk);
      }
    }
    if (celdas.length > mejor.length) mejor = celdas;
  }
  const out = new Uint8Array(w * h);
  for (const c of mejor) out[c] = 1;
  return { mask: out, perdido: total - mejor.length };
}

// Traza el borde de un conjunto de celdas recorriendo las aristas de la rejilla con
// el interior siempre a la derecha; devuelve el anillo de mayor área. Al ser aristas
// de rejilla, el resultado es siempre un polígono simple: ni se cruza ni se solapa
// con el de la zona vecina.
function contorno(mask, w, h, x0, y0) {
  const en = (i, j) => i >= 0 && j >= 0 && i < w && j < h && mask[j * w + i];
  const salidas = new Map();                                  // "x,y" → puntos siguientes
  const arista = (a, b) => {
    const k = a.join(",");
    if (!salidas.has(k)) salidas.set(k, []);
    salidas.get(k).push(b);
  };
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    if (!en(i, j)) continue;
    if (!en(i, j - 1)) arista([i, j], [i + 1, j]);
    if (!en(i + 1, j)) arista([i + 1, j], [i + 1, j + 1]);
    if (!en(i, j + 1)) arista([i + 1, j + 1], [i, j + 1]);
    if (!en(i - 1, j)) arista([i, j + 1], [i, j]);
  }
  // En un vértice en silla (4 aristas) se elige el giro más a la derecha: es lo que
  // separa los dos lóbulos en vez de cruzarlos.
  const rumbo = (dir, desde, hasta) => {
    const cx = dir[0] * (hasta[1] - desde[1]) - dir[1] * (hasta[0] - desde[0]);
    if (cx > 0) return 3;                                     // derecha
    if (cx < 0) return 1;                                     // izquierda
    return dir[0] * (hasta[0] - desde[0]) + dir[1] * (hasta[1] - desde[1]) > 0 ? 2 : 0;
  };
  const anillos = [];
  while (salidas.size) {
    const inicio = salidas.keys().next().value;
    let cur = inicio.split(",").map(Number), dir = null;
    const anillo = [];
    while (true) {
      const k = cur.join(",");
      const opts = salidas.get(k);
      if (!opts?.length) break;
      let idx = 0;
      if (opts.length > 1 && dir) {
        let mejor = -1;
        opts.forEach((o, i) => { const r = rumbo(dir, cur, o); if (r > mejor) { mejor = r; idx = i; } });
      }
      const sig = opts.splice(idx, 1)[0];
      if (!opts.length) salidas.delete(k);
      anillo.push([x0 + cur[0], y0 + cur[1]]);
      dir = [sig[0] - cur[0], sig[1] - cur[1]];
      cur = sig;
      if (cur.join(",") === inicio) break;
    }
    if (anillo.length > 3) anillos.push(anillo);
  }
  return anillos.reduce((m, a) => (Math.abs(areaFirmada(a)) > Math.abs(areaFirmada(m)) ? a : m), anillos[0]);
}

// ---------- proyección ----------
const anilloExterior = (feat) => {
  const g = feat.geometry, polys = g.type === "MultiPolygon" ? g.coordinates : [g.coordinates];
  let mejor = null, area = -1;                          // el anillo exterior de mayor área
  for (const poly of polys) {
    const ring = poly[0], a = Math.abs(areaFirmada(ring));
    if (a > area) { area = a; mejor = ring; }
  }
  return mejor;
};

const geo = await (await fetch(FUENTE)).json();
const salida = {};

for (const [nombre, zonasCfg] of Object.entries(PROVINCIAS)) {
  const feat = geo.features.find((f) => f.properties.name === nombre);
  if (!feat) throw new Error(`No encuentro la provincia ${nombre} en el GeoJSON`);

  // Proyección equirectangular (corrige la longitud a la latitud media) → normalizar al lienzo.
  const ring = anilloExterior(feat);
  const latRef = ring.reduce((s, p) => s + p[1], 0) / ring.length;
  const K = Math.cos((latRef * Math.PI) / 180);
  const pts = ring.map(([lon, lat]) => [lon * K, lat]);
  const minX = Math.min(...pts.map((p) => p[0])), maxX = Math.max(...pts.map((p) => p[0]));
  const minY = Math.min(...pts.map((p) => p[1])), maxY = Math.max(...pts.map((p) => p[1]));
  const s = Math.min((VB_W - 2 * PAD) / (maxX - minX), (VB_H - 2 * PAD) / (maxY - minY));
  const usoW = (maxX - minX) * s, usoH = (maxY - minY) * s;
  const ox = (VB_W - usoW) / 2, oy = (VB_H - usoH) / 2;
  const svg = pts.map(([x, y]) => [ox + (x - minX) * s, oy + (maxY - y) * s]);   // norte arriba

  const provincia = simplifica(svg, TOL);
  const seeds = zonasCfg.map((z) => [ox + z.seed[0] * usoW, oy + z.seed[1] * usoH]);
  const rej = rejillaInterior(provincia);
  const { zonaDe, cuenta, objetivo } = reparte(rej, seeds);

  const zonas = zonasCfg.map((z, i) => {
    const bruta = new Uint8Array(rej.w * rej.h);
    for (let k = 0; k < zonaDe.length; k++) if (zonaDe[k] === i) bruta[k] = 1;
    const { mask, perdido } = mayorComponente(erosiona(bruta, rej.w, rej.h, GAP), rej.w, rej.h);
    if (perdido > cuenta[i] * 0.05) console.warn(`  ⚠️ ${z.id}: descarto ${perdido} px sueltos (mover la semilla)`);
    const zona = simplifica(contorno(mask, rej.w, rej.h, rej.x0, rej.y0), ESCALERA);
    const [bx, by] = sitioBadge(mask, rej.w, rej.h, rej.x0, rej.y0);
    const pedido = anchoNombre(z.nombre);
    const libre = sinBadge(mask, rej.w, rej.h, rej.x0, rej.y0, [bx, by]);
    const { punto: [cx, cy], ancho } = sitioEtiqueta(libre, rej.w, rej.h, rej.x0, rej.y0, pedido);
    const d = "M" + zona.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join("L") + "Z";
    console.log(`  ${z.id}: área ${(cuenta[i] / objetivo).toFixed(2)}× · ${zona.length} vértices · etiqueta ${ancho}×${ALTO}px`);
    return { id: z.id, nombre: z.nombre, path: d, label: [+cx.toFixed(1), +cy.toFixed(1)], badge: [+bx.toFixed(1), +by.toFixed(1)] };
  });

  salida[nombre] = { viewBox: `0 0 ${VB_W} ${VB_H}`, zonas };
  console.log(`${nombre}: contorno ${provincia.length} vértices, ${zonas.length} zonas\n`);
}

fs.writeFileSync(SALIDA, `// GENERADO por scripts/build-zonas-mapa.mjs — no editar a mano.
// Contorno real (muy poligonal) de cada provincia de /fuera-de-ruta, partido en zonas.
export type ZonaMapa = { id: string; nombre: string; path: string; label: [number, number]; badge: [number, number] };
export type ProvinciaMapa = { viewBox: string; zonas: ZonaMapa[] };
export const ZONAS_MAPA: Record<string, ProvinciaMapa> = ${JSON.stringify(salida)};
`);
console.log("OK zonas-mapa.ts");
