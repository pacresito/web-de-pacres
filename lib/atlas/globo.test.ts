// Test de lógica pura: `npx tsx lib/atlas/globo.test.ts`. Fuera del build.
import assert from "assert";
import { alLimbo, ortografica, pathDelGlobo, rellenoDelGlobo } from "./globo";

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

console.log("globo: ok");
