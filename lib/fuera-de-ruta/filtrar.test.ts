// Test de lógica pura: `npx tsx lib/fuera-de-ruta/filtrar.test.ts`. Fuera del build.
import assert from "assert";
import { filtrarDestinos, nivelesDificultad } from "./filtrar";
import type { Destino, DatosViajes } from "./tipos";
import navarra from "../../data/fuera-de-ruta/navarra.json";

const mk = (over: Partial<Destino>): Destino => ({
  slug: "x", nombre: "X", zona: "z1", tipo: "ruta", queEs: "", imagen: "", ...over,
});
const slugs = (ds: Destino[]) => ds.map((d) => d.slug).sort();

// --- Sin filtros: pasan todos ---
const tres = [mk({ slug: "a" }), mk({ slug: "b" }), mk({ slug: "c" })];
assert.deepStrictEqual(slugs(filtrarDestinos(tres, {})), ["a", "b", "c"], "sin filtros no descarta nada");

// --- Zona y tipo: multi-selección (OR dentro, AND entre dimensiones) ---
const mix = [
  mk({ slug: "r1", zona: "z1", tipo: "ruta" }),
  mk({ slug: "c1", zona: "z2", tipo: "cascada" }),
  mk({ slug: "m1", zona: "z3", tipo: "mirador" }),
];
assert.deepStrictEqual(slugs(filtrarDestinos(mix, { zona: ["z1"] })), ["r1"], "filtra por zona");
assert.deepStrictEqual(slugs(filtrarDestinos(mix, { zona: ["z1", "z2"] })), ["c1", "r1"], "varias zonas suman (OR)");
assert.deepStrictEqual(slugs(filtrarDestinos(mix, { tipo: ["cascada"] })), ["c1"], "filtra por tipo");
assert.deepStrictEqual(slugs(filtrarDestinos(mix, { zona: ["z1"], tipo: ["cascada"] })), [], "zona+tipo se acumulan (AND)");
assert.deepStrictEqual(slugs(filtrarDestinos(mix, { zona: [] })), ["c1", "m1", "r1"], "array vacío = dimensión inactiva");

// --- Dificultad: niveles normalizados; "fácil media" abarca ambos ---
assert.deepStrictEqual(nivelesDificultad("fácil media"), ["fácil", "media"], "fácil media = dos niveles");
assert.deepStrictEqual(nivelesDificultad("muy fácil"), ["fácil"], "muy fácil = fácil");
assert.deepStrictEqual(nivelesDificultad(undefined), [], "sin dato = sin niveles");
const difs = [
  mk({ slug: "facil", dificultad: "fácil" }),
  mk({ slug: "fm", dificultad: "fácil media" }),
  mk({ slug: "media", dificultad: "media" }),
  mk({ slug: "sinDif" }),
];
assert.deepStrictEqual(slugs(filtrarDestinos(difs, { dificultad: ["fácil"] })), ["facil", "fm"], "fácil incluye 'fácil media'");
assert.deepStrictEqual(slugs(filtrarDestinos(difs, { dificultad: ["media"] })), ["fm", "media"], "media incluye 'fácil media'");
assert.deepStrictEqual(slugs(filtrarDestinos(difs, { dificultad: ["difícil"] })), [], "sin difíciles");

// --- Época y agua: solapamiento de arrays; dato ausente queda fuera ---
const est = [
  mk({ slug: "prim", epoca: ["primavera", "otono"] }),
  mk({ slug: "inv", epoca: ["invierno"] }),
  mk({ slug: "sinEp" }),
];
assert.deepStrictEqual(slugs(filtrarDestinos(est, { epoca: ["otono"] })), ["prim"], "época: solapa 'otono'");
assert.deepStrictEqual(slugs(filtrarDestinos(est, { epoca: ["primavera", "invierno"] })), ["inv", "prim"], "época: varias suman");
assert.deepStrictEqual(slugs(filtrarDestinos(est, { epoca: ["verano"] })), [], "sin destino de verano");
const aguas = [
  mk({ slug: "pozaRio", agua: ["rio", "poza"] }),
  mk({ slug: "casc", agua: ["cascada"] }),
  mk({ slug: "seco" }),
];
assert.deepStrictEqual(slugs(filtrarDestinos(aguas, { agua: ["poza"] })), ["pozaRio"], "agua: solapa 'poza'");
assert.deepStrictEqual(slugs(filtrarDestinos(aguas, { agua: ["poza", "cascada"] })), ["casc", "pozaRio"], "agua: varios subtipos suman");

// --- Distancia: regla del mínimo del rango; el tope es inclusivo ---
const dist = [
  mk({ slug: "d56", distanciaKm: [5, 6] }),
  mk({ slug: "d1015", distanciaKm: [10, 15] }),
  mk({ slug: "sinDist" }),
];
assert.deepStrictEqual(slugs(filtrarDestinos(dist, { distanciaMax: 5 })), ["d56"], "min 5 pasa el tope 5 (inclusivo)");
assert.deepStrictEqual(slugs(filtrarDestinos(dist, { distanciaMax: 4 })), [], "min 5 no pasa el tope 4");
assert.deepStrictEqual(slugs(filtrarDestinos(dist, { distanciaMax: 12 })), ["d1015", "d56"], "10-15 entra por su mínimo 10");
assert.deepStrictEqual(slugs(filtrarDestinos(dist, { distanciaMax: 25 })), ["d1015", "d56"], "sin distancia queda fuera si hay filtro de distancia");

// --- Duración: mismo criterio de umbral que la distancia ---
const dur = [
  mk({ slug: "corta", duracionHoras: [1, 2] }),
  mk({ slug: "larga", duracionHoras: [4, 6] }),
  mk({ slug: "sinDur" }),
];
assert.deepStrictEqual(slugs(filtrarDestinos(dur, { duracionMax: 2 })), ["corta"], "duración: min 1 pasa el tope 2");
assert.deepStrictEqual(slugs(filtrarDestinos(dur, { duracionMax: 4 })), ["corta", "larga"], "duración: 4-6 entra por su mínimo 4");
assert.deepStrictEqual(slugs(filtrarDestinos(dur, { duracionMax: 3 })), ["corta"], "sin duración queda fuera con filtro activo");

// --- Desnivel: tramos, contra el mínimo ---
const desn = [
  mk({ slug: "d110", desnivelM: [110, 110] }),
  mk({ slug: "d385", desnivelM: [385, 385] }),
  mk({ slug: "d200_300", desnivelM: [200, 300] }),
  mk({ slug: "d700", desnivelM: [700, 700] }),
  mk({ slug: "sinDesn" }),
];
assert.deepStrictEqual(slugs(filtrarDestinos(desn, { desnivel: "<150" })), ["d110"], "<150 solo el suave");
assert.deepStrictEqual(slugs(filtrarDestinos(desn, { desnivel: "<300" })), ["d110", "d200_300"], "<300 incluye min 200");
assert.deepStrictEqual(slugs(filtrarDestinos(desn, { desnivel: "<500" })), ["d110", "d200_300", "d385"], "<500 hasta 385");
assert.deepStrictEqual(slugs(filtrarDestinos(desn, { desnivel: "+500" })), ["d700"], "+500 solo el duro (>500)");

// --- Toggles booleanos: exigen true; null/ausente no cuela ---
const apto = [
  mk({ slug: "siTodo", ninos: true, perros: true, bano: true, parkingGratuito: true }),
  mk({ slug: "noNinos", ninos: false }),
  mk({ slug: "nulos" }),
];
assert.deepStrictEqual(slugs(filtrarDestinos(apto, { ninos: true })), ["siTodo"], "apto niños: solo true");
assert.deepStrictEqual(slugs(filtrarDestinos(apto, { perros: true })), ["siTodo"], "apto perros: solo true");
assert.deepStrictEqual(slugs(filtrarDestinos(apto, { bano: true })), ["siTodo"], "baño: solo true");
assert.deepStrictEqual(slugs(filtrarDestinos(apto, { parkingGratuito: true })), ["siTodo"], "parking: solo true");

// --- Sin reserva: invierte la regla; reserva presente queda fuera ---
const res = [
  mk({ slug: "libre" }),
  mk({ slug: "conReserva", reserva: "gratuita online obligatoria" }),
];
assert.deepStrictEqual(slugs(filtrarDestinos(res, { sinReserva: true })), ["libre"], "sin reserva: reserva presente fuera, ausente pasa");

// --- Datos reales de Navarra: sanity checks ---
const datos = navarra as unknown as DatosViajes;
const todos = datos.destinos;
assert.strictEqual(todos.length, 20, "20 destinos en el JSON");
assert.deepStrictEqual(slugs(filtrarDestinos(todos, { bano: true })), ["cascada-de-xorroxin", "ubagua"], "solo Xorroxin y Ubagua tienen baño");
assert.strictEqual(filtrarDestinos(todos, { tipo: ["pueblo"] }).length, 3, "3 pueblos");
assert.strictEqual(filtrarDestinos(todos, { zona: ["ribera"] }).length, 3, "3 destinos en la Ribera");
assert.strictEqual(filtrarDestinos(todos, { desnivel: "+500" }).length, 1, "solo Peña Izaga supera 500 m");
assert.strictEqual(filtrarDestinos(todos, { agua: ["poza"] }).length, 2, "poza: Xorroxin y Ubagua");
assert.strictEqual(filtrarDestinos(todos, { epoca: ["invierno"] }).length, 3, "invierno: Elizondo, Ujué, Tudela");
assert.strictEqual(filtrarDestinos(todos, { sinReserva: true }).length, 18, "2 destinos exigen reserva");

console.log("OK filtrar.test.ts");
