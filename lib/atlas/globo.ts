// La ortográfica del globo: la Tierra vista desde muy lejos, centrada en el país de la tarjeta.
//
// No se precalcula. Un globo por país serían 195 copias del mismo mundo; así va una sola
// (data/atlas/mundo.ts, en lon/lat) y el giro se hace aquí, que son cuatro senos por punto.
// Lógica pura: se verifica con `npx tsx lib/atlas/globo.test.ts`.

const rad = Math.PI / 180;

/**
 * Proyecta un punto sobre el globo centrado en (lon0, lat0) y radio r. Devuelve null si cae
 * al otro lado del horizonte: en una ortográfica media Tierra no se ve, y dibujarla la
 * plegaría sobre la cara visible.
 */
export function ortografica(lon0: number, lat0: number, r: number) {
  const f1 = lat0 * rad, sf1 = Math.sin(f1), cf1 = Math.cos(f1);
  return (lon: number, lat: number): [number, number] | null => {
    const f = lat * rad, l = (lon - lon0) * rad;
    const sf = Math.sin(f), cf = Math.cos(f);
    if (sf1 * sf + cf1 * cf * Math.cos(l) < 0) return null;
    return [r * cf * Math.sin(l), -r * (cf1 * sf - sf1 * cf * Math.cos(l))];
  };
}

/**
 * Los anillos que sobrevivan al horizonte, como un solo path SVG. Un anillo que lo cruza se
 * parte en trozos abiertos en vez de cerrarse: cerrarlo dibujaría una cuerda recta a través
 * del océano.
 */
export function pathDelGlobo(anillos: number[][][], proy: ReturnType<typeof ortografica>): string {
  let d = "";
  for (const anillo of anillos) {
    let trozo: string[] = [];
    const suelta = () => {
      if (trozo.length > 1) d += "M" + trozo.join("L");
      trozo = [];
    };
    for (const [lon, lat] of anillo) {
      const q = proy(lon, lat);
      if (q) trozo.push(`${q[0].toFixed(1)},${q[1].toFixed(1)}`);
      else suelta();
    }
    suelta();
  }
  return d;
}
