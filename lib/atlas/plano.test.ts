// npx tsx lib/atlas/plano.test.ts
import assert from "node:assert";
import { pathDelPlano, plano, type Marco } from "./plano";

const EUROPA: Marco = [-25, 34, 60, 72];

{
  const { w, h, xy } = plano(EUROPA);
  assert.equal(h, 38);
  // El ancho va encogido por el coseno de la latitud media (53°): 85° de longitud miden mucho
  // menos que 85° de latitud. Sin esto, el continente sale estirado a lo ancho.
  assert.ok(w < 85 * 0.61 && w > 85 * 0.59, `ancho corregido: ${w}`);
  assert.deepEqual(xy(-25, 72), [0, 0]);           // la esquina noroeste es el origen
  assert.ok(xy(60, 34)[1] === 38);                 // y la sureste, el fondo
}

{
  // Un anillo fuera del marco no se dibuja; uno que lo cruza, entero (lo recorta el viewBox).
  const fuera = [[[-160, 20], [-150, 20], [-150, 30], [-160, 20]]];
  const cruza = [[[50, 60], [90, 60], [90, 65], [50, 60]]];
  assert.equal(pathDelPlano(fuera, EUROPA), "");
  assert.ok(pathDelPlano(cruza, EUROPA).startsWith("M"));
  assert.equal(pathDelPlano(cruza, EUROPA).match(/L/g)?.length, 3);
}

{
  // Oceanía se pasa del antimeridiano: lo que llega en negativo cae por el este, no fuera.
  const OCEANIA: Marco = [110, -48, 205, 12];
  const { w, xy } = plano(OCEANIA);
  assert.equal(xy(-172, -14)[0], xy(188, -14)[0]);       // Samoa, por los dos nombres del mismo sitio
  assert.ok(xy(-172, -14)[0] > 0 && xy(-172, -14)[0] < w);
  assert.ok(xy(150, -25)[0] < xy(-172, -14)[0]);         // y Australia sigue a su izquierda
  // Ni el que cruza el borde oeste —Java entra en el marco de Oceanía por 110°— ni Sudamérica,
  // que está en las antípodas y con la costura mal puesta rayaba el mapa de lado a lado.
  const sudamerica = [[[-73, -20], [-40, -20], [-40, -10], [-73, -20]]];
  assert.equal(pathDelPlano(sudamerica, OCEANIA), "");
  // Y un anillo que cruza el borde oeste del marco tampoco se parte: Java entra por 110°.
  const java = [[[105, -7], [115, -7], [115, -6], [105, -7]]];
  const xsJava = pathDelPlano(java, OCEANIA).match(/-?\d+\.\d+(?=,)/g)!.map(Number);
  assert.ok(Math.max(...xsJava) - Math.min(...xsJava) < 15, `sin raya de lado a lado: ${xsJava}`);
  // Un anillo que cruza el antimeridiano no se parte: sus dos mitades caen seguidas.
  const cruza = [[[179, -17], [-179, -17], [-179, -16], [179, -17]]];
  const xs = pathDelPlano(cruza, OCEANIA).match(/-?\d+\.\d+(?=,)/g)!.map(Number);
  assert.ok(Math.max(...xs) - Math.min(...xs) < 5, `las dos mitades van juntas: ${xs}`);
}

console.log("plano: ok");
