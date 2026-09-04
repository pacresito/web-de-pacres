// De dónde salen los umbrales de scripts/atlas-anillo.mts. Fuera del build, como los tests:
// `ATLAS_CACHE=.cache-atlas/geo npx tsx scripts/atlas-anillo.medir.mts`
//
// Mide dos cosas y las dos deciden una constante:
//  - Por qué el techo es z10: cuánta de la ventana de un atolón sale a nivel del mar exacto en
//    cada zoom. Por encima de z10 terrarium rellena el mar con ceros y la batimetría se evapora.
//  - Qué hace cada isobata y cada margen en los cuatro países que llevan anillo: cuántos tramos
//    salen y cuánto crece el panel. El nivel y el margen se eligieron mirando la figura contra el
//    satélite, así que esto no dice cuál es el bueno — dice qué se movía al moverlo.
import { AJUSTES, caja, encuadres, laeaInv } from "./atlas-geo.mjs";
import { anilloDelPanel, teselaTerrarium } from "./atlas-anillo.mjs";

const rad = Math.PI / 180;

// Tarawa, Funafuti: dos atolones con laguna, uno grande y otro pequeño.
const ZONAS: [string, number, number][] = [["Tarawa", 173.0, 1.4], ["Funafuti", 179.2, -8.5]];

console.log("El techo de zoom — cuánto del entorno sale a 0 m exactos (mar relleno, no medido):\n");
for (const [nombre, lon, lat] of ZONAS) {
  const fila: string[] = [];
  for (const z of [9, 10, 11, 12]) {
    const n = 2 ** z * 256;
    const mx = ((((lon / 360 + 0.5) % 1) + 1) % 1) * n;
    const my = (0.5 - Math.log(Math.tan(Math.PI / 4 + (lat * rad) / 2)) / (2 * Math.PI)) * n;
    const t = await teselaTerrarium(z, Math.floor(mx / 256), Math.floor(my / 256));
    let ceros = 0;
    for (const v of t) if (v === 0) ceros++;
    fila.push(`z${z} ${((ceros / t.length) * 100).toFixed(0).padStart(3)} %`);
  }
  console.log(`  ${nombre.padEnd(9)} ${fila.join(" · ")}`);
}

console.log("\nIsobata y margen, país a país — tramos y lado del panel que lo lleva:\n");
const conAnillo = Object.entries(AJUSTES).filter(([, a]) => a.anillo).map(([id]) => id);
for (const id of conAnillo) {
  const base = AJUSTES[id].anillo!;
  const e = (await encuadres()).find((x) => x.id === id)!;
  const panel = base.paneles?.[0] ?? 0;
  const g = e.grupos[panel];
  const aLonLat = (x: number, y: number) => laeaInv(x, y, g.lon0, g.lat0);
  const lado = (anillos: [number, number][][]) => {
    const b = caja([...g.proy, ...anillos]);
    return Math.round(Math.max(b.x1 - b.x0, b.y1 - b.y0));
  };
  const filas: string[] = [];
  for (const nivel of [-50, -200, -500, -1000])
    filas.push(`${String(nivel).padStart(5)} m: ${String((await anilloDelPanel(g.proy, aLonLat, { ...base, nivel })).length).padStart(2)} tramos, ${String(lado(await anilloDelPanel(g.proy, aLonLat, { ...base, nivel }))).padStart(4)} km`);
  console.log(`  ${e.nombre} · isobata`);
  for (const f of filas) console.log(`      ${f}`);
  const margenes: string[] = [];
  for (const margen of [3, 6, 12, 25]) {
    const a = await anilloDelPanel(g.proy, aLonLat, { ...base, margen });
    margenes.push(`+${String(margen).padStart(2)} km: ${String(a.length).padStart(2)} tramos, ${String(lado(a)).padStart(4)} km`);
  }
  console.log(`  ${e.nombre} · margen del recorte`);
  for (const f of margenes) console.log(`      ${f}`);
}
