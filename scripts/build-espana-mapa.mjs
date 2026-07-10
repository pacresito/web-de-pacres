// Genera data/viajes/espana-mapa.ts (paths SVG de las provincias de España) para
// el mapa de entrada de /viajes. Descarga el GeoJSON de provincias, lo proyecta
// (equirectangular con corrección de latitud) y lleva Canarias a un inset abajo a
// la izquierda. Uso puntual: `node scripts/build-espana-mapa.mjs`.
import fs from "node:fs";

const FUENTE = "https://raw.githubusercontent.com/codeforgermany/click_that_hood/main/public/data/spain-provinces.geojson";
const SALIDA = new URL("../data/viajes/espana-mapa.ts", import.meta.url);

const geo = await (await fetch(FUENTE)).json();

const latRef = 40;
const K = Math.cos((latRef * Math.PI) / 180); // aplasta la longitud a la latitud de España
const rawx = (lon) => lon * K;

const W = 1000;          // ancho objetivo del lienzo peninsular
const PAD = 24;
const MIN_STEP = 1.1;    // px: descarta puntos más juntos que esto (simplificación)

const coordsDe = (feat) => {
  const g = feat.geometry;
  const polys = g.type === "MultiPolygon" ? g.coordinates : [g.coordinates];
  return polys.flat(2);
};
// Península + Baleares vs Canarias (lon < -11): las Canarias van a un inset.
const esCanaria = (feat) => Math.min(...coordsDe(feat).map((p) => p[0])) < -11;

function boundsDe(feats) {
  let minX = Infinity, maxX = -Infinity, minLat = Infinity, maxLat = -Infinity;
  for (const f of feats) for (const [lon, lat] of coordsDe(f)) {
    minX = Math.min(minX, rawx(lon)); maxX = Math.max(maxX, rawx(lon));
    minLat = Math.min(minLat, lat); maxLat = Math.max(maxLat, lat);
  }
  return { minX, maxX, minLat, maxLat };
}

const mainland = geo.features.filter((f) => !esCanaria(f));
const canarias = geo.features.filter(esCanaria);

const bm = boundsDe(mainland);
const S = (W - 2 * PAD) / (bm.maxX - bm.minX);
const Hpen = (bm.maxLat - bm.minLat) * S + 2 * PAD;

const bc = boundsDe(canarias);
const INSET_W = 210;
const Sc = (INSET_W - 16) / (bc.maxX - bc.minX);
const insetH = (bc.maxLat - bc.minLat) * Sc + 16;
const insetX = PAD;
const insetY = Hpen - insetH - PAD;

const projMain = (lon, lat) => [(rawx(lon) - bm.minX) * S + PAD, (bm.maxLat - lat) * S + PAD];
const projCan = (lon, lat) => [insetX + 8 + (rawx(lon) - bc.minX) * Sc, insetY + 8 + (bc.maxLat - lat) * Sc];

function pathDe(feat, proj) {
  const g = feat.geometry;
  const polys = g.type === "MultiPolygon" ? g.coordinates : [g.coordinates];
  let d = "";
  let minx = Infinity, maxx = -Infinity, miny = Infinity, maxy = -Infinity;
  for (const poly of polys) for (const ring of poly) {
    let last = null; const out = [];
    for (let i = 0; i < ring.length; i++) {
      const [x, y] = proj(ring[i][0], ring[i][1]);
      const keep = i === 0 || i === ring.length - 1 || !last || Math.hypot(x - last[0], y - last[1]) >= MIN_STEP;
      if (keep) { out.push([x, y]); last = [x, y]; minx = Math.min(minx, x); maxx = Math.max(maxx, x); miny = Math.min(miny, y); maxy = Math.max(maxy, y); }
    }
    if (out.length < 3) continue;
    d += "M" + out.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join("L") + "Z";
  }
  return { d, cx: +((minx + maxx) / 2).toFixed(1), cy: +((miny + maxy) / 2).toFixed(1) };
}

const prov = (f, proj) => ({ name: f.properties.name, ccaa: f.properties.cod_ccaa, ...pathDe(f, proj) });
const provincias = [
  ...mainland.map((f) => prov(f, projMain)),
  ...canarias.map((f) => prov(f, projCan)),
];

const out = {
  viewBox: `0 0 ${W} ${Hpen.toFixed(1)}`,
  inset: { x: +insetX.toFixed(1), y: +insetY.toFixed(1), w: INSET_W, h: +insetH.toFixed(1) },
  provincias,
};

fs.writeFileSync(SALIDA, `// GENERADO por scripts/build-espana-mapa.mjs — no editar a mano.
// Paths SVG de las provincias de España para el mapa de entrada de /viajes.
export const MAPA_ESPANA = ${JSON.stringify(out)} as const;
`);
console.log("OK espana-mapa.ts | provincias", provincias.length, "| viewBox", out.viewBox);
