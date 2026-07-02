// Test del diff de PVP: `npx tsx lib/farma/pvp.test.ts`. Fuera del build.
// Clave de negocio: los medicamentos (Especialidades, 4%) nunca se marcan `pending`
// —solo el 21%/10% aparece en la pantalla PVP para reetiquetar—, y un pendiente
// antiguo de un medicamento se limpia al reprocesarse.
import assert from "assert";
import { diffPvp, type RegistroPvp } from "./pvp";

const F = "2026-07-02";
const base = (p: Partial<RegistroPvp> = {}): RegistroPvp => ({
  denominacion: "X", oldPrice: 10, newPrice: 10, firstSeen: "2026-06-01", lastSeen: "2026-06-01", pending: false, ...p,
});

// Primera vez: línea base, sin cambio, nunca pendiente (sea medicamento o no).
assert.strictEqual(diffPvp("X", 10, F, null, true).pending, false, "primera vez no es pendiente");
assert.strictEqual(diffPvp("X", 10, F, null, false).pending, false, "primera vez (medicamento) no es pendiente");

// Cambio de precio en un NO-medicamento (marcar=true) → pendiente, con oldPrice correcto.
const r1 = diffPvp("X", 12, F, base({ newPrice: 10 }), true);
assert.strictEqual(r1.pending, true, "no-medicamento que cambia de precio → pendiente");
assert.strictEqual(r1.oldPrice, 10, "el precio anterior pasa a oldPrice");
assert.strictEqual(r1.newPrice, 12, "el precio nuevo");

// Cambio de precio en un MEDICAMENTO (marcar=false) → NUNCA pendiente.
assert.strictEqual(diffPvp("X", 12, F, base({ newPrice: 10 }), false).pending, false, "medicamento que cambia de precio no se marca");

// Mismo precio: refresca lastSeen; un pendiente vivo de no-medicamento se conserva…
const r2 = diffPvp("X", 10, F, base({ newPrice: 10, pending: true }), true);
assert.strictEqual(r2.pending, true, "no-medicamento pendiente se mantiene pendiente");
assert.strictEqual(r2.lastSeen, F, "se refresca lastSeen");

// …pero el mismo caso en un medicamento LIMPIA el pendiente antiguo.
assert.strictEqual(diffPvp("X", 10, F, base({ newPrice: 10, pending: true }), false).pending, false, "medicamento limpia pendiente antiguo");

console.log("pvp.test.ts ✓");
