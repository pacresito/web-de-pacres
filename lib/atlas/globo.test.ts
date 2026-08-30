// Test de lógica pura: `npx tsx lib/atlas/globo.test.ts`. Fuera del build.
import assert from "assert";
import { desviar, enganche, gradosEntre, ortografica, pathDelGlobo, rellenoDelGlobo } from "./globo";

const R = 100;
const cerca = (a: number, b: number, msg: string) => assert.ok(Math.abs(a - b) < 0.001, `${msg}: ${a} vs ${b}`);
const pos = ([x, y]: [number, number, boolean]): [number, number] => [x, y];

// El centro del globo cae en el centro del círculo.
const enMadrid = ortografica(-3.7, 40.4, R);
const c = enMadrid(-3.7, 40.4);
cerca(c[0], 0, "x del centro"); cerca(c[1], 0, "y del centro");
assert.ok(c[2], "y se ve");

// Un punto al norte sube (la y del SVG crece hacia abajo, y aquí ya va invertida).
assert.ok(enMadrid(-3.7, 50)[1] < 0, "el norte va arriba");
assert.ok(enMadrid(-3.7, 30)[1] > 0, "el sur va abajo");
assert.ok(enMadrid(10, 40.4)[0] > 0, "el este va a la derecha");

// Las antípodas no se ven: media Tierra queda detrás y dibujarla la plegaría sobre la cara
// visible, que es el error clásico de las ortográficas.
assert.strictEqual(enMadrid(176.3, -40.4)[2], false);
// El horizonte —lo que está a 90° de distancia angular— cae justo sobre la circunferencia.
// Se comprueba en el ecuador, que es donde 90° de longitud SON 90° de distancia: desde una
// latitud alta, un cuarto de vuelta de longitud se queda muy corto.
const enGuinea = ortografica(0, 0, R);
const horizonte = enGuinea(90, 0);
assert.ok(horizonte[2] && Math.abs(Math.hypot(horizonte[0], horizonte[1]) - R) < 0.001, "el horizonte cae en el borde");
assert.ok(Math.hypot(...pos(enMadrid(86.3, 40.4))) < R, "a esa latitud, 90° de longitud aún se ven");

// Nada se sale del círculo, mire donde mire: lo de detrás del horizonte, tampoco, que viene ya
// pegado al canto.
const enPolo = ortografica(0, 90, R);
for (let lon = -180; lon <= 180; lon += 17) for (let lat = -90; lat <= 90; lat += 11) {
  const q = enPolo(lon, lat);
  assert.ok(Math.hypot(q[0], q[1]) <= R + 1e-9, `(${lon},${lat}) se sale del globo`);
}

// Un anillo que cruza el horizonte se parte en trozos abiertos: si se cerrara, aparecería una
// cuerda recta atravesando el océano.
const meridiano = [[[-3.7, -80], [-3.7, 0], [-3.7, 80], [176.3, 80], [176.3, 0], [176.3, -80]]];
const d = pathDelGlobo(meridiano, enMadrid);
assert.ok(d.startsWith("M") && !d.includes("Z"), "los trozos del globo no se cierran");
assert.strictEqual((d.match(/M/g) ?? []).length, 1, "solo el trozo visible");

// El relleno cierra los anillos pegando al limbo lo que se va por detrás: la costa que se ve
// queda igual, y lo escondido no cruza el globo por dentro.
{
  const escondido = enMadrid(176.3, -40.4);
  cerca(Math.hypot(escondido[0], escondido[1]), R, "lo de detrás se pega al canto");
  // Un anillo que cruza el horizonte sale de una pieza y sin salirse del círculo.
  const anillo = [[-3.7, 40.4], [80, 20], [176.3, -40.4], [-80, 10], [-3.7, 40.4]];
  const d = rellenoDelGlobo([anillo], enMadrid);
  assert.equal((d.match(/M/g) ?? []).length, 1, "un anillo, un trozo");
  assert.ok(d.endsWith("Z"), "y cerrado");
  const puntos = d.slice(1, -1).split("L").map((par) => par.split(",").map(Number));
  assert.ok(puntos.every(([x, y]) => Math.hypot(x, y) <= R + 0.1), "nada se sale del globo");
  // Y el anillo que no asoma nada no se dibuja: pegado entero al canto sería un polígono
  // inscrito en el círculo, que rellena media cara visible.
  const antipodas = [[170, -40], [-170, -45], [-175, -35], [170, -40]];
  assert.equal(rellenoDelGlobo([antipodas], enMadrid), "", "lo que no se ve no se pinta");
}

// El enganche, sobre un mundo de mentira centrado en el golfo de Guinea, donde un grado son 1,75
// px con R=100 y las cuentas se pueden hacer de cabeza.
{
  const proy = enGuinea;
  const caja = (lon0: number, lat0: number, ancho: number) =>
    [[lon0, lat0], [lon0 + ancho, lat0], [lon0 + ancho, lat0 + ancho], [lon0, lat0 + ancho], [lon0, lat0]];
  const anillos = [
    { id: "grande", r: caja(-10, -10, 20) },  // 35 px de lado
    { id: "chico", r: caja(2, 2, 0.5) },      // 0,9 px, y dentro del grande
    { id: "", r: caja(28, 28, 4) },           // tierra de nadie: se ve y no se engancha
    { id: "detras", r: caja(170, -2, 4) },    // al otro lado del horizonte
  ];
  // Los que se dibujan como punto, que son los únicos que cobran cortesía.
  const puntos = [
    { id: "dentro", lon: -3, lat: -3 },   // dentro del grande
    { id: "mar", lon: 12.2, lat: 2 },     // en el mar, junto a la costa del grande
    { id: "enano", lon: 2.2, lat: 2.2 },  // dentro del chico, que mide 0,9 px
    { id: "lejos", lon: -25, lat: -25 },
    { id: "vecino", lon: -24, lat: -25 },
  ];
  const en = (lon: number, lat: number, unidad = 1) => enganche(anillos, puntos, proy, pos(proy(lon, lat)), unidad);

  assert.strictEqual(en(-8, -8), "grande", "dentro del grande y lejos de todo punto");
  // De los que contienen el toque gana el pequeño: el grande tiene otros mil píxeles donde
  // pincharlo y el pequeño no tiene ninguno.
  assert.strictEqual(en(2.25, 2.4), "chico", "el chico gana dentro del grande");
  // El punto gana al país que lo contiene, y desde cerca: el de Andorra cae dentro del polígono
  // de España, así que sin esto sería inalcanzable salvo clavándole el toque encima.
  assert.strictEqual(en(-2.9, -3), "dentro", "el punto gana al que lo contiene");
  // En el mar, el punto se lleva el toque aunque la costa quede tres veces más cerca: a la costa
  // se le puede apuntar y al punto no.
  assert.strictEqual(en(10.5, 2), "mar", "el punto gana a la costa que tiene al lado");
  // Pero la cortesía no puede morder más de un octavo del país que tiene el dedo dentro: el
  // enano vive en un país de 0,9 px, así que su radio ahí es de una décima.
  assert.strictEqual(en(2.45, 2.2), "chico", "la cortesía se encoge con el país de debajo");
  // Sin ningún punto cerca, manda el vecino de verdad.
  assert.strictEqual(en(0, 14), "grande", "en el mar, el más cercano");
  // Y con el globo pintado más pequeño, los mismos píxeles de pantalla abarcan menos mundo: el
  // punto del mar se queda fuera y el toque vuelve a la costa.
  assert.strictEqual(en(10.5, 2, 0.4), "grande", "los umbrales van en píxeles de pantalla, no del dibujo");
  assert.strictEqual(en(-24.9, -24.9), "lejos", "el que no tiene forma engancha por su punto");
  assert.strictEqual(en(-24.1, -25), "vecino", "de los que no tienen forma, el más cercano");
  assert.strictEqual(en(30, 30), null, "lejos de todo no engancha, ni la tierra sin país");
  // Lo escondido tras el horizonte no está: pegarlo al canto lo haría enganchable desde el mar.
  for (let lon = -20; lon <= 20; lon += 5) assert.notStrictEqual(en(lon, 20), "detras", "no se engancha lo que no se ve");
}

// La desviación del centro del globo: cae siempre dentro del radio pedido, nunca justo encima, y
// vale igual en el polo y en el antimeridiano, donde las cuentas ingenuas se rompen.
{
  const arco = (a: [number, number], b: [number, number]) => gradosEntre(a[0], a[1], b[0], b[1]);
  // Y el arco en sí: el ecuador entero son 180°, y un punto consigo mismo, cero.
  cerca(gradosEntre(0, 0, 180, 0), 180, "las antípodas por el ecuador");
  cerca(gradosEntre(-3.7, 40.4, -3.7, 40.4), 0, "un punto consigo mismo");
  cerca(gradosEntre(0, 0, 0, 20), 20, "veinte grados de meridiano");
  let enElCentro = 0;
  for (const centro of [[-3.7, 40.4], [179.5, 66], [0, 89], [-179.9, -20]] as [number, number][]) {
    for (let i = 0; i < 400; i++) {
      const q = desviar(centro[0], centro[1], 20);
      assert.ok(q[0] >= -180 && q[0] <= 180 && q[1] >= -90 && q[1] <= 90, `(${q}) no es un punto del mundo`);
      assert.ok(arco(centro, q) <= 20.001, `se fue a ${arco(centro, q).toFixed(1)}°`);
      if (arco(centro, q) < 5) enElCentro++;
    }
  }
  // Repartido por área, un cuarto del radio es un dieciseisavo del disco: si se amontonara en el
  // centro —que es de lo que se huye— este número se dispararía.
  assert.ok(enElCentro < 1600 * 0.12, `demasiados en el centro: ${enElCentro} de 1600`);
  // Sin azar no hay desvío: el punto se queda donde estaba.
  const quieto = desviar(10, 20, 20, () => 0);
  cerca(quieto[0], 10, "sin azar no se mueve la longitud");
  cerca(quieto[1], 20, "sin azar no se mueve la latitud");
}

console.log("globo: ok");
