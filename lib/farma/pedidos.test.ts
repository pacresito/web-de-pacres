// Test de lógica pura: `npx tsx lib/farma/pedidos.test.ts`. Fuera del build.
import assert from "assert";
import { calcularPedidos, type RefPedidos, type StMins } from "./pedidos";

const AHORA = Date.parse("2026-06-26T10:00:00Z");
const haceDias = (n: number) => AHORA - n * 24 * 60 * 60 * 1000;

const ref: RefPedidos = {
  "000001": { denominacion: "AMLODIPINO 5MG", lab: "CINFA", consumoMensual: 10 },
  "000002": { denominacion: "BISOPROLOL 5MG", lab: "CINFA", consumoMensual: 8 },
  "000003": { denominacion: "OMEPRAZOL 20MG", lab: "NORMON", consumoMensual: 20 },
  "000004": { denominacion: "PARACETAMOL 1G", lab: "NORMON", consumoMensual: 4 },
};
const stMin: StMins = { "000001": 5, "000002": 5, "000003": 10, "000004": 8 };

// --- Rotura, cantidad y agrupación por lab ---
{
  // stock: 001 roto (2<5) → 10-2=8 ; 002 ok (6≥5) ; 003 roto (3<10) → 20-3=17 ; 004 roto (1<8)
  const r = calcularPedidos({ "000001": 2, "000002": 6, "000003": 3, "000004": 1 }, ref, stMin, {}, AHORA);

  assert.strictEqual(r.pendientes.length, 2, "dos labs en rotura");
  const cinfa = r.pendientes.find((b) => b.lab === "CINFA")!;
  assert.deepStrictEqual(cinfa.lineas.map((l) => [l.codigo, l.cantidad]), [["000001", 8]], "CINFA: solo 001, cantidad 8");
  const normon = r.pendientes.find((b) => b.lab === "NORMON")!;
  // 004: stMin 8 > consumo 4 → cantidad = max(0, 4-1)=3, pero alerta
  assert.deepStrictEqual(
    normon.lineas.map((l) => [l.codigo, l.cantidad]),
    [["000003", 17], ["000004", 3]],
    "NORMON: 003 y 004 ordenados por denominación",
  );
}

// --- Cantidad 0 cuando ya cubres el consumo pese a la rotura (StMín > consumo) ---
{
  // 004: stock 5 < stMin 8 (rotura) pero 5 ≥ ceil(consumo 4) → cantidad max(0, 4-5)=0 + alerta
  const r = calcularPedidos({ "000004": 5 }, ref, { "000004": 8 }, {}, AHORA);
  const normon = r.pendientes.find((b) => b.lab === "NORMON")!;
  assert.deepStrictEqual(normon.lineas, [{ codigo: "000004", denominacion: "PARACETAMOL 1G", cantidad: 0 }], "línea con cantidad 0");
  assert.strictEqual(r.alertas.length, 1, "una alerta StMín>consumo");
  assert.strictEqual(r.alertas[0].codigo, "000004");
}

// --- Ciclo de vida: fichado hace <5 días → ya hecho; ≥5 días con rotura → reabre ---
{
  const stock = { "000001": 2 }; // CINFA en rotura
  const soloCinfa = { "000001": 5 };
  const reciente = calcularPedidos(stock, ref, soloCinfa, { CINFA: haceDias(2) }, AHORA);
  assert.strictEqual(reciente.pendientes.length, 0, "fichado hace 2 días: no pendiente");
  assert.strictEqual(reciente.hechos.length, 1, "aparece en ya hechos");
  assert.strictEqual(reciente.hechos[0].lab, "CINFA");

  const viejo = calcularPedidos(stock, ref, soloCinfa, { CINFA: haceDias(6) }, AHORA);
  assert.strictEqual(viejo.pendientes.length, 1, "fichado hace 6 días y sigue rotura: reabre");
  assert.strictEqual(viejo.hechos.length, 0);
}

// --- Resuelto: si el inventario nuevo quita la rotura, el lab desaparece aunque esté fichado ---
{
  const r = calcularPedidos({ "000001": 9 }, ref, { "000001": 5 }, { CINFA: haceDias(1) }, AHORA);
  assert.strictEqual(r.pendientes.length, 0);
  assert.strictEqual(r.hechos.length, 0, "sin rotura: ni pendiente ni hecho");
}

// --- Huérfano: en rotura pero sin entrada en refPedidos ---
{
  const r = calcularPedidos({ "999999": 0 }, ref, { "999999": 3 }, {}, AHORA);
  assert.deepStrictEqual(r.huerfanos, ["999999"]);
  assert.strictEqual(r.pendientes.length, 0);
}

// --- Stock ausente del inventario = 0 unidades → rotura ---
{
  const r = calcularPedidos({}, ref, { "000001": 5 }, {}, AHORA);
  assert.strictEqual(r.pendientes[0].lineas[0].cantidad, 10, "ausente = 0 stock → pide consumo entero");
}

console.log("pedidos.test.ts ✓");
