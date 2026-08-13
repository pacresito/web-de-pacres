// Test de lógica pura: `npx tsx lib/arbol/identidad.test.ts`. Fuera del build.
// Lee seed/arbol.json (gitignoreado, datos privados): sin él no hay nada que verificar.
import assert from "assert";
import { readFileSync } from "fs";
import { resolve } from "path";
import { construirGrafo } from "./grafo";
import { homonimias, identidadDe, LARGOS_NODO, libretaDe, type OpcionesIdentidad } from "./identidad";
import { apellidosDe } from "./personas";
import type { ArbolData, Persona, Union } from "./tree";

const persona = (id: string, nombre: string, resto: Partial<Persona> = {}): Persona => ({
  id,
  nombre,
  apellidos: [],
  fuentes: [],
  ...resto,
});
const union = (id: string, partners: string[], children: string[], resto: Partial<Union> = {}): Union => ({
  id,
  partners,
  children,
  tipo: "matrimonio",
  fuentes: [],
  ...resto,
});

// Una familia de juguete con los cuatro casos que manda el diseño: quien tiene los dos
// padres, quien además tiene cónyuge, quien no tiene ni nombre y quien no es hijo de nadie.
const juguete: ArbolData = {
  people: [
    persona("p1", "Pablo", { sexo: "h", birth: "1902", apellidos: ["Serrano"] }),
    persona("p2", "Antonia", { sexo: "m", birth: "1905", apellidos: ["Torres"] }),
    persona("p3", "Genoveva", { sexo: "m" }),
    persona("p4", "Julián", { sexo: "h", birth: "1934" }),
    persona("p5", "Rosa", { sexo: "m", birth: "1959", nota: "de Italia" }),
    persona("p6", "Sin nombre"),
    persona("p7", "Antonio", { sexo: "h", birth: "1980", incierto: "fechas" }),
    persona("p8", "Tomás", { sexo: "h" }),
    persona("p9", "Lucas", { sexo: "h" }),
    persona("p10", "Marta", { sexo: "m" }),
  ],
  unions: [
    union("u1", ["p1", "p2"], ["p3", "p5"]),
    union("u2", ["p5", "p4"], ["p6"]),
    union("u3", ["p6", "p7"], []),
    union("u4", ["p8"], ["p9", "p10"]),
  ],
  roots: {},
};

const g = construirGrafo(juguete);
const linaje = apellidosDe(g);
const HOY = "2026-08-08";
const opciones = (o: Partial<OpcionesIdentidad> = {}): OpcionesIdentidad => ({
  linaje,
  fechas: "año",
  apellidos: 2,
  hoy: HOY,
  largos: { titulo: 80, contexto: 80 },
  ...o,
});
const contexto = (id: string, largo: number, ramas?: string[]) =>
  identidadDe(g, id, opciones({ largos: { titulo: 80, contexto: largo }, ramas })).contexto;

// --- La escalera de degradación, peldaño a peldaño ---
const RAMA = ["Tomás"];
assert.strictEqual(contexto("p3", 80, RAMA), "hija de Pablo (1902) y Antonia (1905) · rama de Tomás");
assert.strictEqual(contexto("p3", 45, RAMA), "hija de Pablo y Antonia · rama de Tomás", "primero se van los años");
assert.strictEqual(contexto("p3", 35, RAMA), "hija de Pablo · rama de Tomás", "luego el segundo progenitor");
assert.strictEqual(contexto("p3", 20, RAMA), "hija de Pablo", "y por último la rama");
assert.strictEqual(contexto("p3", 10, RAMA), "hija de P…", "solo entonces, elipsis");
assert.strictEqual(contexto("p3", 80), "hija de Pablo (1902) y Antonia (1905)", "sin ramas, la línea se queda en la familia");

// --- El cónyuge no está en ningún peldaño: en 88 personas es lo único que las identifica ---
assert.strictEqual(
  contexto("p5", 80, RAMA),
  "hija de Pablo (1902) y Antonia (1905) · casada con Julián (1934) · rama de Tomás",
);
assert.strictEqual(contexto("p5", 40, RAMA), "hija de Pablo · casada con Julián", "el cónyuge aguanta hasta el final");
assert.strictEqual(contexto("p1", 80), "casado con Antonia (1905)", "quien no es hijo de nadie se dice por su cónyuge");
assert.strictEqual(contexto("p8", 80), "padre de Lucas y 1 más", "y quien no tiene ni cónyuge, por su descendencia");
assert.strictEqual(contexto("p9", 80), "hijo de Tomás", "un solo progenitor documentado no inventa al otro");

// --- A los «Sin nombre» los declina su cónyuge, que es lo único que dice de qué sexo son ---
const anonima = identidadDe(g, "p6", opciones({ apellidos: 0 }));
assert.strictEqual(anonima.contexto, "hija de Julián (1934) y Rosa (1959) · casada con Antonio (1980)");
assert.deepStrictEqual(anonima.titulo, [{ texto: "Sin nombre", pinta: "sinNombre" }], "y se pintan aparte");

// --- La primera línea: el nombre manda, el año no se recorta nunca ---
assert.deepStrictEqual(identidadDe(g, "p1", opciones()).titulo, [
  { texto: "Pablo", pinta: "nombre" },
  { texto: " Serrano", pinta: "nombre" },
  { texto: " (1902)", pinta: "año" },
]);
assert.deepStrictEqual(
  identidadDe(g, "p3", opciones()).titulo,
  [
    { texto: "Genoveva", pinta: "nombre" },
    { texto: " Serrano Torres", pinta: "heredado" },
  ],
  "lo que se deduce del árbol va aparte, para pintarlo apagado",
);
assert.deepStrictEqual(
  identidadDe(g, "p1", opciones({ largos: { titulo: 16, contexto: 80 } })).titulo,
  [
    { texto: "Pablo", pinta: "nombre" },
    { texto: " Se…", pinta: "nombre" },
    { texto: " (1902)", pinta: "año" },
  ],
  "cede el apellido, que además se lee subiendo",
);
assert.deepStrictEqual(
  identidadDe(g, "p3", opciones({ fechas: "ocultar" })).titulo.at(-1)?.pinta,
  "heredado",
  "sin fechas no hay paréntesis vacío",
);

// --- Las marcas se apilan sobre cualquier variante ---
const incierto = identidadDe(g, "p7", opciones());
assert.deepStrictEqual(incierto.titulo.at(-1), { texto: " (¿1980?)", pinta: "año" }, "el dato dudoso, entre interrogantes");
assert.deepStrictEqual(incierto.marcas, ["incierto"]);
assert.deepStrictEqual(
  identidadDe(g, "p5", opciones({ fechas: "edad" })).titulo.at(-1),
  { texto: " (67 años)", pinta: "año" },
  "la edad ocupa el sitio del año, sin tocar la escalera de la segunda línea",
);
assert.deepStrictEqual(
  identidadDe(g, "p7", opciones({ fechas: "edad" })).titulo.at(-1),
  { texto: " (¿46 años?)", pinta: "año" },
  "y arrastra la duda de la fecha de la que sale",
);
assert.strictEqual(
  identidadDe(g, "p1", opciones({ fechas: "edad" })).titulo.at(-1)?.pinta,
  "nombre",
  "al que pasaría de 100 sin que conste su defunción no se le da ninguna",
);
assert.strictEqual(identidadDe(g, "p5", opciones()).nota, "de Italia", "la nota va tal cual la escribió el documento");
assert.strictEqual(identidadDe(g, "p1", opciones()).nota, undefined, "y quien no la tiene no la trae");
assert.deepStrictEqual(
  identidadDe(g, "p3", opciones({ homonimia: { cual: 1, total: 3, conAño: false } })).marcas,
  ["1 de 3 con este nombre"],
  "sin año que compartir, la marca no lo menciona",
);
assert.deepStrictEqual(
  identidadDe(g, "p3", opciones({ homonimia: { cual: 2, total: 2, conAño: true } })).marcas,
  ["2 de 2 con este nombre y año"],
);
assert.deepStrictEqual(
  identidadDe(g, "p6", opciones({ homonimia: { cual: 3, total: 4, conAño: false } })).marcas,
  ["3 de 4 sin nombre"],
  "a quien no tiene nombre no se le dice que lo comparte: lo que comparte es no tenerlo",
);

// --- Sobre los datos de verdad ---
const data: ArbolData = JSON.parse(readFileSync(resolve("seed/arbol.json"), "utf-8"));
const real = construirGrafo(data);
const libreta = libretaDe(real);

// Reconstruir los apellidos desde el árbol es lo que desactiva el problema que el dato
// crudo aparentaba tener (el diseño contaba 168 nombres repetidos, sin mirar el año).
assert.strictEqual(libreta.homonimias.size, 13, "los homónimos que siguen siendo ambiguos");
const crudos = homonimias(
  real,
  new Map(data.people.map((p) => [p.id, { todos: p.apellidos.slice(0, 2), escritos: p.apellidos.length, nuevos: [] }])),
);
assert.ok(crudos.size > libreta.homonimias.size * 2, `con los apellidos tal como vienen serían ${crudos.size}`);

// La regla que sostiene todo el diseño: nadie aparece nunca como un nombre suelto. Y todos
// caben en un nodo, que es la superficie más estrecha en la que se les pinta.
for (const p of data.people) {
  const { titulo, contexto } = identidadDe(real, p.id, {
    linaje: libreta.linaje,
    fechas: "año",
    apellidos: "nuevos",
    hoy: HOY,
    largos: LARGOS_NODO,
    homonimia: libreta.homonimias.get(p.id),
  });
  assert.ok(contexto !== "", `${p.id} (${p.nombre}) sale sin nadie que lo identifique`);
  assert.ok(contexto.length <= LARGOS_NODO.contexto, `${p.id}: la segunda línea se sale (${contexto.length})`);
  const largo = titulo.reduce((n, t) => n + t.texto.length, 0);
  assert.ok(largo <= LARGOS_NODO.titulo, `${p.id}: la primera línea se sale (${largo})`);
}

console.log(`identidad.test.ts OK (${data.people.length} personas, todas con quien las identifique)`);
