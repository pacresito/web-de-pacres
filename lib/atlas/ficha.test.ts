// npx tsx lib/atlas/ficha.test.ts
import assert from "node:assert";
import { escalaDelNombre, km2 } from "./ficha";
import { PAISES } from "./paises";

// Lo que cabe en una línea no encoge; lo que cabe en dos, tampoco: la ficha reserva dos.
assert.equal(escalaDelNombre("España"), 1);
assert.equal(escalaDelNombre("Bosnia y Herzegovina"), 1);
// Y lo que no cabe encoge lo justo, no hasta el suelo. Hoy es uno de los 195: el Congo.
const congo = escalaDelNombre("República Democrática del Congo");
assert.ok(congo < 1 && congo > 0.55, `el Congo encoge lo justo: ${congo}`);
assert.deepEqual(PAISES.filter((p) => escalaDelNombre(p.nombre) < 1).map((p) => p.nombre),
                 ["República Democrática del Congo"]);

// La cuenta va por palabras enteras, que es lo que hace el navegador al partir el renglón: una
// palabra sola no se parte y por eso no encoge. Vale porque ninguna llega a los 15 caracteres de
// la línea —la más larga es «Centroafricana», con 14—, y un renombrado que se pasara se saldría
// de la columna sin que la escala pudiera hacer nada.
assert.equal(escalaDelNombre("Supercalifragilisticoespialidoso"), 1);
const largas = PAISES.flatMap((p) => p.nombre.split(" ")).filter((w) => w.length > 15);
assert.deepEqual(largas, [], "una palabra más larga que la línea se sale de la columna");

// La superficie: punto de miles, y dos decimales solo por debajo de 10 km², que es donde el
// redondeo dejaría a Tuvalu en «25» o a Mónaco en «2».
assert.equal(km2(1_221_037), "1.221.037");
assert.equal(km2(719), "719");
assert.equal(km2(25.14), "25");
assert.equal(km2(2.03), "2,03");

console.log("ficha: ok");
