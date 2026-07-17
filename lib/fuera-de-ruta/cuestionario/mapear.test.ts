// Test del mapeo cuestionario → Perfil/Viaje y del round-trip por la URL.
// `npx tsx lib/fuera-de-ruta/cuestionario/mapear.test.ts`.
import assert from "assert";
import { aPerfil, aViaje, estacionDe } from "./mapear";
import { serializarViaje, parsearViaje } from "./viaje-url";
import type { Respuestas } from "./preguntas";
import { recomendar } from "../motor/motor";
import type { DatosViajes } from "../tipos";
import navarra from "../../../data/fuera-de-ruta/navarra.json";

const todos = (navarra as unknown as DatosViajes).destinos;

// --- Regla de oro: un cuestionario vacío no elimina a nadie ---
let p = aPerfil({}, undefined);
assert.deepStrictEqual(p, {}, "sin respuestas, perfil vacío");
assert.strictEqual(recomendar(todos, p).eliminadas.length, 0, "cuestionario vacío no elimina");

// Las zonas vienen del mapa, no del cuestionario.
assert.deepStrictEqual(aPerfil({}, ["ribera"]).zonas, ["ribera"], "zonas entran por parámetro");

// --- Eliminación: solo lo explícito ---
assert.strictEqual(aPerfil({ carrito: "imprescindible" }, undefined).carritoImprescindible, true);
assert.strictEqual(aPerfil({ carrito: "prefiero" }, undefined).carritoImprescindible, undefined,
  "'prefiero' no es imprescindible: no elimina");
assert.strictEqual(aPerfil({ perro: "si" }, undefined).conPerro, true);
assert.strictEqual(aPerfil({ vertigo: "evitar" }, undefined).conVertigo, true);
assert.strictEqual(aPerfil({ vertigo: "quizas" }, undefined).conVertigo, undefined, "'quizás' no elimina por vértigo");
assert.strictEqual(aPerfil({ edades: ["6", "2", "11"] }, undefined).edadMinNino, 2, "edad mínima = el menor");
assert.strictEqual(aPerfil({ carreteras: "pista-buena" }, undefined).accesoMax, "pista buena");
assert.strictEqual(aPerfil({ carreteras: "sin-preferencia" }, undefined).accesoMax, undefined, "sin preferencia = sin tope");

// --- Puntuación: dificultad, paisajes/prioridades, agua, época ---
assert.deepStrictEqual(aPerfil({ tiposRuta: ["paseos", "comodas"] }, undefined).dificultades, ["fácil", "media"],
  "franjas de dificultad se unen sin duplicar");

const conPref: Respuestas = { paisajes: ["bosque"], prioridades: ["cascadas", "naturaleza"] };
const pref = aPerfil(conPref, undefined);
assert.deepStrictEqual(pref.paisajes, ["bosque", "cascada"], "paisajes = elegidos + los de prioridades");
assert.deepStrictEqual(pref.experiencias, ["naturaleza"], "experiencias vienen de prioridades");
assert.deepStrictEqual(pref.tipos, ["cascada"], "una prioridad puede alimentar el tipo");

assert.strictEqual(aPerfil({ agua: "banarse" }, undefined).quiereBano, true);
assert.strictEqual(aPerfil({ agua: "visitar" }, undefined).quiereBano, undefined, "'visitar' no pide baño");
assert.deepStrictEqual(aPerfil({ fecha: "2026-07-17" }, undefined).epoca, ["verano"], "la fecha fija la época");

// --- estacionDe ---
assert.strictEqual(estacionDe("2026-04-01"), "primavera");
assert.strictEqual(estacionDe("2026-12-31"), "invierno");
assert.strictEqual(estacionDe("no-es-fecha"), undefined);

// --- aViaje: defaults sensatos ---
assert.deepStrictEqual(
  aViaje({ dias: "3", ritmo: "tranquilo", comida: "restaurante", fecha: "2026-07-17" }),
  { dias: 3, ritmo: "relajado", comida: "restaurante", fecha: "2026-07-17" },
);
const porDefecto = aViaje({});
assert.strictEqual(porDefecto.dias, 2, "sin días, un fin de semana");
assert.strictEqual(porDefecto.ritmo, "medio", "sin ritmo, medio");
assert.strictEqual(aViaje({ ritmo: "ia" }).ritmo, "medio", "'que decida' cae al medio");

// --- Round-trip por la URL (solo el bloque viaje) ---
const viaje: Respuestas = { dias: "3", fecha: "2026-07-17", ritmo: "maximo", prioridades: ["cascadas", "bosques"], comida: "bocadillo" };
const ida = parsearViaje(new URLSearchParams(serializarViaje(viaje)));
assert.deepStrictEqual(ida, viaje, "el viaje sobrevive al round-trip por la URL");

// Parseo defensivo: valores desconocidos se ignoran, el resto sobrevive.
const sucio = parsearViaje(new URLSearchParams("dias=3&ritmo=inventado&prioridades=cascadas&prioridades=xxx&fecha=malo"));
assert.deepStrictEqual(sucio, { dias: "3", prioridades: ["cascadas"] }, "solo lo válido pasa el filtro");

console.log("OK mapear.test.ts");
