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

console.log("plano: ok");
