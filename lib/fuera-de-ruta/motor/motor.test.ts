// Test de integración del motor de dos fases. `npx tsx lib/fuera-de-ruta/motor/motor.test.ts`.
// Comprueba que recomendar() encadena eliminar → puntuar y respeta la regla de oro
// end-to-end sobre los datos reales de Navarra.
import assert from "assert";
import { recomendar } from "./motor";
import type { Perfil } from "./tipos";
import type { DatosViajes } from "../tipos";
import navarra from "../../../data/fuera-de-ruta/navarra.json";

const todos = (navarra as unknown as DatosViajes).destinos;

// --- Regla de oro end-to-end: solo preferencias → nadie se queda fuera ---
const soloPreferencias: Perfil = {
  paisajes: ["bosque", "cascada", "alta montaña"],
  experiencias: ["senderismo", "fotografia"],
  tipos: ["cascada", "mirador"],
  epoca: ["verano"],
  quiereBano: true,
  imprescindibles: ["nacedero-del-urederra"],
};
let r = recomendar(todos, soloPreferencias);
assert.strictEqual(r.eliminadas.length, 0, "regla de oro: ninguna preferencia elimina");
assert.strictEqual(r.candidatas.length, 24, "regla de oro: los 24 siguen en el listado");

// --- La puntuación ordena: el imprescindible encabeza ---
assert.strictEqual(r.candidatas[0].destino.slug, "nacedero-del-urederra", "el imprescindible ordena primero");
// Y el orden es monótono decreciente en puntos.
const pts = r.candidatas.map((c) => c.puntos);
assert.deepStrictEqual(pts, [...pts].sort((a, b) => b - a), "candidatas ordenadas por puntos desc");

// --- Incompatibilidad + puntuación se combinan sin mezclarse ---
r = recomendar(todos, { carritoImprescindible: true, paisajes: ["bosque"] });
assert.strictEqual(r.eliminadas.length, 12, "elimina los 12 no aptos para carrito");
assert.strictEqual(r.candidatas.length, todos.length - 12, "las demás siguen siendo candidatas (aptas o sin dato)");
assert.ok(r.candidatas.every((c) => c.destino.carrito !== false), "ninguna candidata es carrito=false");

// --- Zona + preferencias: filtra por zona (elimina) y ordena el resto ---
r = recomendar(todos, { zonas: ["ribera"], experiencias: ["historia"] });
assert.strictEqual(r.candidatas.length, 3, "3 destinos en la Ribera");
assert.ok(r.candidatas.every((c) => c.destino.zona === "ribera"), "todas las candidatas son de la Ribera");

console.log("OK motor.test.ts");
