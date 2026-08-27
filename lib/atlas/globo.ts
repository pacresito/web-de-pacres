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

/**
 * Los umbrales del enganche, **en píxeles de pantalla**: lo que decide es lo cerca que estaba el
 * dedo, no a qué escala se pintó el dibujo. Quien los traduce a unidades del `viewBox` es
 * `unidad`, y por eso el mismo toque abarca más mundo en el globo pequeño que en el grande.
 */
const GRACIA = 10;  // radio de cortesía de los que no se pueden pinchar
const DIMINUTO = 5; // por debajo de este lado, un país no tiene forma a la que apuntar
const CERCA = 15;   // hasta dónde se busca al vecino cuando el toque cae en el mar

/** Distancia de un punto a un segmento. Los anillos traen tramos rectos largos —las fronteras de
 *  Egipto o Libia son dos vértices—, donde medir al vértice más próximo se iría por decenas de
 *  kilómetros. */
function aSegmento(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax, dy = by - ay, largo = dx * dx + dy * dy;
  const t = largo ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / largo)) : 0;
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/**
 * Qué país engancha un toque sobre el globo. Devuelve su `id`, o null si no engancha nada.
 *
 * **El test corre en el espacio proyectado**, con la misma `ortografica` que dibujó el globo: así
 * no hay que invertir la proyección ni normalizar el antimeridiano —Rusia va de una pieza mire uno
 * desde donde mire—, y lo que está detrás del horizonte no se puede enganchar porque no está.
 *
 * **El enganche no tiene que ser correcto, solo plausible.** En este globo 88 países de 195 miden
 * menos de 16 px y 29 no tienen ni contorno, así que acertar el país pinchando su forma no se
 * puede construir. Quien dice si sabía dónde estaba el país es quien juega, con sus botones; esto
 * solo pone la marca donde señaló.
 *
 * El orden de preferencia:
 * 1. **El que contiene el toque**, y el más pequeño de ellos si el mapa los solapa: el grande
 *    tiene otros mil píxeles donde pincharlo y el pequeño no tiene ninguno.
 * 2. **De los que no tienen forma a la que apuntar, el más cercano.** Son los 29 que el mapa de
 *    baja resolución no trae y los que miden menos de 5 px, que no se pueden pinchar aunque uno
 *    sepa dónde están. Sin este paso, el toque junto a Bahrein se lo lleva la costa de Arabia
 *    Saudí, que queda más cerca.
 * 3. **El más cercano**, para el toque que cae en el mar o en tierra de nadie —Groenlandia, el
 *    Sáhara Occidental, la Antártida—, que si no dejaría el dedo en el vacío.
 * 4. Nada: el toque no engancha y se vuelve a intentar.
 *
 * **Quien contiene va antes que el pequeño, y eso se midió.** Al revés —el diminuto ganando
 * siempre en su radio de gracia— el toque en el centro del globo, que es el sitio exacto de la
 * respuesta, enganchaba al vecino en 17 países de 195: el Vaticano le robaba el centro a Italia,
 * Luxemburgo a Bélgica, Liechtenstein a Austria y a Suiza. Con el contorno por delante son 8, y
 * los ocho son países cuyo centro cae de verdad en el vecino —Croacia dentro de Bosnia, Noruega
 * dentro de Suecia—, que no lo arregla ninguna regla. Los sin forma no pierden nada: en su propio
 * globo su punto cae clavado en el centro, así que el toque los toca y ganan por el paso 1.
 *
 * `puntos` son los países que el mapa de baja resolución no trae —Malta, Mónaco, Singapur…—, que
 * entran por su centro y con lado cero, así que caen siempre en el primer paso.
 */
export function enganche(
  anillos: { id: string; r: number[][] }[],
  puntos: { id: string; lon: number; lat: number }[],
  proy: ReturnType<typeof ortografica>,
  borde: ReturnType<typeof alLimbo>,
  [tx, ty]: [number, number],
  unidad: number,
): string | null {
  const gracia = GRACIA * unidad, diminuto = DIMINUTO * unidad, cerca = CERCA * unidad;

  // Por país: a qué distancia quedó el toque (0 si cayó dentro) y su caja proyectada, que es de
  // donde sale el lado con el que se comparan entre sí.
  const cajas = new Map<string, { dist: number; x0: number; x1: number; y0: number; y1: number }>();
  const apuntar = (id: string, dist: number, x0: number, x1: number, y0: number, y1: number) => {
    const c = cajas.get(id);
    if (!c) return void cajas.set(id, { dist, x0, x1, y0, y1 });
    c.dist = Math.min(c.dist, dist);
    c.x0 = Math.min(c.x0, x0); c.x1 = Math.max(c.x1, x1);
    c.y0 = Math.min(c.y0, y0); c.y1 = Math.max(c.y1, y1);
  };

  for (const { id, r } of anillos) {
    // Sin `id` es tierra que no es de nadie: se ve, pero no hay país que enganchar.
    if (!id || r.length < 3) continue;
    // El que no asoma nada se descarta por lo mismo que no se dibuja: pegado entero al canto es un
    // polígono inscrito en el círculo, y engancharía media cara visible.
    if (!r.some(([lon, lat]) => proy(lon, lat))) continue;
    const pts = r.map(([lon, lat]) => borde(lon, lat));
    let dentro = false, dist = Infinity;
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j];
      if ((yi > ty) !== (yj > ty) && tx < ((xj - xi) * (ty - yi)) / (yj - yi) + xi) dentro = !dentro;
      dist = Math.min(dist, aSegmento(tx, ty, xi, yi, xj, yj));
      x0 = Math.min(x0, xi); x1 = Math.max(x1, xi); y0 = Math.min(y0, yi); y1 = Math.max(y1, yi);
    }
    apuntar(id, dentro ? 0 : dist, x0, x1, y0, y1);
  }

  for (const { id, lon, lat } of puntos) {
    const q = proy(lon, lat);
    if (q) apuntar(id, Math.hypot(q[0] - tx, q[1] - ty), q[0], q[0], q[1], q[1]);
  }

  const lado = (c: { x0: number; x1: number; y0: number; y1: number }) => Math.max(c.x1 - c.x0, c.y1 - c.y0);
  let elegido: string | null = null;

  let menor = Infinity;
  for (const [id, c] of cajas) {
    const l = lado(c);
    if (c.dist === 0 && l < menor) { menor = l; elegido = id; }
  }
  if (elegido) return elegido;

  // Entre los que no tienen forma manda la distancia, no el tamaño: son todos igual de
  // impinchables, así que lo único que los ordena es cuál estaba más cerca del dedo. Con el
  // tamaño por delante, el Vaticano le ganaba el centro a San Marino desde seis píxeles.

  let min = gracia;
  for (const [id, c] of cajas) {
    if (c.dist <= min && lado(c) < diminuto) { min = c.dist; elegido = id; }
  }
  if (elegido) return elegido;

  min = cerca;
  for (const [id, c] of cajas) if (c.dist <= min) { min = c.dist; elegido = id; }
  return elegido;
}

/** Radio de la Tierra en km, para pasar de distancia a arco. */
const TIERRA = 6371;

/**
 * Un punto al azar a menos de `km` del que se le da.
 *
 * Es donde se planta el globo de la tarjeta, y no en el país: centrado, la respuesta cae siempre
 * en el centro del disco y marcar ahí acierta sin saber nada. Desviado, hay que saber en qué
 * dirección cae, que es justo lo que se está preguntando.
 *
 * La raíz reparte el sorteo **por área**: sin ella se amontonaría cerca del centro, que es de
 * donde se quiere huir.
 */
export function desviar(lon: number, lat: number, km: number, azar: () => number = Math.random): [number, number] {
  const d = (km * Math.sqrt(azar())) / TIERRA;
  const rumbo = azar() * 2 * Math.PI;
  const f1 = lat * rad, sd = Math.sin(d), cd = Math.cos(d);
  const f2 = Math.asin(Math.sin(f1) * cd + Math.cos(f1) * sd * Math.cos(rumbo));
  const l2 = lon * rad + Math.atan2(Math.sin(rumbo) * sd * Math.cos(f1), cd - Math.sin(f1) * Math.sin(f2));
  return [(((l2 / rad + 540) % 360) - 180), f2 / rad];
}
