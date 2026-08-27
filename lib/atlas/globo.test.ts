// Test de lógica pura: `npx tsx lib/atlas/globo.test.ts`. Fuera del build.
import assert from "assert";
import { alLimbo, desviar, enganche, gradosEntre, ortografica, pathDelGlobo, rellenoDelGlobo } from "./globo";

const R = 100;
const cerca = (a: number, b: number, msg: string) => assert.ok(Math.abs(a - b) < 0.001, `${msg}: ${a} vs ${b}`);

// El centro del globo cae en el centro del círculo.
const enMadrid = ortografica(-3.7, 40.4, R);
const c = enMadrid(-3.7, 40.4)!;
cerca(c[0], 0, "x del centro"); cerca(c[1], 0, "y del centro");

// Un punto al norte sube (la y del SVG crece hacia abajo, y aquí ya va invertida).
assert.ok(enMadrid(-3.7, 50)![1] < 0, "el norte va arriba");
assert.ok(enMadrid(-3.7, 30)![1] > 0, "el sur va abajo");
assert.ok(enMadrid(10, 40.4)![0] > 0, "el este va a la derecha");

// Las antípodas no se ven: media Tierra queda detrás y dibujarla la plegaría sobre la cara
// visible, que es el error clásico de las ortográficas.
assert.strictEqual(enMadrid(176.3, -40.4), null);
// El horizonte —lo que está a 90° de distancia angular— cae justo sobre la circunferencia.
// Se comprueba en el ecuador, que es donde 90° de longitud SON 90° de distancia: desde una
// latitud alta, un cuarto de vuelta de longitud se queda muy corto.
const enGuinea = ortografica(0, 0, R);
const borde = enGuinea(90, 0);
assert.ok(borde && Math.abs(Math.hypot(borde[0], borde[1]) - R) < 0.001, "el horizonte cae en el borde");
assert.ok(Math.hypot(...enMadrid(86.3, 40.4)!) < R, "a esa latitud, 90° de longitud aún se ven");

// Nada dentro del globo se sale del círculo, mire donde mire.
const enPolo = ortografica(0, 90, R);
for (let lon = -180; lon <= 180; lon += 17) for (let lat = -90; lat <= 90; lat += 11) {
  const q = enPolo(lon, lat);
  if (q) assert.ok(Math.hypot(q[0], q[1]) <= R + 1e-9, `(${lon},${lat}) se sale del globo`);
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
  const borde = alLimbo(-3.7, 40.4, R);
  const visible = borde(-3.7, 40.4);
  cerca(visible[0], 0, "el centro sigue en el centro");
  const escondido = borde(176.3, -40.4);
  cerca(Math.hypot(escondido[0], escondido[1]), R, "lo de detrás se pega al canto");
  // Un anillo que cruza el horizonte sale de una pieza y sin salirse del círculo.
  const anillo = [[-3.7, 40.4], [80, 20], [176.3, -40.4], [-80, 10], [-3.7, 40.4]];
  const d = rellenoDelGlobo([anillo], enMadrid, borde);
  assert.equal((d.match(/M/g) ?? []).length, 1, "un anillo, un trozo");
  assert.ok(d.endsWith("Z"), "y cerrado");
  const puntos = d.slice(1, -1).split("L").map((par) => par.split(",").map(Number));
  assert.ok(puntos.every(([x, y]) => Math.hypot(x, y) <= R + 0.1), "nada se sale del globo");
  // Y el anillo que no asoma nada no se dibuja: pegado entero al canto sería un polígono
  // inscrito en el círculo, que rellena media cara visible.
  const antipodas = [[170, -40], [-170, -45], [-175, -35], [170, -40]];
  assert.equal(rellenoDelGlobo([antipodas], enMadrid, borde), "", "lo que no se ve no se pinta");
}

// El enganche, sobre un mundo de mentira centrado en el golfo de Guinea, donde un grado son 1,75
// px con R=100 y las cuentas se pueden hacer de cabeza.
{
  const proy = enGuinea, borde = alLimbo(0, 0, R);
  const caja = (lon0: number, lat0: number, ancho: number) =>
    [[lon0, lat0], [lon0 + ancho, lat0], [lon0 + ancho, lat0 + ancho], [lon0, lat0 + ancho], [lon0, lat0]];
  const anillos = [
    { id: "grande", r: caja(-10, -10, 20) },  // 35 px de lado
    { id: "chico", r: caja(2, 2, 0.5) },      // 0,9 px, y dentro del grande
    { id: "isla", r: caja(12, 2, 0.5) },      // 0,9 px, y en el mar
    { id: "", r: caja(28, 28, 4) },           // tierra de nadie: se ve y no se engancha
    { id: "detras", r: caja(170, -2, 4) },    // al otro lado del horizonte
  ];
  const puntos = [{ id: "punto", lon: -25, lat: -25 }, { id: "vecino", lon: -24, lat: -25 }];
  const en = (lon: number, lat: number, unidad = 1) => enganche(anillos, puntos, proy, borde, proy(lon, lat)!, unidad);

  assert.strictEqual(en(-8, -8), "grande", "dentro del grande y lejos del resto");
  // De los que contienen el toque gana el pequeño: el grande tiene otros mil píxeles donde
  // pincharlo y el pequeño no tiene ninguno.
  assert.strictEqual(en(2.25, 2.25), "chico", "el diminuto gana dentro del grande");
  // Fuera de todo contorno entra el radio de gracia, y ahí el que no tiene forma se lleva el
  // toque aunque el grande esté seis veces más cerca: al grande se le puede apuntar.
  assert.strictEqual(en(10.5, 5), "isla", "el que no tiene forma gana en el mar");
  // El país sin contorno entra por su centro, con lado cero.
  assert.strictEqual(en(-24.9, -24.9), "punto", "el que no tiene forma engancha por su punto");
  assert.strictEqual(en(-24.1, -25), "vecino", "de los que no tienen forma, el más cercano");
  // Sin nadie cerca a quien no se pueda apuntar, manda el vecino de verdad.
  assert.strictEqual(en(0, 14), "grande", "en el mar, el más cercano");
  // El mismo toque con el globo pintado a un tercio: los 10 px de gracia abarcan ahora 30
  // unidades del dibujo, y el diminuto que quedaba fuera se lleva el enganche.
  assert.strictEqual(en(0, 14, 3), "chico", "los umbrales van en píxeles de pantalla, no del dibujo");
  assert.strictEqual(en(30, 30), null, "lejos de todo no engancha, ni la tierra sin país");
  // Lo escondido tras el horizonte no está: pegarlo al canto lo haría enganchable desde el mar.
  for (let lon = -20; lon <= 20; lon += 5) assert.notStrictEqual(en(lon, 20), "detras", "no se engancha lo que no se ve");
}

// La desviación del centro del globo: cae siempre dentro del radio pedido, nunca justo encima, y
// vale igual en el polo y en el antimeridiano, donde las cuentas ingenuas se rompen.
{
  const arco = (a: [number, number], b: [number, number]) => gradosEntre(a[0], a[1], b[0], b[1]) * (Math.PI / 180) * 6371;
  // Y el arco en sí: el ecuador entero son 180°, y un punto consigo mismo, cero.
  cerca(gradosEntre(0, 0, 180, 0), 180, "las antípodas por el ecuador");
  cerca(gradosEntre(-3.7, 40.4, -3.7, 40.4), 0, "un punto consigo mismo");
  cerca(gradosEntre(0, 0, 0, 20), 20, "veinte grados de meridiano");
  let enElCentro = 0;
  for (const centro of [[-3.7, 40.4], [179.5, 66], [0, 89], [-179.9, -20]] as [number, number][]) {
    for (let i = 0; i < 400; i++) {
      const q = desviar(centro[0], centro[1], 2000);
      assert.ok(q[0] >= -180 && q[0] <= 180 && q[1] >= -90 && q[1] <= 90, `(${q}) no es un punto del mundo`);
      assert.ok(arco(centro, q) <= 2000.001, `se fue a ${arco(centro, q).toFixed(0)} km`);
      if (arco(centro, q) < 500) enElCentro++;
    }
  }
  // Repartido por área, un cuarto del radio es un dieciseisavo del disco: si se amontonara en el
  // centro —que es de lo que se huye— este número se dispararía.
  assert.ok(enElCentro < 1600 * 0.12, `demasiados en el centro: ${enElCentro} de 1600`);
  // Sin azar no hay desvío: el punto se queda donde estaba.
  const quieto = desviar(10, 20, 2000, () => 0);
  cerca(quieto[0], 10, "sin azar no se mueve la longitud");
  cerca(quieto[1], 20, "sin azar no se mueve la latitud");
}

console.log("globo: ok");
