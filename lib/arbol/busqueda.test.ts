// Test de lógica pura: `npx tsx lib/arbol/busqueda.test.ts`. Fuera del build.
// Lee seed/arbol.json (gitignoreado, datos privados): sin él no hay nada que verificar.
import assert from "assert";
import { readFileSync } from "fs";
import { resolve } from "path";
import { acortar, buscar, IGUALES, losSinNombre, type Resultado } from "./busqueda";
import { construirGrafo, pasosDesde } from "./grafo";
import { contextoEntero, libretaDe, SIN_NOMBRE } from "./identidad";
import type { ArbolData, Persona, Union } from "./tree";

const persona = (id: string, nombre: string, sexo?: Persona["sexo"], apellidos: string[] = []): Persona => ({
  id,
  nombre,
  apellidos,
  sexo,
  fuentes: [],
});
const union = (id: string, partners: string[], children: string[]): Union => ({
  id,
  partners,
  children,
  tipo: "matrimonio",
  fuentes: [],
});

// Un abuelo con apellido, un hijo que lo hereda sin que conste, una nieta que se llama casi
// como el abuelo y una cuarta sin nombre, que solo existe por su pareja.
const juguete: ArbolData = {
  people: [
    persona("abuelo", "Ramón", "h", ["Muñoz"]),
    persona("padre", "Tomás", "h"),
    persona("nieta", "Ramona", "m"),
    persona("nadie", SIN_NOMBRE),
  ],
  unions: [union("u1", ["abuelo"], ["padre"]), union("u2", ["padre", "nadie"], ["nieta"])],
  roots: {},
};
const g = construirGrafo(juguete);
const o = { linaje: libretaDe(g).linaje, pasos: pasosDesde(g, "nieta") };
const ids = (consulta: string) => buscar(g, consulta, o).map((r) => r.id);
const vias = (consulta: string) => buscar(g, consulta, o).map((r): [string, Resultado["via"]] => [r.id, r.via]);

assert.deepStrictEqual(
  vias("Ramón"),
  [
    ["nieta", "nombre"],
    ["abuelo", "nombre"],
    ["padre", "familia"],
  ],
  "«Ramón» empieza «Ramona» y el padre es hijo de él: primero quien se llama así, y dentro, quien está más cerca",
);
assert.deepStrictEqual(ids("ramon"), ["nieta", "abuelo", "padre"], "sin tildes se busca lo mismo");
assert.deepStrictEqual(ids("amon"), [], "y solo por el principio de la palabra: no se busca por el medio");
assert.deepStrictEqual(ids("muñoz"), ["nieta", "padre", "abuelo"], "el apellido deducido del árbol se busca como el escrito");
assert.deepStrictEqual(ids("ramon muñoz"), ["nieta", "abuelo"], "las dos palabras tienen que casar");
assert.deepStrictEqual(
  vias("tomas"),
  [
    ["padre", "nombre"],
    ["nieta", "familia"],
    ["nadie", "familia"],
    ["abuelo", "familia"],
  ],
  "quien se llama así va antes que su hija, su mujer y su padre, que son quienes lo nombran",
);
assert.deepStrictEqual(ids("hija de Tomás"), ["nieta"], "la relación se busca tal como se lee en la segunda línea");
assert.deepStrictEqual(ids(""), [], "sin consulta no hay resultados: el vacío es el índice, no la lista entera");

assert.deepStrictEqual(ids("Sin nombre"), [], "a quien no tiene nombre no se llega tecleando el que no tiene");
assert.deepStrictEqual(
  losSinNombre(g, o).map((r) => [r.id, r.via]),
  [["nadie", "sin nombre"]],
  "y por eso tiene su propia salida",
);
assert.ok(contextoEntero(g, "nadie") !== "", "a la que solo se la identifica por su gente");

assert.strictEqual(acortar(g, "Ramón Genoveva", o), "Ramón", "de la consulta que no encuentra nada, la palabra que sí");
assert.strictEqual(acortar(g, "Genoveva", o), null, "con una sola palabra no hay nada que quitar");

// Sobre los datos de verdad
const data: ArbolData = JSON.parse(readFileSync(resolve("seed/arbol.json"), "utf-8"));
const real = construirGrafo(data);
const POV = "p25";
const suyo = { linaje: libretaDe(real).linaje, pasos: pasosDesde(real, POV) };

const pablos = buscar(real, "Pablo", suyo);
assert.strictEqual(pablos[0]!.id, POV, "el Centro es el más cercano a sí mismo y encabeza su propio nombre");
assert.strictEqual(pablos.filter((r) => r.via === "nombre").length, 15, "doce Pablo y tres que lo llevan de segundo");

// Que a cada uno se llega por sus dos nombres, sin mirar por dónde: a casi todos los lleva ya
// su propio `apodos`, y los que quedan en la tabla de grafías son los que no lo tienen escrito.
const porNombre = (consulta: string) => buscar(real, consulta, suyo).filter((r) => r.via === "nombre").map((r) => r.id);
for (const [buscado, esperado] of [
  ["Pilar", "p301"], // Piluquita
  ["Javier", "p128"], // Javi
  ["Javi", "p191"], // Javier
  ["José", "p29"], // Pepe
  ["Mavi", "p357"], // Maravillas
  ["Chon", "p290"], // Ascensión
  ["María José", "p286"], // Marijose
  ["Mamen", "p47"], // María del Carmen
  ["Marilu", "p143"], // María Luisa
  ["Rober", "p181"], // el único que sigue en la tabla de grafías
] as const) {
  assert.ok(porNombre(buscado).includes(esperado), `buscando «${buscado}» tendría que salir ${esperado}`);
}

// Y el apodo que lleva escrito una persona no se estira a los que se llaman como ella: «Pepe»
// saca a los cinco Pepe y a ningún otro José, y «Marijose» solo a la Marijose. Es lo que la
// tabla de grafías no sabía hacer, y por lo que ha adelgazado al aparecer `apodos`.
assert.ok(!porNombre("Pepe").includes("p350"), "«Pepe» no es «María José»");
assert.deepStrictEqual(porNombre("Marijose"), ["p286"], "«Marijose» es una, no las cuatro María José");
assert.strictEqual(porNombre("Pepe").length, 5, "los cinco Pepe y ningún José más");
assert.strictEqual(porNombre("Lola").length, 3, "las tres Lola y ninguna Dolores más");
assert.strictEqual(porNombre("Paco").length, 5, "los cinco Paco y ningún Francisco más");
assert.strictEqual(porNombre("Piluca").length, 1, "una Piluca, no las cuatro Pilar");
assert.deepStrictEqual(porNombre("Merche"), [], "nadie de esta familia se llama así");
// Y al revés sigue funcionando: el largo los saca a todos, que es de lo que va apuntarlo.
assert.ok(porNombre("Francisco").length >= 7, "«Francisco» saca a los Paco, al Fran y a los suyos");

// Lo que antes era una regla de un solo sentido lo dice ahora el dato: Carmiña se llama Carmen
// y la lleva de apodo, así que «Carmen» la encuentra y «Carmiña» no saca a las otras cuatro.
assert.ok(porNombre("Carmen").includes("p277"), "Carmiña sale al buscar «Carmen»");
assert.deepStrictEqual(porNombre("Carmiña"), ["p277"], "y «Carmiña» no saca a nadie más");

assert.deepStrictEqual(porNombre("Catina"), porNombre("Catalina"), "a Catina se la busca por los dos");

// A quien se llama de dos maneras se le encuentra por las dos. **Sale del propio JSON** y no
// de una tabla de ids: el apodo vive al lado de su dueño, así que ya no hay forma de que se
// quede señalando a otro cuando se toca la persona.
const conApodo = data.people.filter((p) => p.apodos?.length);
assert.ok(conApodo.length > 0, "sin nadie con apodo esto no comprueba nada");
for (const p of conApodo) {
  assert.ok(porNombre(p.nombre).includes(p.id), `${p.id}: no se le encuentra por «${p.nombre}»`);
  for (const apodo of p.apodos!) {
    assert.ok(porNombre(apodo).includes(p.id), `${p.id}: no se le encuentra por «${apodo}»`);
  }
}

// Y llegan a uno, que es lo que no sabía hacer la tabla de nombres: «Chiara Teresa» sacaba a
// las siete Teresa y «Pablo Enrique» a los quince Pablo.
for (const [escrito, esperado] of [
  ["Chiara Teresa", "p14"],
  ["Teresita", "p14"],
  ["Mariano José", "p7"],
  ["Pablo Enrique", "p18"],
  ["Carmen Adoración", "p24"],
  ["Luis Nazario", "p30"],
  ["Merceditas", "p422"],
  ["Nena", "p422"],
  ["Elena María", "p444"],
] as const) {
  assert.deepStrictEqual(porNombre(escrito), [esperado], `«${escrito}» es de una persona y de nadie más`);
}

// Salvo cuando el nombre lo lleva más gente escrito, que entonces salen todos: el de uno no
// esconde al que se llama así. Son los dos únicos criterios, y no se contradicen.
assert.deepStrictEqual(porNombre("José Gerardo").sort(), ["p16", "p3"], "y p3 se llama José Gerardo");
assert.deepStrictEqual(porNombre("Jose Alberto").sort(), ["p22", "p29"], "y p22 se llama Jose Alberto");
assert.deepStrictEqual(
  porNombre("María Teresa").sort(),
  ["p11", "p115", "p36", "p5", "p66", "p75"],
  "las dos que lo llevan de nota y las cuatro que lo llevan de nombre, y ninguna Teresa más",
);

// Ningún grupo de más: uno cuyos nombres no lleve nadie no ayuda a encontrar a nadie.
for (const grupo of IGUALES) {
  assert.ok(
    grupo.some((n: string) => porNombre(n).length > 0),
    `nadie del árbol se llama de ninguna de estas maneras: ${grupo.join(", ")}`,
  );
}
const cerca = pablos.filter((r) => r.via === "nombre").map((r) => suyo.pasos.get(r.id)!);
assert.deepStrictEqual(cerca, [...cerca].sort((a, b) => a - b), "ordenados por cercanía a ti, que es el único criterio que siempre existe");

// Los tres Pablo de 1989: el nombre y el año no los distinguen, y la lista no los pinta con
// nada más que su segunda línea. Si dos coincidieran, en la búsqueda serían el mismo.
const mismos = data.people.filter((p) => p.nombre === "Pablo" && p.birth?.startsWith("1989")).map((p) => p.id);
assert.strictEqual(mismos.length, 3);
assert.strictEqual(new Set(mismos.map((id) => contextoEntero(real, id))).size, 3, "a los tres Pablo (1989) los separa de quién son");

const sinNombre = losSinNombre(real, suyo);
assert.strictEqual(
  sinNombre.length,
  data.people.filter((p) => p.nombre === "Sin nombre").length,
  "su lista los recoge a todos: es la única forma de llegar a ellos",
);
assert.ok(
  sinNombre.every((r) => contextoEntero(real, r.id) !== ""),
  "y ninguna sale como un nombre suelto: todas tienen de quién ser",
);
assert.strictEqual(buscar(real, "Genoveva", suyo).length, 0, "nadie se llama así");

console.log(
  `busqueda.test.ts OK (${pablos.length} Pablo, ${buscar(real, "María", suyo).length} María, ${sinNombre.length} sin nombre)`,
);
