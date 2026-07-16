// Test de la Fase 2 (puntuación). `npx tsx lib/fuera-de-ruta/motor/puntuar.test.ts`.
// La puntuación ordena, nunca elimina: aquí solo se comprueba ORDEN y SUMA de puntos.
import assert from "assert";
import { puntuar } from "./puntuar";
import { PESOS } from "./pesos";
import type { Destino } from "../tipos";

const mk = (over: Partial<Destino>): Destino => ({
  slug: "x", nombre: "X", zona: "z1", tipo: "ruta", queEs: "", imagen: "", ...over,
});
const orden = (ds: { destino: Destino }[]) => ds.map((c) => c.destino.slug);
const puntos = (cs: { destino: Destino; puntos: number }[], slug: string) =>
  cs.find((c) => c.destino.slug === slug)!.puntos;

const tres = [mk({ slug: "a" }), mk({ slug: "b" }), mk({ slug: "c" })];

// --- Sin preferencias: todos a 0, orden estable por slug ---
let cs = puntuar(tres, {});
assert.deepStrictEqual(cs.map((c) => c.puntos), [0, 0, 0], "sin preferencias: 0 puntos");
assert.deepStrictEqual(orden(cs), ["a", "b", "c"], "empate: orden estable por slug");

// --- Paisaje: suma por cada coincidencia (peso × nº de solapes) ---
const pais = [
  mk({ slug: "dos", paisaje: ["bosque", "cascada", "rio"] }),
  mk({ slug: "uno", paisaje: ["bosque"] }),
  mk({ slug: "cero", paisaje: ["desierto"] }),
];
cs = puntuar(pais, { paisajes: ["bosque", "cascada"] });
assert.strictEqual(puntos(cs, "dos"), 2 * PESOS.paisaje, "dos paisajes que coinciden = 2× peso");
assert.strictEqual(puntos(cs, "uno"), 1 * PESOS.paisaje, "un paisaje = 1× peso");
assert.strictEqual(puntos(cs, "cero"), 0, "sin coincidencia = 0");
assert.deepStrictEqual(orden(cs), ["dos", "uno", "cero"], "ordena por afinidad desc");

// --- Imprescindible domina sobre cualquier afinidad ---
const imp = [
  mk({ slug: "afin", paisaje: ["bosque", "cascada", "rio", "poza"] }),
  mk({ slug: "marcado" }),
];
cs = puntuar(imp, { paisajes: ["bosque", "cascada", "rio", "poza"], imprescindibles: ["marcado"] });
assert.strictEqual(orden(cs)[0], "marcado", "el imprescindible manda sobre la afinidad de paisaje");

// --- Favorito de Cris: desempata a igualdad de puntos ---
const fav = [mk({ slug: "normal" }), mk({ slug: "cris", favoritoDeCris: true })];
cs = puntuar(fav, {});
assert.strictEqual(orden(cs)[0], "cris", "a igualdad, el favorito de Cris primero");
assert.strictEqual(puntos(cs, "cris"), PESOS.favoritoDeCris, "el favorito suma su empujón");

// --- Baño solo con dato true; dificultad por nivel normalizado ---
const bano = [mk({ slug: "conBano", bano: true }), mk({ slug: "sinBano", bano: false })];
cs = puntuar(bano, { quiereBano: true });
assert.strictEqual(puntos(cs, "conBano"), PESOS.bano, "baño true suma");
assert.strictEqual(puntos(cs, "sinBano"), 0, "baño false no suma");
const dif = [mk({ slug: "fm", dificultad: "fácil media" })];
assert.strictEqual(puntuar(dif, { dificultades: ["difícil"] })[0].puntos, 0, "dificultad que no encaja no suma");
assert.strictEqual(puntuar(dif, { dificultades: ["media"] })[0].puntos, PESOS.dificultad, "'fácil media' encaja con 'media'");

// --- Pesos configurables: cambiar el objeto re-pondera sin tocar el motor ---
const custom = { ...PESOS, paisaje: 100 };
cs = puntuar(pais, { paisajes: ["bosque", "cascada"] }, custom);
assert.strictEqual(puntos(cs, "dos"), 200, "peso custom aplicado (2 × 100)");

console.log("OK puntuar.test.ts");
