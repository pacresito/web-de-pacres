// Test de lógica pura: `npx tsx lib/arbol/fotos.test.ts`. Fuera del build.
// Lee seed/arbol.json (gitignoreado, datos privados): sin él no hay nada que verificar.
import assert from "assert";
import { readFileSync } from "fs";
import { resolve } from "path";
import { claveDeFoto, cuantasFotos, encuadreDe, FOTOS, fotosDe, nombreDeArchivo, rotuloDeFoto, type Foto } from "./fotos";
import { construirGrafo } from "./grafo";
import { comoSeLlama } from "./personas";
import type { ArbolData } from "./tree";

const data: ArbolData = JSON.parse(readFileSync(resolve("seed/arbol.json"), "utf-8"));
const g = construirGrafo(data);

// Las fotos siguen siendo de quien dicen
// Es lo único que las protege: los ids del árbol cuentan apariciones y no gente, y uno que
// cambiara de dueño colgaría la cara de alguien de la ficha de otro sin que fallara nada.
for (const f of FOTOS) {
  for (const quien of f.gente) {
    const p = g.personaPorId.get(quien.id);
    assert.ok(p, `${quien.nombre} (${quien.id}) ya no está en el árbol`);
    assert.strictEqual(comoSeLlama(p, "familiar"), quien.nombre, `${quien.id} ya no es ${quien.nombre}`);
  }
  // Y nadie sale dos veces en la misma foto: sería la misma cara en dos recuadros, y la
  // ficha enseñaría uno de ellos sin decir cuál.
  const ids = f.gente.map((q) => q.id);
  assert.strictEqual(new Set(ids).size, ids.length, `${claveDeFoto(f)} repite a alguien`);
}

// Y ninguna pisa a otra: la clave sale de la foto y del año, así que dos del mismo año del
// mismo dueño se sobrescribirían en el blob. El día que pase, hay que desempatar con el mes.
const claves = FOTOS.map(claveDeFoto);
assert.strictEqual(new Set(claves).size, claves.length, `dos fotos comparten clave: ${claves.join(", ")}`);

// El recuadro, ya en CSS
// Sin recuadro no hay estilo que poner: el marco la centra él con `object-fit`, que no
// necesita saber cuánto mide la foto.
assert.strictEqual(encuadreDe(undefined), undefined);
// La mitad izquierda de una foto: se estira al doble del marco y no se desplaza.
assert.deepStrictEqual(encuadreDe({ x: 0, y: 0, lado: 0.5 }), { width: "200%", left: "0%", top: "0%" });
// Y un recuadro que empieza a un cuarto del ancho se va fuera del marco esa misma distancia,
// ya medida en el marco: un cuarto de foto es media anchura de marco cuando el lado es 0.5.
assert.deepStrictEqual(encuadreDe({ x: 0.25, y: 0.1, lado: 0.5 }), {
  width: "200%",
  left: "-50%",
  top: "-20%",
});

// El rótulo del link
const foto = (tomada: string): Foto => ({ tomada, gente: [{ id: "j1", nombre: "Juguete" }] });

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
  foto("2009"),
  foto("1989"),
  { tomada: "1999", gente: [{ id: "j2", nombre: "Otro" }] },
  // La de varios: sale en las de los dos, con la misma clave y un recuadro para cada uno.
  {
    titulo: "La Venta de La Paloma",
    tomada: "1999",
    gente: [
      { id: "j1", nombre: "Juguete", recuadro: { x: 0.1, y: 0.2, lado: 0.25 } },
      { id: "j2", nombre: "Otro" },
    ],
  },
];
FOTOS.push(...inventadas);

const suyas = fotosDe("j1", quien);
assert.deepStrictEqual(
  suyas.map((f) => f.rotulo),
  ["de bebé", "con 10 años", "con 20 años"],
  "las suyas y solo las suyas, de la más joven a la más vieja",
);
assert.strictEqual(suyas[2].clave, "j1-2009");
// La de varios no se llama por nadie: lleva su título, y es la misma para los dos.
assert.strictEqual(suyas[1].clave, "la-venta-de-la-paloma-1999");
assert.strictEqual(fotosDe("j2", quien).at(-1)!.clave, "la-venta-de-la-paloma-1999");
assert.strictEqual(suyas[1].cuantos, 2, "la ficha sabe que hay a quien reconocer");
// Y cada uno la ve por su recuadro; quien no tiene, por el centro.
assert.deepStrictEqual(suyas[1].encuadre, { width: "400%", left: "-40%", top: "-80%" });
assert.strictEqual(fotosDe("j2", quien).at(-1)!.encuadre, undefined);
// La descarga de una de varios se llama por la foto: lo que se lleva es la familia entera.
assert.ok(
  decodeURIComponent(suyas[1].url).endsWith("/La Venta de La Paloma, 1999.jpg"),
  suyas[1].url,
);
// El nombre viaja en la URL porque es lo único que respetan por igual el «guardar imagen»
// del móvil y el clic derecho del escritorio.
assert.ok(
  decodeURIComponent(suyas[2].url).endsWith("/Pablo Crespo García (1989) - Foto con 20 años (tomada en 2009).jpg"),
  suyas[2].url,
);
assert.deepStrictEqual(fotosDe("j3", quien), [], "quien no tiene fotos no tiene campo");

// Cuántas tiene cada uno, que es lo que el nodo enseña durante el repaso.
const cuantas = cuantasFotos();
assert.strictEqual(cuantas.get("j1"), 3, "las tres suyas, con título y sin él");
assert.strictEqual(cuantas.get("j2"), 2);
// Quien no sale en ninguna no está en la cuenta: el nodo lo pinta en blanco, no con un cero.
assert.strictEqual(cuantas.get("j3"), undefined);

FOTOS.length -= inventadas.length;

console.log("fotos.test.ts ✓");
