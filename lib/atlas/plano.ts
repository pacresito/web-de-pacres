// El plano del minimapa de explorar: un trozo de mundo en lon/lat, con el ancho corregido por
// el coseno de la latitud media. A escala de un continente no hace falta más —una proyección
// de verdad no se notaría—, pero sin la corrección Europa sale aplastada de norte a sur.
//
// Lógica pura: se verifica con `npx tsx lib/atlas/plano.test.ts`.

/** El marco del minimapa: [lon0, lat0, lon1, lat1], esquina suroeste y noreste. */
export type Marco = [number, number, number, number];

/**
 * Un marco puede pasarse de los 180° por el este —Oceanía va de 110 a 205— y entonces sus
 * longitudes de la otra mitad del mundo llegan en negativo: Samoa está en -172, que es 188. Cada
 * longitud se lleva a la media vuelta centrada en el marco, así que lo que está al otro lado del
 * antimeridiano cae por el este, que es donde está de verdad.
 *
 * **La costura va en las antípodas del marco, no en su borde.** Un anillo con puntos a los dos
 * lados de la costura se parte con una raya de un extremo a otro del mapa, así que la costura
 * tiene que caer lo más lejos posible de lo que se mira: puesta en el borde oeste, el meridiano
 * roto le pasaba por encima a Sudamérica y el mapa de Oceanía salía rayado.
 */
const enElMarco = (lon: number, centro: number) =>
  lon < centro - 180 ? lon + 360 : lon > centro + 180 ? lon - 360 : lon;

export function plano([lon0, lat0, lon1, lat1]: Marco) {
  const k = Math.cos((((lat0 + lat1) / 2) * Math.PI) / 180);
  const centro = (lon0 + lon1) / 2;
  return {
    w: (lon1 - lon0) * k,
    h: lat1 - lat0,
    xy: (lon: number, lat: number): [number, number] => [(enElMarco(lon, centro) - lon0) * k, lat1 - lat],
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
  const centro = (lon0 + lon1) / 2;
  let d = "";
  for (const anillo of anillos) {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const [crudo, lat] of anillo) {
      const lon = enElMarco(crudo, centro);
      if (lon < x0) x0 = lon;
      if (lon > x1) x1 = lon;
      if (lat < y0) y0 = lat;
      if (lat > y1) y1 = lat;
    }
    if (x1 < lon0 || x0 > lon1 || y1 < lat0 || y0 > lat1) continue;
    // Y el que aun así salga dando la vuelta al mundo es uno partido por la costura: está en las
    // antípodas del marco y lo único que dibujaría es su propia raya. Rusia, que se sale del de
    // Europa por el este a propósito, ocupa 178° y no llega a esto.
    if (x1 - x0 > 270) continue;
    d += "M" + anillo.map(([lon, lat]) => xy(lon, lat).map((n) => n.toFixed(2)).join(",")).join("L") + "Z";
  }
  return d;
}
