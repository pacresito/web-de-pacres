// Test de lógica pura: `npx tsx lib/arbol/personas.test.ts`. Fuera del build.
import assert from "assert";
import { readFileSync } from "fs";
import { resolve } from "path";
import { construirGrafo } from "./grafo";
import { apellidosDe, comoSeLlama, etiquetaDe, losOtrosApodos, ordenarPareja } from "./personas";
import type { ArbolData, Persona } from "./tree";

const persona = (nombre: string, apellidos: string[] = [], sexo?: "h" | "m"): Persona => ({
  id: nombre,
  nombre,
  apellidos,
  sexo,
  fuentes: [],
});

// La pareja: el hombre arriba, y si nadie trae sexo manda el documento
const gente = new Map([
  ["h", persona("Ricardo", [], "h")],
  ["m", persona("Lola", [], "m")],
  ["mujer", persona("Ruth", [], "m")],
  ["nadie", persona("Sin nombre")],
  ["x", persona("Yodelina")],
  ["z", persona("Binta")],
]);
const buscar = (id: string) => gente.get(id);
assert.deepStrictEqual(ordenarPareja(["m", "h"], buscar), ["h", "m"], "el hombre sube");
assert.deepStrictEqual(ordenarPareja(["h", "m"], buscar), ["h", "m"], "y si ya estaba arriba, se queda");
assert.deepStrictEqual(ordenarPareja(["mujer", "nadie"], buscar), ["nadie", "mujer"], "si solo se reconoce a la mujer, sube el otro");
assert.deepStrictEqual(ordenarPareja(["x", "z"], buscar), ["x", "z"], "sin sexo ninguno: manda el documento");
assert.deepStrictEqual(ordenarPareja(["m"], buscar), ["m"], "una sola persona no es pareja");

// La etiqueta, y dónde empieza lo que no consta escrito
const conApellidos = persona("José", ["Cardona", "Torres"]);
const suyos = { todos: ["Cardona", "Torres"], escritos: 2, nuevos: ["Torres"] };
assert.deepStrictEqual(etiquetaDe(conApellidos, 2, suyos, "familiar"), { texto: "José Cardona Torres", heredadoDesde: 19 });
assert.strictEqual(etiquetaDe(conApellidos, 1, suyos, "familiar").texto, "José Cardona");
assert.strictEqual(etiquetaDe(conApellidos, 0, suyos, "familiar").texto, "José");
assert.strictEqual(etiquetaDe(conApellidos, "nuevos", suyos, "familiar").texto, "José Torres", "en «nuevos» solo el que estrena");

const heredera = persona("Chiara Teresa");
const heredados = { todos: ["Pieravanti", "Torres"], escritos: 0, nuevos: [] };
assert.deepStrictEqual(
  etiquetaDe(heredera, 2, heredados, "familiar"),
  { texto: "Chiara Teresa Pieravanti Torres", heredadoDesde: "Chiara Teresa".length },
  "sin nada escrito, los dos apellidos son deducidos",
);
assert.strictEqual(etiquetaDe(heredera, "nuevos", heredados, "familiar").texto, "Chiara Teresa", "lo heredado nunca estrena nada");
assert.strictEqual(
  etiquetaDe(persona("Carmen", ["Bordallo"]), 2, { todos: ["Bordallo", "Cardona"], escritos: 1, nuevos: ["Bordallo"] }, "familiar")
    .heredadoDesde,
  "Carmen Bordallo".length,
  "con uno escrito, el corte cae después de él",
);

// Los dos nombres: el de casa manda de serie, y el interruptor pide el que consta
const conApodo: Persona = { ...persona("José Gerardo", ["Cardona"], "h"), apodos: ["Pepe"] };
assert.strictEqual(comoSeLlama(conApodo, "familiar"), "Pepe");
assert.strictEqual(comoSeLlama(conApodo, "completo"), "José Gerardo");
assert.strictEqual(comoSeLlama(conApellidos, "familiar"), "José", "quien no tiene apodo sale igual con los dos");
assert.strictEqual(
  etiquetaDe(conApodo, 1, { todos: ["Cardona", "Martín"], escritos: 1, nuevos: [] }, "completo").texto,
  "José Gerardo Cardona",
  "el apellido no depende de con qué nombre salga",
);

const dosApodos: Persona = { ...persona("Mercedes", [], "m"), apodos: ["Merceditas", "La nena"] };
assert.strictEqual(comoSeLlama(dosApodos, "familiar"), "Merceditas", "el primero es el que se pinta");
assert.deepStrictEqual(losOtrosApodos(dosApodos, "familiar"), ["La nena"], "y el resto los dice la ficha");
assert.deepStrictEqual(losOtrosApodos(dosApodos, "completo"), ["Merceditas", "La nena"], "con el entero puesto, los dos");
assert.deepStrictEqual(losOtrosApodos(conApellidos, "completo"), [], "quien no tiene apodo no tiene fila");

// Sobre los datos de verdad
const data: ArbolData = JSON.parse(readFileSync(resolve("seed/arbol.json"), "utf-8"));
const porId = new Map(data.people.map((p) => [p.id, p]));
// El sexo lo trae todo el mundo menos quien no tiene ni nombre, y así ninguna pareja
// queda por colocar: dos del mismo sexo no sabríamos cuál subir.
assert.ok(
  data.people.every((p) => p.sexo || p.nombre === "Sin nombre"),
  "sin sexo solo los anónimos: a quien tiene nombre se le decide, no se le adivina",
);
const parejas = data.unions.filter((u) => u.partners.length === 2);
const sinColocar = parejas.filter((u) => {
  const [a, b] = u.partners.map((id) => porId.get(id)!);
  return a.sexo === b.sexo;
});
assert.strictEqual(
  sinColocar.length,
  0,
  `parejas sin colocar: ${sinColocar.map((u) => u.partners.map((p) => porId.get(p)!.nombre).join(" + ")).join(", ")}`,
);

// El apellido lo estrena quien lo trae, y sus descendientes ya no lo repiten.
const linaje = apellidosDe(construirGrafo(data));
assert.deepStrictEqual(linaje.get("p25")!.nuevos, [], "Pablo no estrena «Crespo»: ya lo lleva su padre");
assert.deepStrictEqual(linaje.get("p63")!.nuevos, ["Forasté", "Puget"], "quien corona una línea los enseña los dos");

// Y el que no consta se hereda: el primero del padre y el segundo de la madre.
assert.deepStrictEqual(linaje.get("p25")!.todos, ["Crespo", "Velasco"], "el de la madre completa al escrito");
assert.deepStrictEqual(linaje.get("p26")!, { todos: ["Crespo", "Bordallo"], escritos: 0, nuevos: [] }, "el hijo, entero deducido");
// Cuántos son exactamente cambia con cada alta; lo que se comprueba es que la deducción
// hace el trabajo grueso, que es a lo que se la puso: más que dobla lo que trae escrito.
const conDos = data.people.filter((p) => linaje.get(p.id)!.todos.length === 2).length;
const escritos = data.people.filter((p) => p.apellidos.length > 0).length;
assert.ok(conDos > escritos * 2, `solo ${conDos} llegan a dos apellidos, de ${escritos} que traen alguno escrito`);
for (const p of data.people) {
  const { todos, escritos, nuevos } = linaje.get(p.id)!;
  assert.ok(todos.length <= 2 && escritos <= todos.length, `${p.id}: ${todos.length} apellidos`);
  assert.deepStrictEqual(todos.slice(0, escritos), p.apellidos.slice(0, escritos), `${p.id}: lo escrito va primero y literal`);
  assert.ok(nuevos.every((a) => todos.includes(a)), `${p.id} estrena un apellido que no es suyo`);
}

console.log(`personas.test.ts OK (${parejas.length} parejas colocadas)`);
