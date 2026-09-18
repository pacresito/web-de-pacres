// npx tsx app/juegos/reposo/partida.test.ts
//
// Lo que protegen estos tests: que el toque alcance a todos los objetos —también a los que
// viven dentro de otro—, que tres fallos cierren la visita sin quitar lo encontrado, y que el
// juego sepa decir cuánto lleva algo como está, que es su único canal para explicarse.
import { CATALOGO, antiguedadDe, construirCalle, escena, ORIGEN_MS, type Cambio } from "./escena";
import { FALLOS, enganchar, haceCuanto, NOMBRES, nuevaVisita, tocar } from "./partida";
import { zonas } from "./render";
// Las zonas se prueban sobre la composición que se publica, no sobre el catálogo: enmarcar la
// calle mueve y encoge cada caja, y una zona bien colocada en el catálogo puede ser
// inalcanzable en la escena de verdad sin que nada falle.
import { escena as calle } from "./calle/ventana";

let fails = 0;
function test(name: string, ok: boolean, detail = "") {
  if (!ok) fails++;
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? "  " + detail : ""}`);
}

const DIA = 24 * 3600e3;
// A 1100 px, que es a lo que se sirve la calle en escritorio: la gracia del toque va en
// píxeles de pantalla, así que a escala 1 se estaría probando una calle que nadie ve.
const vista = { ancho: 1100, alto: 619, escala: 1100 / 1600, dpr: 1 };
const Z = zonas(vista, calle.cajas);
const cambio = (id: string): Cambio => ({ id, tipo: "cíclico", visibilidad: 0.6, nivelAntes: 0, nivelAhora: 1 });

// El enganche

// Este es el test que hay que mirar al recomponer la calle: un objeto que ningún toque
// alcanza es un cambio que el jugador no puede señalar nunca, y nada más falla.
const inalcanzables = Z.filter((z) => enganchar(Z, z.x + z.w / 2, z.y + z.h / 2) !== z.id);
test("todo objeto se puede tocar en su centro", inalcanzables.length === 0,
  inalcanzables.map((z) => z.id).join(", "));

// El escaparate vive dentro del local: sin la regla del pequeño, el local se lo traga.
const esc = Z.find((z) => z.id === "escaparate")!;
test("el que vive dentro de otro gana el toque",
  enganchar(Z, esc.x + esc.w / 2, esc.y + esc.h / 2) === "escaparate");

test("un toque en el cielo no engancha nada", enganchar(Z, 800, 40) === null);

test("se perdona la puntería por unos píxeles", (() => {
  const p = Z.find((z) => z.id === "papelera")!;
  return enganchar(Z, p.x - 6, p.y + p.h / 2) === "papelera";
})());

test("lo que ya no se pinta conserva su zona",
  Z.some((z) => z.id === "puesto") && Z.length === CATALOGO.length);

// La visita

const cambios = [cambio("toldo"), cambio("arbol")];
let v = nuevaVisita();

let r = tocar(v, "toldo", cambios); v = r.visita;
test("acertar guarda el hallazgo", r.respuesta.tipo === "acierto" && v.encontrados.length === 1);

r = tocar(v, "toldo", cambios); v = r.visita;
test("volver a tocar lo encontrado no gasta fallo",
  r.respuesta.tipo === "repetido" && v.fallos === 0);

for (const id of ["coche", "banco", "bici"]) v = tocar(v, id, cambios).visita;
test(`${FALLOS} fallos cierran la visita`, v.cerrada && v.fallos === FALLOS);
test("el castigo no quita nada: lo encontrado sigue ahí", v.encontrados.includes("toldo"));
test("con la visita cerrada, tocar no hace nada",
  tocar(v, "arbol", cambios).respuesta.tipo === "nada" && !v.encontrados.includes("arbol"));

test("el fallo marca lo descartado", v.descartados.length === FALLOS);

// Cuánto lleva así

const t = ORIGEN_MS + 500 * DIA;
const niveles = escena("reposo", t);
const fueraDeRango = niveles.filter((n) => {
  const a = antiguedadDe("reposo", n.id, t);
  return a < 0 || !Number.isFinite(a);
});
test("la antigüedad es siempre un tiempo real", fueraDeRango.length === 0,
  fueraDeRango.map((n) => n.id).join(", "));

// Un cíclico no puede llevar en su nivel más de lo que dura un escalón: si lo dice, está
// contando desde el ciclo entero y el juego prometería estratos que no tiene.
const pasados = construirCalle("reposo").filter((o) => o.tipo === "cíclico")
  .filter((o) => antiguedadDe("reposo", o.id, t) > o.periodoMs / o.escalones + 1);
test("un cíclico no lleva así más de lo que dura su escalón", pasados.length === 0,
  pasados.map((o) => o.id).join(", "));

// El árbol es el objeto lento por excelencia: a los 500 días tiene que poder decir que lleva
// meses como está, o el canal que explica los estratos no explica nada.
test("el árbol lleva meses en su nivel",
  antiguedadDe("reposo", "arbol", t) > 30 * DIA,
  haceCuanto(antiguedadDe("reposo", "arbol", t)));

test("todo objeto tiene nombre para hablar de él",
  CATALOGO.every((s) => NOMBRES[s.id]),
  CATALOGO.filter((s) => !NOMBRES[s.id]).map((s) => s.id).join(", "));

test("el tiempo se dice en la unidad que se entiende",
  haceCuanto(12 * DIA) === "hace 12 días" && haceCuanto(DIA) === "hace 1 día"
  && haceCuanto(400 * DIA) === "hace 1 año" && haceCuanto(2 * 3600e3) === "hace 2 horas"
  && haceCuanto(60e3) === "hace un rato");

console.log(fails === 0 ? "\nTodo OK" : `\n${fails} fallo(s)`);
process.exit(fails === 0 ? 0 : 1);
