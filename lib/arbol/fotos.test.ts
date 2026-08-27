// Test de lógica pura: `npx tsx lib/arbol/fotos.test.ts`. Fuera del build.
// Lee seed/arbol.json (gitignoreado, datos privados): sin él no hay nada que verificar.
import assert from "assert";
import { readFileSync } from "fs";
import { resolve } from "path";
import { claveDeFoto, FOTOS, fotosDe, nombreDeArchivo, rotuloDeFoto, type Foto } from "./fotos";
import { construirGrafo } from "./grafo";
import { comoSeLlama } from "./personas";
import type { ArbolData } from "./tree";

const data: ArbolData = JSON.parse(readFileSync(resolve("seed/arbol.json"), "utf-8"));
const g = construirGrafo(data);

// Las fotos siguen siendo de quien dicen
// Es lo único que las protege: los ids del árbol cuentan apariciones y no gente, y uno que
// cambiara de dueño colgaría la cara de alguien de la ficha de otro sin que fallara nada.
for (const f of FOTOS) {
  const p = g.personaPorId.get(f.id);
  assert.ok(p, `${f.nombre} (${f.id}) ya no está en el árbol`);
  assert.strictEqual(comoSeLlama(p, "familiar"), f.nombre, `${f.id} ya no es ${f.nombre}`);
}

// Y ninguna pisa a otra: la clave sale del dueño y del año, así que dos fotos del mismo año
// del mismo dueño se sobrescribirían en el blob. El día que pase, hay que desempatar con el mes.
const claves = FOTOS.map(claveDeFoto);
assert.strictEqual(new Set(claves).size, claves.length, `dos fotos comparten clave: ${claves.join(", ")}`);

// El rótulo del link
const foto = (tomada: string): Foto => ({ id: "j1", nombre: "Juguete", tomada });

assert.strictEqual(rotuloDeFoto(foto("2009"), "1989"), "con 20 años");
assert.strictEqual(rotuloDeFoto(foto("1990"), "1989"), "con 1 año");
// Cumplir cero años es haber nacido, y así se dice: nadie llama a esa foto «con 0 años».
assert.strictEqual(rotuloDeFoto(foto("1989"), "1989"), "de bebé");
// Sin nacimiento no hay edad que restar, así que la foto se sitúa por su año.
assert.strictEqual(rotuloDeFoto(foto("1975")), "en 1975");
// Con el mes la cuenta sale clavada; con solo el año se cuenta por años naturales, que es
// lo que ya hace todo el árbol con las fechas a las que les falta el día.
assert.strictEqual(rotuloDeFoto(foto("1975-08-12"), "1955-12-03"), "con 19 años");
assert.strictEqual(rotuloDeFoto(foto("1975"), "1955-12-03"), "con 20 años");

// El nombre de la descarga
const quien = { nombreCompleto: "Pablo Crespo García", birth: "1989-05-31" };

assert.strictEqual(
  nombreDeArchivo(foto("2009"), quien),
  "Pablo Crespo García (1989) - Foto con 20 años (tomada en 2009).jpg",
);
assert.strictEqual(
  nombreDeArchivo(foto("1989"), quien),
  "Pablo Crespo García (1989) - Foto de bebé (tomada en 1989).jpg",
);
// Sin nacimiento se cae el paréntesis del principio con el «con N años»: quedaría un hueco
// preguntando por un dato que no consta, y el nombre de un archivo no es sitio para eso.
assert.strictEqual(
  nombreDeArchivo(foto("1975"), { nombreCompleto: "Joaquín Crespo" }),
  "Joaquín Crespo - Foto tomada en 1975.jpg",
);

// Lo que le llega a la ficha, ya resuelto y en orden
const inventadas: Foto[] = [
  { id: "j1", nombre: "Juguete", tomada: "2009" },
  { id: "j1", nombre: "Juguete", tomada: "1989" },
  { id: "j2", nombre: "Otro", tomada: "1999" },
];
FOTOS.push(...inventadas);

const suyas = fotosDe("j1", quien);
assert.deepStrictEqual(
  suyas.map((f) => f.rotulo),
  ["de bebé", "con 20 años"],
  "las suyas y solo las suyas, de la más joven a la más vieja",
);
assert.strictEqual(suyas[1].clave, "j1-2009");
// El nombre viaja en la URL porque es lo único que respetan por igual el «guardar imagen»
// del móvil y el clic derecho del escritorio.
assert.ok(
  decodeURIComponent(suyas[1].url).endsWith("/Pablo Crespo García (1989) - Foto con 20 años (tomada en 2009).jpg"),
  suyas[1].url,
);
assert.deepStrictEqual(fotosDe("j3", quien), [], "quien no tiene fotos no tiene campo");

FOTOS.length -= inventadas.length;

console.log("fotos.test.ts ✓");
