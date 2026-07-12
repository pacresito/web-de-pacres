// Genera data/viajes/zonas-mapa.ts: para cada provincia de /viajes, su contorno
// REAL pero muy poligonal (Douglas-Peucker agresivo) partido en zonas. El corte es
// un Voronoi de los puntos-semilla de cada zona, recortado al polígono de la
// provincia. Todo geometría pura (sin dependencias): semiplanos + Sutherland-Hodgman.
// Uso puntual: `node scripts/build-zonas-mapa.mjs`. NO editar la salida a mano.
import fs from "node:fs";

const FUENTE = "https://raw.githubusercontent.com/codeforgermany/click_that_hood/main/public/data/spain-provinces.geojson";
const SALIDA = new URL("../data/viajes/zonas-mapa.ts", import.meta.url);

const VB_W = 400, VB_H = 430, PAD = 22;      // lienzo de MapaZonas
const TOL = 18;                               // px de simplificación (chunky, muy poligonal pero reconocible)
const GAP = 10;                               // px que se encoge cada zona → hueco entre pegatinas

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
    { id: "sierra-de-guadarrama", nombre: "Sierra de Guadarrama", seed: [0.48, 0.30] },
    { id: "cuenca-del-manzanares", nombre: "Cuenca del Manzanares", seed: [0.76, 0.42] },
    { id: "sureste-vegas", nombre: "Sureste–Vegas", seed: [0.70, 0.76] },
    { id: "suroeste", nombre: "Suroeste", seed: [0.28, 0.70] },
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

const distSegmento = (p, a, b) => {              // distancia de p al segmento ab
  const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy;
  const t = l2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2)) : 0;
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
};

// Polo de inaccesibilidad: el punto interior más alejado de cualquier borde (mejor
// sitio para la etiqueta que el centroide en zonas estrechas). Muestreo por rejilla.
function poloInaccesible(poly) {
  const xs = poly.map((p) => p[0]), ys = poly.map((p) => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const paso = Math.min(maxX - minX, maxY - minY) / 40 || 1;
  let mejor = centroide(poly), mejorD = -1;
  for (let x = minX; x <= maxX; x += paso) for (let y = minY; y <= maxY; y += paso) {
    const p = [x, y];
    if (!dentro(p, poly)) continue;
    let d = Infinity;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) d = Math.min(d, distSegmento(p, poly[j], poly[i]));
    if (d > mejorD) { mejorD = d; mejor = p; }
  }
  return mejor;
}

// Encoge el polígono hacia dentro g px (offset con inglete acotado) → hueco entre zonas.
function encoge(poly, g) {
  const p = areaFirmada(poly) < 0 ? [...poly].reverse() : poly;   // CCW: interior a la izquierda
  const n = p.length, L = [];
  for (let i = 0; i < n; i++) {
    const a = p[i], b = p[(i + 1) % n];
    let dx = b[0] - a[0], dy = b[1] - a[1]; const len = Math.hypot(dx, dy) || 1; dx /= len; dy /= len;
    L.push({ px: a[0] - dy * g, py: a[1] + dx * g, dx, dy });     // borde desplazado hacia dentro
  }
  const out = [];
  for (let i = 0; i < n; i++) {
    const l1 = L[(i + n - 1) % n], l2 = L[i], den = l1.dx * l2.dy - l1.dy * l2.dx;
    let pt;
    if (Math.abs(den) < 1e-6) pt = [l2.px, l2.py];
    else { const t = ((l2.px - l1.px) * l2.dy - (l2.py - l1.py) * l2.dx) / den; pt = [l1.px + t * l1.dx, l1.py + t * l1.dy]; }
    const dxo = pt[0] - p[i][0], dyo = pt[1] - p[i][1], d = Math.hypot(dxo, dyo), max = g * 3;
    out.push(d > max ? [p[i][0] + (dxo / d) * max, p[i][1] + (dyo / d) * max] : pt);   // acota el inglete
  }
  return out;
}

const empuja = (p, desde, d) => {               // aleja p de `desde` d px (badge que sobresale)
  const dx = p[0] - desde[0], dy = p[1] - desde[1], l = Math.hypot(dx, dy) || 1;
  return [p[0] + (dx / l) * d, p[1] + (dy / l) * d];
};

// Recorta el polígono por el semiplano a*x + b*y <= c (Sutherland-Hodgman de un borde).
function recortaSemiplano(poly, a, b, c) {
  const out = [], val = (q) => a * q[0] + b * q[1] - c, EPS = 1e-9;
  for (let i = 0, n = poly.length; i < n; i++) {
    const cur = poly[i], prev = poly[(i + n - 1) % n], vc = val(cur), vp = val(prev);
    if (vc <= EPS) {
      if (vp > EPS) { const t = vp / (vp - vc); out.push([prev[0] + t * (cur[0] - prev[0]), prev[1] + t * (cur[1] - prev[1])]); }
      out.push(cur);
    } else if (vp <= EPS) {
      const t = vp / (vp - vc); out.push([prev[0] + t * (cur[0] - prev[0]), prev[1] + t * (cur[1] - prev[1])]);
    }
  }
  return out;
}

// Recorta un polígono (posiblemente cóncavo) por otro CONVEXO.
function recortaPorConvexo(subject, clip) {
  const cc = areaFirmada(clip) < 0 ? [...clip].reverse() : clip;   // asegurar CCW
  let poly = subject;
  for (let i = 0, n = cc.length; i < n && poly.length; i++) {
    const [x1, y1] = cc[i], [x2, y2] = cc[(i + 1) % n];
    poly = recortaSemiplano(poly, y2 - y1, -(x2 - x1), (y2 - y1) * x1 - (x2 - x1) * y1);
  }
  return poly;
}

// Celda de Voronoi de la semilla i: caja envolvente recortada por los bisectores.
function celdaVoronoi(i, seeds, caja) {
  let poly = caja;
  const [six, siy] = seeds[i];
  for (let j = 0; j < seeds.length; j++) {
    if (j === i) continue;
    const [sjx, sjy] = seeds[j];
    poly = recortaSemiplano(poly, 2 * (sjx - six), 2 * (sjy - siy), sjx * sjx + sjy * sjy - six * six - siy * siy);
  }
  return poly;
}

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
  const caja = [[ox, oy], [ox + usoW, oy], [ox + usoW, oy + usoH], [ox, oy + usoH]];   // bbox del contorno
  const seeds = zonasCfg.map((z) => [ox + z.seed[0] * usoW, oy + z.seed[1] * usoH]);

  const zonas = zonasCfg.map((z, i) => {
    const bruta = recortaPorConvexo(provincia, celdaVoronoi(i, seeds, caja));
    if (bruta.length < 3) throw new Error(`Zona vacía: ${nombre}/${z.id} (revisar semilla)`);
    const zona = encoge(bruta, GAP);
    const [cx, cy] = poloInaccesible(zona);
    // Badge en la esquina superior-derecha (máx x−y), empujado un poco hacia fuera para que sobresalga.
    const esq = zona.reduce((m, p) => (p[0] - p[1] > m[0] - m[1] ? p : m), zona[0]);
    const [bx, by] = empuja(esq, [cx, cy], 3);
    const d = "M" + zona.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join("L") + "Z";
    return { id: z.id, nombre: z.nombre, path: d, label: [+cx.toFixed(1), +cy.toFixed(1)], badge: [+bx.toFixed(1), +by.toFixed(1)] };
  });

  salida[nombre] = { viewBox: `0 0 ${VB_W} ${VB_H}`, zonas };
  console.log(`${nombre}: contorno ${provincia.length} vértices, ${zonas.length} zonas`);
}

fs.writeFileSync(SALIDA, `// GENERADO por scripts/build-zonas-mapa.mjs — no editar a mano.
// Contorno real (muy poligonal) de cada provincia de /viajes, partido en zonas.
export type ZonaMapa = { id: string; nombre: string; path: string; label: [number, number]; badge: [number, number] };
export type ProvinciaMapa = { viewBox: string; zonas: ZonaMapa[] };
export const ZONAS_MAPA: Record<string, ProvinciaMapa> = ${JSON.stringify(salida)};
`);
console.log("OK zonas-mapa.ts");
