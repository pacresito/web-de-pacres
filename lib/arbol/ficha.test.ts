// Test de lógica pura: `npx tsx lib/arbol/ficha.test.ts`. Fuera del build.
// Lee seed/arbol.json (gitignoreado, datos privados): sin él no hay nada que verificar.
import assert from "assert";
import { readFileSync } from "fs";
import { resolve } from "path";
import { fichaDe, type Ficha } from "./ficha";
import { construirGrafo } from "./grafo";
import { libretaDe } from "./identidad";
import { FAMILIA_POLITICA, relacionesDesde } from "./parentesco";
import { apellidosDe } from "./personas";
import { calcularRamas } from "./ramas";
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

const juguete: ArbolData = {
  people: [
    persona("p1", "Pablo", { sexo: "h", birth: "1902", death: "1980", apellidos: ["Serrano"] }),
    persona("p2", "Antonia", { sexo: "m", birth: "1905" }),
    persona("p3", "Genoveva", { sexo: "m", birth: "1930" }),
    persona("p4", "Julián", { sexo: "h", birth: "1934" }),
    persona("p5", "Rosa", { sexo: "m", birth: "1959", nota: "de Italia" }),
    persona("p6", "Sin nombre"),
    persona("p7", "Antonio", { sexo: "h", birth: "1980" }),
    persona("p8", "Lucía", { sexo: "m", birth: "1986-03-01" }),
  ],
  unions: [
    union("u1", ["p1", "p2"], ["p3", "p4"]),
    union("u2", ["p3"], ["p5", "p8"]),
    union("u3", ["p5", "p6"], [], { roto: true }),
    union("u4", ["p5", "p7"], [], { tipo: "pareja" }),
  ],
  roots: {},
};

const g = construirGrafo(juguete);
const HOY = "2026-08-08";
const libreta = libretaDe(g);
const relaciones = relacionesDesde(g, "p3");
const pertenencias = calcularRamas(g, [{ nombre: "Serrano", ancestro: "p1" }]);

const ficha = (id: string): Ficha =>
  fichaDe(g, id, {
    puntoDeVista: "p3",
    linaje: apellidosDe(g),
    fechas: "año",
    hoy: HOY,
    relacion: relaciones.get(id)!,
    pertenencia: pertenencias.get(id),
    homonimia: libreta.homonimias.get(id),
  });

const valor = (f: Ficha, clave: string) => f.filas.find((x) => x.clave === clave)?.valor;

// La relación, que es lo primero que se lee
assert.strictEqual(ficha("p3").relacion.frase, "Eres tú");
assert.strictEqual(ficha("p3").esCentro, true, "la del propio centro es una variante, no otra pantalla");
assert.strictEqual(ficha("p5").relacion.frase, "Es tu hija");
assert.deepStrictEqual(
  ["p5", "p1", "p4", "p7"].map((id) => ficha(id).relacion.pasos),
  [1, 1, 1, 2],
  "un padre, un hijo, un hermano y una pareja son un paso; el resto se suma",
);
assert.strictEqual(ficha("p7").relacion.frase, "Es la pareja de tu hija", "de quien entra casándose se dice a quién");
assert.strictEqual(ficha("p2").relacion.frase, "Es tu madre");

// La línea de datos: la vida y el sitio en el árbol
assert.strictEqual(ficha("p1").datos, "1902 – 1980 · una generación por encima");
assert.strictEqual(ficha("p5").datos, "1959 · una generación por debajo", "sin defunción no se escribe nada en su sitio");
assert.strictEqual(ficha("p6").datos, "sin fechas · una generación por debajo");
assert.strictEqual(ficha("p3").datos, "1930 · tu generación");

// La salida hacia los homónimos: la ficha no los lista, los busca
const conHomonimos = (cual: number, total: number): Ficha =>
  fichaDe(g, "p1", {
    puntoDeVista: "p3",
    linaje: apellidosDe(g),
    fechas: "año",
    hoy: HOY,
    relacion: relaciones.get("p1")!,
    homonimia: { cual, total, conAño: true },
  });
assert.deepStrictEqual(
  conHomonimos(1, 3).homonimos,
  { texto: 'Los otros 2 «Pablo (1902)»', consulta: "Pablo Serrano" },
  "se busca por el nombre entero, que es lo que los reúne, y se anuncian los otros",
);
assert.strictEqual(conHomonimos(1, 2).homonimos?.texto, 'El otro «Pablo (1902)»');
assert.strictEqual(ficha("p1").homonimos, undefined, "quien no comparte nombre no tiene a dónde salir");
assert.deepStrictEqual(
  fichaDe(g, "p6", {
    puntoDeVista: "p3",
    linaje: apellidosDe(g),
    fechas: "año",
    hoy: HOY,
    relacion: relaciones.get("p6")!,
    homonimia: { cual: 1, total: 4, conAño: false },
  }).homonimos,
  { texto: "Las otras 3 personas sin nombre", consulta: null },
  "a los que comparten no tener nombre no se llega tecleando: se sale a su lista",
);

// Las filas: lo que no consta se escribe, nunca se esconde
assert.strictEqual(valor(ficha("p5"), "Padres"), "Genoveva (1930)", "un solo progenitor documentado no inventa al otro");
assert.strictEqual(valor(ficha("p1"), "Padres"), "— no constan");
assert.strictEqual(valor(ficha("p3"), "Hijos"), "Rosa (1959), Lucía (1986)");
assert.deepStrictEqual(
  ficha("p3").filas.map((f) => f.clave),
  ["Padres", "Rama", "Hijos", "Edad"],
  "quien no se unió a nadie no lleva una fila que se lo diga",
);
assert.deepStrictEqual(
  ficha("p1").filas.map((f) => f.clave),
  ["Padres", "Rama", "Unión", "Hijos", "Edad"],
  "de dónde viene primero, y qué hizo con su vida después",
);

// Los años, al final: el cumpleaños de quien vive y la edad del que no
assert.strictEqual(valor(ficha("p8"), "Cumple"), "1 de marzo · 40 años", "con el día se felicita; la edad va detrás");
assert.strictEqual(valor(ficha("p8"), "Edad"), undefined, "el cumpleaños ya lleva la edad: dos filas dirían lo mismo");
assert.strictEqual(valor(ficha("p3"), "Edad"), "96 años", "sin día no hay a qué felicitar, solo la edad");
assert.strictEqual(valor(ficha("p1"), "Edad"), "vivió 78 años", "la del fallecido la dice el verbo");
assert.strictEqual(valor(ficha("p6"), "Edad"), undefined, "sin nacimiento no hay años que contar");
assert.strictEqual(
  valor(ficha("p2"), "Edad"),
  undefined,
  "y a quien hoy pasaría de cien sin que conste su defunción tampoco: nació en 1905",
);
assert.strictEqual(valor(ficha("p8"), "Onomástica"), "13 de diciembre", "el santo va detrás del cumpleaños");
assert.strictEqual(valor(ficha("p5"), "Onomástica"), "23 de agosto", "y lo tiene también quien no trae el día de su cumpleaños");
assert.strictEqual(valor(ficha("p3"), "Onomástica"), undefined, "Genoveva no está en el santoral: no hay día que dar");
assert.strictEqual(valor(ficha("p1"), "Onomástica"), undefined, "al que ya no está no se le felicita nada");
assert.strictEqual(
  valor(ficha("p5"), "Unión"),
  "casada con Sin nombre · divorciados; pareja de Antonio (1980)",
  "las dos uniones, en su orden, y con lo que fue de cada una",
);
assert.strictEqual(
  valor(ficha("p2"), "Unión"),
  "casada con Pablo Serrano (1902)",
  "el cónyuge lleva apellido: es el único de la ficha que trae uno de fuera",
);
assert.strictEqual(valor(ficha("p2"), "Hijos"), "Genoveva (1930), Julián (1934)", "y los hijos no, que llevan el de casa");
assert.strictEqual(
  valor(ficha("p6"), "Unión"),
  "casado con Rosa Serrano (1959) · divorciados",
  "y a los «Sin nombre», que no traen sexo, los declina su cónyuge",
);
assert.strictEqual(ficha("p5").nota, "de Italia", "la nota va tal cual y cierra la lista");
assert.strictEqual(ficha("p1").nota, undefined, "y quien no la tiene no lleva una fila que lo anuncie");

// Las ramas
assert.strictEqual(valor(ficha("p5"), "Rama"), "Serrano");
assert.strictEqual(valor(ficha("p6"), "Rama"), "entra en Serrano por matrimonio");

// El caso feo
const anonima = ficha("p6");
assert.ok(anonima.aviso?.startsWith("No consta su nombre ni sus fechas"));
assert.strictEqual(anonima.sinNombre, true);
assert.strictEqual(ficha("p5").aviso, undefined, "quien tiene nombre no necesita que se le advierta de nada");

// Sobre los datos de verdad: las 416 fichas se escriben enteras
const data: ArbolData = JSON.parse(readFileSync(resolve("seed/arbol.json"), "utf-8"));
const real = construirGrafo(data);
const suLibreta = libretaDe(real);
const suLinaje = apellidosDe(real);
const susRamas = calcularRamas(real);
const POV = "p25";
const susRelaciones = relacionesDesde(real, POV);

let sinTermino = 0;
for (const p of data.people) {
  const f = fichaDe(real, p.id, {
    puntoDeVista: POV,
    linaje: suLinaje,
    fechas: "año",
    hoy: HOY,
    relacion: susRelaciones.get(p.id)!,
    pertenencia: susRamas.get(p.id),
    homonimia: suLibreta.homonimias.get(p.id),
  });
  assert.ok(f.titulo.length > 0, `${p.id}: la ficha se abre sin nombre`);
  assert.ok(f.relacion.pasos > 0 || p.id === POV, `${p.id}: no hay camino hasta el centro`);
  // La rama solo falta en una ficha de las 438: las que entraron casándose heredan la de su
  // cónyuge, y quien no desciende de nadie ni está casado con quien lo haga es Aina y nadie
  // más — su padre no está en el árbol y su madre entró casándose.
  assert.ok(f.filas.some((x) => x.clave.startsWith("Rama") && !x.falta) === (p.id !== "p425"), `${p.id}: la rama no cuadra`);
  if (f.relacion.frase.startsWith("Es tu pariente lej") || f.relacion.frase === FAMILIA_POLITICA) sinTermino += 1;
}

console.log(`ficha.test.ts OK (${data.people.length} fichas desde ${POV}, ${sinTermino} sin término para la relación)`);
