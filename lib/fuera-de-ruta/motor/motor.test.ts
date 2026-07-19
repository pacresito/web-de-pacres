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
assert.strictEqual(r.candidatas.length, todos.length, "regla de oro: el listado entero sigue ahí");

// --- La puntuación ordena: el imprescindible encabeza ---
assert.strictEqual(r.candidatas[0].destino.slug, "nacedero-del-urederra", "el imprescindible ordena primero");
// Y el orden es monótono decreciente en puntos.
const pts = r.candidatas.map((c) => c.puntos);
assert.deepStrictEqual(pts, [...pts].sort((a, b) => b - a), "candidatas ordenadas por puntos desc");

// --- Incompatibilidad + puntuación se combinan sin mezclarse ---
// (Sin recuentos sobre el JSON, que crece: se aserta quién queda a cada lado.)
const slugsDe = (ds: { destino: { slug: string } }[]) => ds.map((d) => d.destino.slug).sort();
const losQue = (cumple: (d: (typeof todos)[number]) => boolean) => todos.filter(cumple).map((d) => d.slug).sort();

r = recomendar(todos, { carritoImprescindible: true, paisajes: ["bosque"] });
assert.deepStrictEqual(slugsDe(r.eliminadas), losQue((d) => d.carrito === false), "elimina solo los no aptos para carrito");
assert.deepStrictEqual(slugsDe(r.candidatas), losQue((d) => d.carrito !== false), "las demás siguen siendo candidatas (aptas o sin dato)");

// --- Zona + preferencias: filtra por zona (elimina) y ordena el resto ---
r = recomendar(todos, { zonas: ["ribera"], experiencias: ["historia"] });
assert.deepStrictEqual(slugsDe(r.candidatas), losQue((d) => d.zona === "ribera"), "candidatas: exactamente los de la Ribera");

console.log("OK motor.test.ts");
