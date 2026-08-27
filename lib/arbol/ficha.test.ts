// Test de lógica pura: `npx tsx lib/arbol/ficha.test.ts`. Fuera del build.
// Lee seed/arbol.json (gitignoreado, datos privados): sin él no hay nada que verificar.
import assert from "assert";
import { readFileSync } from "fs";
import { resolve } from "path";
import { fichaDe, type Ficha } from "./ficha";
import { construirGrafo } from "./grafo";
import { libretaDe } from "./identidad";
import { relacionesDesde } from "./parentesco";
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

// Los ids del juguete van con `j` y no con `p`: `santoral.ts` fija la onomástica de unas
// cuantas personas reales por id, y un `p8` de mentira se llevaba el santo del de verdad.
const juguete: ArbolData = {
  people: [
    persona("j1", "Pablo", { sexo: "h", birth: "1902", death: "1980", apellidos: ["Serrano"] }),
    persona("j2", "Antonia", { sexo: "m", birth: "1905" }),
    persona("j3", "Genoveva", { sexo: "m", birth: "1930" }),
    persona("j4", "Julián", { sexo: "h", birth: "1934" }),
    persona("j5", "Rosa", { sexo: "m", birth: "1959", nota: "de Italia" }),
    persona("j6", "Sin nombre"),
    persona("j7", "Antonio", { sexo: "h", birth: "1980" }),
    persona("j8", "Lucía", { sexo: "m", birth: "1986-03-01" }),
  ],
  unions: [
    union("u1", ["j1", "j2"], ["j3", "j4"]),
    union("u2", ["j3"], ["j5", "j8"]),
    union("u3", ["j5", "j6"], [], { roto: true }),
    union("u4", ["j5", "j7"], [], { tipo: "pareja" }),
  ],
  roots: {},
};

const g = construirGrafo(juguete);
const HOY = "2026-08-08";
const libreta = libretaDe(g);
const relaciones = relacionesDesde(g, "j3");
const pertenencias = calcularRamas(g, [{ nombre: "Serrano", ancestro: "j1" }]);

const ficha = (id: string, hoy = HOY): Ficha =>
  fichaDe(g, id, {
    puntoDeVista: "j3",
    nombre: "familiar",
    linaje: apellidosDe(g),
    hoy,
    relacion: relaciones.get(id)!,
    pertenencia: pertenencias.get(id),
    homonimia: libreta.homonimias.get(id),
  });

const valor = (f: Ficha, clave: string) => f.filas.find((x) => x.clave === clave)?.valor;

// La relación, que es lo primero que se lee
assert.strictEqual(ficha("j3").relacion.frase, "Eres tú");
assert.strictEqual(ficha("j3").esCentro, true, "la del propio centro es una variante, no otra pantalla");
assert.strictEqual(ficha("j5").relacion.frase, "Es tu hija");
assert.deepStrictEqual(
  ["j5", "j1", "j4", "j7"].map((id) => ficha(id).relacion.pasos),
  [1, 1, 1, 2],
  "un padre, un hijo, un hermano y una pareja son un paso; el resto se suma",
);
assert.strictEqual(ficha("j7").relacion.frase, "Es la pareja de tu hija", "de quien entra casándose se dice a quién");
assert.strictEqual(ficha("j2").relacion.frase, "Es tu madre");

// La línea de datos: lo que consta de su vida, entero y sin depender del interruptor
assert.strictEqual(ficha("j1").datos, "1902 – 1980");
assert.strictEqual(ficha("j5").datos, "1959", "sin defunción no se escribe nada en su sitio");
assert.strictEqual(ficha("j6").datos, "sin fechas");
assert.strictEqual(ficha("j8").datos, "1986-03-01", "el día consta y sale, mire como mire el lienzo");

// La salida hacia los homónimos: la ficha no los lista, los busca
const conHomonimos = (cual: number, total: number): Ficha =>
  fichaDe(g, "j1", {
    puntoDeVista: "j3",
    nombre: "familiar",
    linaje: apellidosDe(g),
    hoy: HOY,
    relacion: relaciones.get("j1")!,
    homonimia: { cual, total, conAño: true },
  });
assert.deepStrictEqual(
  conHomonimos(1, 3).homonimos,
  { texto: 'Los otros 2 «Pablo (1902)»', consulta: "Pablo Serrano" },
  "se busca por el nombre entero, que es lo que los reúne, y se anuncian los otros",
);
assert.strictEqual(conHomonimos(1, 2).homonimos?.texto, 'El otro «Pablo (1902)»');
assert.strictEqual(ficha("j1").homonimos, undefined, "quien no comparte nombre no tiene a dónde salir");
assert.deepStrictEqual(
  fichaDe(g, "j6", {
    puntoDeVista: "j3",
    nombre: "familiar",
    linaje: apellidosDe(g),
    hoy: HOY,
    relacion: relaciones.get("j6")!,
    homonimia: { cual: 1, total: 4, conAño: false },
  }).homonimos,
  { texto: "Las otras 3 personas sin nombre", consulta: null },
  "a los que comparten no tener nombre no se llega tecleando: se sale a su lista",
);

// Las filas: la que no tiene dato no se escribe, y la rama es la única excepción
assert.strictEqual(valor(ficha("j5"), "Padres"), "Genoveva (1930)", "un solo progenitor documentado no inventa al otro");
assert.strictEqual(valor(ficha("j1"), "Padres"), undefined, "a quien no le constan padres no se le dice");
assert.strictEqual(valor(ficha("j3"), "Hijos"), "Rosa (1959), Lucía (1986)");
assert.deepStrictEqual(
  ficha("j3").filas.map((f) => f.clave),
  ["Padres", "Rama", "Hijos", "Edad"],
  "quien no se unió a nadie no lleva una fila que se lo diga",
);
assert.deepStrictEqual(
  ficha("j1").filas.map((f) => f.clave),
  ["Rama", "Unión", "Hijos", "Edad"],
  "de dónde viene primero, y qué hizo con su vida después",
);

// Los años, al final: el cumpleaños de quien vive y la edad del que no
// El verbo dice si los años son los que tiene o los que va a cumplir, que es la única duda
// que daba esta fila. La cifra no se mueve en todo el año: solo cambia el tiempo del verbo.
assert.strictEqual(valor(ficha("j8"), "Cumple"), "El 1 de marzo cumplió 40 años");
assert.strictEqual(valor(ficha("j8", "2026-01-01"), "Cumple"), "El 1 de marzo cumple 40 años");
assert.strictEqual(valor(ficha("j8", "2026-12-31"), "Cumple"), "El 1 de marzo cumplió 40 años");
assert.strictEqual(valor(ficha("j8", "2027-01-01"), "Cumple"), "El 1 de marzo cumple 41 años", "y en enero ya son los del año nuevo");
// Los tres días de alrededor se llaman por su nombre: ahí la fecha no dice nada más.
assert.strictEqual(valor(ficha("j8", "2026-02-28"), "Cumple"), "¡Mañana cumple 40 años!");
assert.strictEqual(valor(ficha("j8", "2026-03-01"), "Cumple"), "¡Hoy cumple 40 años!");
assert.strictEqual(valor(ficha("j8", "2026-03-02"), "Cumple"), "¡Ayer cumplió 40 años!");
// Y al del año en curso no se le cuentan años: cumplir cero es haber nacido.
assert.strictEqual(valor(ficha("j8", "1986-06-01"), "Cumple"), "Nació el 1 de marzo");
assert.strictEqual(valor(ficha("j8", "1986-03-01"), "Cumple"), "¡Nació hoy!");
// En la ficha de quien mira el verbo se tutea, como todo lo que la app le dice a él.
const suPropiaFicha = (hoy: string): Ficha =>
  fichaDe(g, "j8", {
    puntoDeVista: "j8",
    nombre: "familiar",
    linaje: apellidosDe(g),
    hoy,
    relacion: relacionesDesde(g, "j8").get("j8")!,
    homonimia: libreta.homonimias.get("j8"),
  });
assert.strictEqual(valor(suPropiaFicha("2026-03-01"), "Cumple"), "¡Hoy cumples 40 años!");
assert.strictEqual(valor(suPropiaFicha("2026-08-08"), "Cumple"), "El 1 de marzo cumpliste 40 años");
assert.strictEqual(valor(ficha("j8"), "Edad"), undefined, "el cumpleaños ya lleva la edad: dos filas dirían lo mismo");
assert.strictEqual(valor(ficha("j3"), "Edad"), "96 años", "sin día no hay a qué felicitar, solo la edad");
assert.strictEqual(valor(ficha("j1"), "Edad"), "vivió 78 años", "la del fallecido la dice el verbo");
assert.strictEqual(valor(ficha("j6"), "Edad"), undefined, "sin nacimiento no hay años que contar");
assert.strictEqual(
  valor(ficha("j2"), "Edad"),
  undefined,
  "y a quien hoy pasaría de cien sin que conste su defunción tampoco: nació en 1905",
);
assert.strictEqual(valor(ficha("j8"), "Onomástica"), "13 de diciembre", "el santo va detrás del cumpleaños");
assert.strictEqual(valor(ficha("j5"), "Onomástica"), "23 de agosto", "y lo tiene también quien no trae el día de su cumpleaños");
assert.strictEqual(valor(ficha("j3"), "Onomástica"), undefined, "Genoveva no está en el santoral: no hay día que dar");
assert.strictEqual(valor(ficha("j1"), "Onomástica"), undefined, "al que ya no está no se le felicita nada");
assert.strictEqual(
  valor(ficha("j5"), "Unión"),
  "expareja de Sin nombre; pareja de Antonio (1980)",
  "las dos uniones, en su orden, y lo que fue de cada una en su propio verbo",
);
assert.strictEqual(
  valor(ficha("j2"), "Unión"),
  "casada con Pablo Serrano (1902)",
  "el cónyuge lleva apellido: es el único de la ficha que trae uno de fuera",
);
assert.strictEqual(valor(ficha("j2"), "Hijos"), "Genoveva (1930), Julián (1934)", "y los hijos no, que llevan el de casa");
assert.strictEqual(
  valor(ficha("j6"), "Unión"),
  "expareja de Rosa Serrano (1959)",
  "el cónyuge lleva apellido también cuando la unión acabó",
);
assert.strictEqual(ficha("j5").nota, "de Italia", "la nota va tal cual y cierra la lista");
assert.strictEqual(ficha("j1").nota, undefined, "y quien no la tiene no lleva una fila que lo anuncie");

// Las ramas
assert.strictEqual(valor(ficha("j5"), "Rama"), "Serrano");
assert.strictEqual(valor(ficha("j6"), "Rama"), "entra en Serrano por Rosa", "y quien no la tiene de sangre, por quién entra");

// El caso feo
const anonima = ficha("j6");
assert.ok(anonima.aviso?.startsWith("No consta su nombre ni sus fechas"));
assert.strictEqual(anonima.sinNombre, true);
assert.strictEqual(ficha("j5").aviso, undefined, "quien tiene nombre no necesita que se le advierta de nada");

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
    nombre: "familiar",
    linaje: suLinaje,
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
  if (/^Es (tu pariente lej|de la familia política)/.test(f.relacion.frase)) sinTermino += 1;
}

console.log(`ficha.test.ts OK (${data.people.length} fichas desde ${POV}, ${sinTermino} sin término para la relación)`);
