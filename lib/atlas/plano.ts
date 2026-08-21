// El plano del minimapa de explorar: un trozo de mundo en lon/lat, con el ancho corregido por
// el coseno de la latitud media. A escala de un continente no hace falta más —una proyección
// de verdad no se notaría—, pero sin la corrección Europa sale aplastada de norte a sur.
//
// Lógica pura: se verifica con `npx tsx lib/atlas/plano.test.ts`.

/** El marco del minimapa: [lon0, lat0, lon1, lat1], esquina suroeste y noreste. */
export type Marco = [number, number, number, number];

export function plano([lon0, lat0, lon1, lat1]: Marco) {
  const k = Math.cos((((lat0 + lat1) / 2) * Math.PI) / 180);
  return {
    w: (lon1 - lon0) * k,
    h: lat1 - lat0,
    xy: (lon: number, lat: number): [number, number] => [(lon - lon0) * k, lat1 - lat],
  };
}

/**
 * Los anillos que rozan el marco, como un solo path cerrado. Lo que se sale lo recorta el
 * viewBox del SVG, que es lo que hay que ver de Rusia en un mapa de Europa: que se sale.
 *
 * Se descarta por caja el anillo que no toca el marco. El mundo son miles de anillos y un
 * continente roza unos cientos: sin este filtro, cada país de la ficha recorrería el planeta.
 */
export function pathDelPlano(anillos: number[][][], marco: Marco): string {
  const [lon0, lat0, lon1, lat1] = marco;
  const { xy } = plano(marco);
  let d = "";
  for (const anillo of anillos) {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const [lon, lat] of anillo) {
      if (lon < x0) x0 = lon;
      if (lon > x1) x1 = lon;
      if (lat < y0) y0 = lat;
      if (lat > y1) y1 = lat;
    }
    if (x1 < lon0 || x0 > lon1 || y1 < lat0 || y0 > lat1) continue;
    d += "M" + anillo.map(([lon, lat]) => xy(lon, lat).map((n) => n.toFixed(2)).join(",")).join("L") + "Z";
  }
  return d;
}
