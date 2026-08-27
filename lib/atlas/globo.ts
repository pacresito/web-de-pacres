// La ortográfica del globo: la Tierra vista desde muy lejos, centrada en el país de la tarjeta.
//
// No se precalcula. Un globo por país serían 195 copias del mismo mundo; así va una sola
// (data/atlas/mundo.ts, en lon/lat) y el giro se hace aquí, que son cuatro senos por punto.
// Lógica pura: se verifica con `npx tsx lib/atlas/globo.test.ts`.

const rad = Math.PI / 180;

/** Un punto proyectado: dónde se pinta, y si de verdad se ve. */
export type Punto = [x: number, y: number, visible: boolean];
export type Proyeccion = (lon: number, lat: number) => Punto;

/**
 * Proyecta un punto sobre el globo centrado en (lon0, lat0) y radio r.
 *
 * **Lo que cae al otro lado del horizonte no se suelta: se pega al limbo en su mismo azimut**, y
 * viene marcado como no visible. Quien traza una costa se salta esos puntos —en una ortográfica
 * media Tierra no se ve, y dibujarla la plegaría sobre la cara visible—; quien rellena tierra los
 * usa tal cual, y así lo que se va por detrás bordea el canto del globo en vez de cortarlo con
 * una cuerda recta por dentro, que es lo que pasa si uno cierra los trozos sin más.
 *
 * Los anillos vienen muestreados cada pocas décimas de grado, así que dos puntos escondidos
 * seguidos caen casi en el mismo azimut y la línea del borde sale pegada al limbo.
 */
export function ortografica(lon0: number, lat0: number, r: number): Proyeccion {
  const f1 = lat0 * rad, sf1 = Math.sin(f1), cf1 = Math.cos(f1);
  return (lon, lat) => {
    const f = lat * rad, l = (lon - lon0) * rad;
    const sf = Math.sin(f), cf = Math.cos(f), cl = Math.cos(l);
    const x = r * cf * Math.sin(l), y = -r * (cf1 * sf - sf1 * cf * cl);
    if (sf1 * sf + cf1 * cf * cl >= 0) return [x, y, true];
    const k = r / (Math.hypot(x, y) || 1);
    return [x * k, y * k, false];
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
export function rellenoDelGlobo(anillos: number[][][], proy: Proyeccion): string {
  let d = "";
  for (const anillo of anillos) {
    if (anillo.length < 3) continue;
    const pts = anillo.map(([lon, lat]) => proy(lon, lat));
    if (!pts.some(([, , visible]) => visible)) continue;
    d += "M" + pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join("L") + "Z";
  }
  return d;
}

/**
 * Los anillos que sobrevivan al horizonte, como un solo path SVG. Un anillo que lo cruza se
 * parte en trozos abiertos en vez de cerrarse: cerrarlo dibujaría una cuerda recta a través
 * del océano.
 */
export function pathDelGlobo(anillos: number[][][], proy: Proyeccion): string {
  let d = "";
  for (const anillo of anillos) {
    let trozo: string[] = [];
    const suelta = () => {
      if (trozo.length > 1) d += "M" + trozo.join("L");
      trozo = [];
    };
    for (const [lon, lat] of anillo) {
      const [x, y, visible] = proy(lon, lat);
      if (visible) trozo.push(`${x.toFixed(1)},${y.toFixed(1)}`);
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
export const UMBRALES = {
  /** Radio de cortesía alrededor del punto de los que no tienen forma. */
  gracia: 6,
  /** Hasta dónde se busca al vecino cuando el toque cae en el mar. */
  cerca: 15,
  /**
   * En cuántas partes puede morder la cortesía al país que tiene el dedo dentro. El punto de
   * Liechtenstein vive dentro de Suiza, que en el globo mide ocho píxeles: sin recortarla, seis de
   * radio dejan a Suiza en el 10% de sí misma.
   *
   * **Un octavo.** Con él, un toque dentro de un país se lo lleva él el 99,3% de las veces: Suiza
   * conserva el 92% de su superficie e Italia —que tiene dentro al Vaticano y a San Marino— el
   * 89%, cuando sin recortar nada se quedarían en el 10% y el 70%. Lo pagan los que no tienen
   * forma, que bajan de 762 enganches de 928 a 704, y sobre todo Liechtenstein: un píxel de radio
   * dentro de una Suiza de ocho, lo justo para que su sitio exacto siga siendo suyo.
   *
   * Es la perilla del precio y el radio la de lo que se regala, así que se miran juntos: la tabla
   * del medidor los cruza.
   */
  mordisco: 8,
};

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
 * **El enganche no tiene que ser correcto, solo plausible.** En este globo 96 países de los 195 no
 * llegan a 16 px de ancho en pantalla, y 29 de ellos no tienen ni contorno, así que acertar el país
 * pinchando su forma no se puede construir. Quien dice si sabía dónde estaba el país es quien
 * juega, con sus botones; esto solo pone la marca donde señaló.
 *
 * El orden de preferencia:
 * 1. **De los que se dibujan como punto, el más cercano dentro del radio de gracia.** La cortesía
 *    la cobra el que no tiene forma a la que apuntar, y solo él: cuando la cobraba todo lo que
 *    saliera pequeño, Palestina se quedaba con los toques de dentro de Israel, y Luxemburgo con
 *    los de Bélgica —países que sí se dibujan, y a los que se puede apuntar—.
 * 2. **El que contiene el toque**, y el más pequeño de ellos si el mapa los solapa.
 * 3. **El más cercano**, para el toque que cae en el mar o en tierra de nadie —Groenlandia, el
 *    Sáhara Occidental, la Antártida—, que si no dejaría el dedo en el vacío.
 * 4. Nada: el toque no engancha y se vuelve a intentar.
 *
 * **El punto va antes que el contorno porque si no es inalcanzable.** El de Andorra cae dentro del
 * polígono de España y el de Liechtenstein dentro del de Suiza, así que con el contorno delante hay
 * que clavarles el toque encima: fallando por cinco píxeles, los que no tienen forma se enganchan
 * 505 veces de 928 sin cortesía y 704 con ella.
 *
 * **El radio son seis píxeles: el más pequeño que llega al máximo.** De siete en adelante no se
 * engancha ni uno más —704 de 928 con seis, con siete y con diez— y por debajo solo se pierde: con
 * cinco son 656. Lo que cuesta no lo decide el radio sino el mordisco, así que los dos se miran
 * juntos: subir uno cambia lo que conviene en el otro.
 *
 * **Los números salen de `npx tsx lib/atlas/globo.medir.ts`** —el globo grande en un móvil, cuatro
 * desvíos por país— y hay que volver a sacarlos al mover un umbral, o este párrafo se queda
 * diciendo lo que el código ya no hace.
 *
 * `puntos` son esos países sin forma. **Se le pasan los mismos que el globo dibuja**, ni uno más:
 * enganchar uno que no se ve sería premiar la suerte, y el que se ve tiene que responder.
 */
export function enganche(
  anillos: { id: string; r: number[][] }[],
  puntos: { id: string; lon: number; lat: number }[],
  proy: Proyeccion,
  [tx, ty]: [number, number],
  unidad: number,
  // Inyectables solo para poder calibrarlos: `globo.medir.ts` los mueve para justificar con
  // números los que hay puestos. Quien dibuja no los toca.
  umbrales = UMBRALES,
): string | null {
  const cerca = umbrales.cerca * unidad;

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
    const pts = r.map(([lon, lat]) => proy(lon, lat));
    // El que no asoma nada se descarta por lo mismo que no se dibuja: pegado entero al canto es un
    // polígono inscrito en el círculo, y engancharía media cara visible.
    if (!pts.some(([, , visible]) => visible)) continue;
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
    const [x, y, visible] = proy(lon, lat);
    if (visible) apuntar(id, Math.hypot(x - tx, y - ty), x, x, y, y);
  }

  const lado = (c: { x0: number; x1: number; y0: number; y1: number }) => Math.max(c.x1 - c.x0, c.y1 - c.y0);

  // El más pequeño de los que contienen el toque, que el mapa a veces los solapa. Sale primero
  // porque su tamaño es lo que encoge la cortesía.
  let contenedor: string | null = null, menor = Infinity;
  for (const [id, c] of cajas) {
    const l = lado(c);
    if (c.dist === 0 && l < menor) { menor = l; contenedor = id; }
  }

  /** El más cercano al dedo de entre los `candidatos`, si alguno cae dentro de `tope`. */
  const masCerca = (candidatos: Iterable<string>, tope: number): string | null => {
    let elegido: string | null = null;
    for (const id of candidatos) {
      const c = cajas.get(id);
      if (c && c.dist <= tope) { tope = c.dist; elegido = id; }
    }
    return elegido;
  };

  // Entre los puntos manda la distancia: son todos igual de impinchables, así que lo único que
  // los ordena es cuál estaba más cerca del dedo. Con el tamaño por delante, el más chico de dos
  // vecinos se llevaba también los toques del sitio del otro.
  const cortesia = Math.min(umbrales.gracia * unidad, contenedor ? menor / umbrales.mordisco : Infinity);
  return masCerca(puntos.map((p) => p.id), cortesia) ?? contenedor ?? masCerca(cajas.keys(), cerca);
}

/** Radio de la Tierra en km, para pasar de distancia a arco. */
const TIERRA = 6371;

/** Grados de arco entre dos puntos del globo. */
export function gradosEntre(lonA: number, latA: number, lonB: number, latB: number): number {
  const f1 = latA * rad, f2 = latB * rad;
  const cos = Math.sin(f1) * Math.sin(f2) + Math.cos(f1) * Math.cos(f2) * Math.cos((lonB - lonA) * rad);
  return Math.acos(Math.min(1, Math.max(-1, cos))) / rad;
}

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
