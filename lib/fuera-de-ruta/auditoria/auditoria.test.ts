// Test de la auditoría. `npx tsx lib/fuera-de-ruta/auditoria/auditoria.test.ts`.
// Sobre datos reales de Navarra: hallazgos de compatibilidad, tiempo y reservas, y la
// regla del flujo (nunca elimina; varias actividades que caben no disparan aviso).
import assert from "assert";
import { auditar } from "./auditoria";
import { resumenMiViaje } from "../viaje/mi-viaje";
import type { DatosViajes, Destino } from "../tipos";
import type { MatrizViajes } from "../geo";
import navarra from "../../../data/fuera-de-ruta/navarra.json";
import matriz from "../../../data/fuera-de-ruta/matriz-navarra.json";

const datos = navarra as unknown as DatosViajes;
const m = matriz as MatrizViajes;
const bySlug = (s: string) => datos.destinos.find((d) => d.slug === s)!;
const opts = { dias: 2, ritmo: "medio" as const, comida: "picnic" as const, fecha: new Date("2026-07-18") };

// --- Sin selección: nada que auditar ---
assert.deepStrictEqual(auditar(resumenMiViaje([], m, opts), []), [], "sin selección, sin hallazgos");

// --- Selección holgada: compatibilidad ok + tiempo ok, sin avisos ---
// Regla de oro: varias actividades que caben NO disparan aviso de tiempo.
const holgada: Destino[] = ["ubagua", "ojo-de-iturmendi"].map(bySlug);
let h = auditar(resumenMiViaje(holgada, m, opts), holgada);
assert.ok(h.some((x) => x.tipo === "compatibilidad" && x.nivel === "ok"), "compatibilidad ok");
assert.ok(h.some((x) => x.tipo === "tiempo" && x.nivel === "ok"), "tiempo ok cuando cabe");
assert.ok(!h.some((x) => x.nivel === "aviso"), "selección holgada sin avisos");
assert.ok(!h.some((x) => x.tipo === "reserva"), "sin reservas en la selección, sin línea (sin ruido)");

// --- Desbordado: todo en 1 día → aviso de tiempo con CTA al comparador; nunca elimina ---
const todos = datos.destinos.filter((d) => d.tipo !== "alojamiento");
h = auditar(resumenMiViaje(todos, m, { ...opts, dias: 1 }), todos);
const tiempo = h.find((x) => x.tipo === "tiempo")!;
assert.strictEqual(tiempo.nivel, "aviso", "tiempo en aviso cuando desborda");
assert.strictEqual(tiempo.accion, "comparar", "ofrece el comparador");

// --- Reservas: cuenta las seleccionadas que requieren reserva (3 en Navarra) ---
const conReserva = ["cascada-de-xorroxin", "nacedero-del-urederra", "camping-bardenas"].map(bySlug);
h = auditar(resumenMiViaje(conReserva, m, opts), conReserva);
const reserva = h.find((x) => x.tipo === "reserva")!;
assert.ok(reserva, "hay línea de reserva");
assert.ok(reserva.texto.includes("3"), "cuenta las 3 reservas");

// --- Alojamiento (F4): con zonas, añade la línea 💡; sin zonas, no aparece ---
h = auditar(resumenMiViaje(holgada, m, opts), holgada);
assert.ok(!h.some((x) => x.tipo === "alojamiento"), "sin zonas, sin línea de alojamiento");
h = auditar(resumenMiViaje(holgada, m, opts), holgada, [
  { pueblo: "Elizondo", dias: [1], paradas: [] },
  { pueblo: "Zudaire", dias: [2], paradas: [] },
]);
const aloj = h.find((x) => x.tipo === "alojamiento")!;
assert.strictEqual(aloj.nivel, "idea", "la línea de alojamiento es una idea 💡");
assert.ok(aloj.texto.includes("Elizondo") && aloj.texto.includes("Zudaire"), "nombra las bases");
assert.strictEqual(h.filter((x) => x.tipo === "alojamiento").length, 1, "sin días largos, solo la línea 💡");

// --- Día atado a una base lejana: se avisa, con su número. Antes salía en el plan y
// nadie lo mencionaba (mudarse más no siempre compensa, callarlo nunca) ---
h = auditar(resumenMiViaje(holgada, m, opts), holgada, [
  { pueblo: "Orbaizeta", dias: [1, 2], paradas: [], cocheDiaMin: [147, 67] },
]);
const largo = h.find((x) => x.tipo === "alojamiento" && x.nivel === "aviso")!;
assert.ok(largo, "el día de 147 min de ir y volver se avisa");
assert.ok(largo.texto.includes("día 1") && !largo.texto.includes("día 2"), "nombra solo el día largo");
assert.ok(
  !auditar(resumenMiViaje(holgada, m, opts), holgada, [
    { pueblo: "Zudaire", dias: [1], paradas: [], cocheDiaMin: [119] },
  ]).some((x) => x.nivel === "aviso" && x.tipo === "alojamiento"),
  "justo por debajo del listón no se avisa");

// --- Estructural: la auditoría nunca elimina; todo hallazgo es informativo ---
for (const x of auditar(resumenMiViaje(todos, m, { ...opts, dias: 1 }), todos)) {
  assert.ok(["ok", "aviso", "idea"].includes(x.nivel), "nivel informativo, nunca destructivo");
}

console.log("OK auditoria.test.ts");
