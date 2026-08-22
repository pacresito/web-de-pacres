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
 * Lo mismo pero cerrado, para poder rellenar la tierra: el punto que cae al otro lado del
 * horizonte no se suelta, se pega al limbo en su mismo azimut. Así la costa que se ve sigue
 * siendo exacta y lo que se va por detrás bordea el canto del globo, en vez de cortarlo con una
 * cuerda recta por dentro —que es lo que pasa si uno cierra los trozos sin más—.
 *
 * Los anillos vienen muestreados cada pocas décimas de grado, así que dos puntos escondidos
 * seguidos caen casi en el mismo azimut y la línea del borde sale pegada al limbo.
 */
export function alLimbo(lon0: number, lat0: number, r: number) {
  const f1 = lat0 * rad, sf1 = Math.sin(f1), cf1 = Math.cos(f1);
  return (lon: number, lat: number): [number, number] => {
    const f = lat * rad, l = (lon - lon0) * rad;
    const sf = Math.sin(f), cf = Math.cos(f);
    const x = cf * Math.sin(l), y = -(cf1 * sf - sf1 * cf * Math.cos(l));
    const detras = sf1 * sf + cf1 * cf * Math.cos(l) < 0;
    const k = detras ? r / (Math.hypot(x, y) || 1) : r;
    return [x * k, y * k];
  };
}

/**
 * El relleno de la tierra: los anillos que asoman, cerrados por el limbo.
 *
 * **El que no asoma nada no se dibuja.** Pegar al canto un anillo entero deja sus puntos
 * repartidos por la circunferencia, y eso no es una línea sobre el borde: es un polígono
 * inscrito en el círculo que rellena media cara visible. Vistas desde Chile hay 373 así —Eurasia
 * entera, África—, y entre todas oscurecían el mar.
 */
export function rellenoDelGlobo(anillos: number[][][], proy: ReturnType<typeof ortografica>, borde: ReturnType<typeof alLimbo>): string {
  let d = "";
  for (const anillo of anillos) {
    if (anillo.length < 3 || !anillo.some(([lon, lat]) => proy(lon, lat))) continue;
    d += "M" + anillo.map(([lon, lat]) => borde(lon, lat).map((n) => n.toFixed(1)).join(",")).join("L") + "Z";
  }
  return d;
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
