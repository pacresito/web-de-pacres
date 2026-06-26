// Test de lógica pura: `npx tsx lib/farma/pedidos.test.ts`. Fuera del build.
import assert from "assert";
import { calcularPedidos, type PedidosDeCodigo, type RefPedidos, type Stocks, type StMins } from "./pedidos";

const AHORA = Date.parse("2026-06-26T10:00:00Z");
const haceDias = (n: number) => AHORA - n * 24 * 60 * 60 * 1000;

const C = Array.from({ length: 6 }, (_, i) => String(i + 1).padStart(6, "0")); // 000001..000006

// 6 artículos del lab CINFA (denominaciones A..F) con el mismo consumo mensual.
const seisCinfa = (consumo: number): RefPedidos =>
  Object.fromEntries(
    C.map((codigo, i) => [
      codigo,
      { denominacion: `CINFA-${String.fromCharCode(65 + i)}`, lab: "CINFA", consumoMensual: consumo },
    ]),
  );
const todos = (v: number): Stocks => Object.fromEntries(C.map((c) => [c, v]));
// Los 6 códigos pertenecen al pedido "CINFA" (eje de agrupación de Pedidos).
const pedCinfa: PedidosDeCodigo = Object.fromEntries(C.map((c) => [c, ["CINFA"]]));

// --- #1+#2: 6 roturas → pendiente; cantidad = max(StMín, consumo) − stock ---
{
  const r = calcularPedidos(todos(2), seisCinfa(10), todos(5), pedCinfa, {}, AHORA);
  assert.strictEqual(r.pendientes.length, 1, "un pedido pendiente");
  const cinfa = r.pendientes[0];
  assert.strictEqual(cinfa.pedido, "CINFA");
  assert.strictEqual(cinfa.lineas.length, 6, "6 líneas");
  assert.ok(cinfa.lineas.every((l) => l.cantidad === 8), "cantidad max(5,10)−2 = 8");
}

// --- #2: con StMín > consumo el objetivo es el StMín; #3 cuenta la alerta ---
{
  const r = calcularPedidos(todos(2), seisCinfa(4), todos(8), pedCinfa, {}, AHORA);
  assert.ok(r.pendientes[0].lineas.every((l) => l.cantidad === 6), "max(8,4)−2 = 6 (manda el StMín)");
  assert.strictEqual(r.alertasStockMinimo, 6, "los 6 tienen StMín 8 > consumo 4");
}

// --- #1: una línea para pedir no necesita rotura (existencias bajo el consumo) ---
{
  // 000001 roto (2<5) → cantidad 8 ; 000002..006 sin rotura (7≥5) pero bajo consumo → cantidad 3
  const stock: Stocks = { ...todos(7), "000001": 2 };
  const r = calcularPedidos(stock, seisCinfa(10), todos(5), pedCinfa, {}, AHORA);
  assert.strictEqual(r.pendientes.length, 1, "rotura en 000001 + 6 líneas → pendiente");
  const lineas = Object.fromEntries(r.pendientes[0].lineas.map((l) => [l.codigo, l.cantidad]));
  assert.strictEqual(lineas["000001"], 8, "roto: max(5,10)−2");
  assert.strictEqual(lineas["000002"], 3, "sin rotura pero bajo consumo: max(5,10)−7");
}

// --- #1b: con < 6 líneas no es pendiente aunque haya roturas ---
{
  // 5 roturas (000001..005) + 1 cubierto (000006 sin línea) = 5 líneas < 6
  const stock: Stocks = { ...todos(2), "000006": 99 };
  const r = calcularPedidos(stock, seisCinfa(10), todos(5), pedCinfa, {}, AHORA);
  assert.strictEqual(r.pendientes.length, 0, "5 líneas: por debajo del umbral");
}

// --- #1a: con 6 líneas pero 0 roturas tampoco es pendiente ---
{
  // todos a 7: 7≥5 (sin rotura) y 7<10 → 6 líneas de cantidad 3, pero ninguna rotura
  const r = calcularPedidos(todos(7), seisCinfa(10), todos(5), pedCinfa, {}, AHORA);
  assert.strictEqual(r.pendientes.length, 0, "sin rotura: no se dispara el pedido");
}

// --- #3: alertasStockMinimo cuenta todo el universo, sin rotura ---
{
  const stMin: StMins = { ...todos(5), "000001": 25 }; // solo 000001 con StMín > consumo (25>10)
  const r = calcularPedidos(todos(99), seisCinfa(10), stMin, pedCinfa, {}, AHORA);
  assert.strictEqual(r.pendientes.length, 0, "stock alto: ningún pedido");
  assert.strictEqual(r.alertasStockMinimo, 1, "solo 000001 (25 > 10)");
}

// --- Ciclo de vida: fichado < 5 días → ya hecho; ≥ 5 días → reabre ---
{
  const ref = seisCinfa(10);
  const reciente = calcularPedidos(todos(2), ref, todos(5), pedCinfa, { CINFA: haceDias(2) }, AHORA);
  assert.strictEqual(reciente.pendientes.length, 0, "fichado hace 2 días: no pendiente");
  assert.strictEqual(reciente.hechos.length, 1, "aparece en ya hechos");

  const viejo = calcularPedidos(todos(2), ref, todos(5), pedCinfa, { CINFA: haceDias(6) }, AHORA);
  assert.strictEqual(viejo.pendientes.length, 1, "fichado hace 6 días y sigue cumpliendo #1: reabre");
  assert.strictEqual(viejo.hechos.length, 0);
}

// --- Resuelto: si el inventario nuevo deja de cumplir #1, desaparece aunque esté fichado ---
{
  // todos a 9: sin rotura (9≥5), 6 líneas de cantidad 1 → falla #1a → ni pendiente ni hecho
  const r = calcularPedidos(todos(9), seisCinfa(10), todos(5), pedCinfa, { CINFA: haceDias(1) }, AHORA);
  assert.strictEqual(r.pendientes.length, 0);
  assert.strictEqual(r.hechos.length, 0, "sin rotura: desaparece de ambas listas");
}

// --- Huérfano: hay que pedir (rotura) pero el código no está en la referencia ---
{
  const r = calcularPedidos({ "999999": 0 }, seisCinfa(10), { "999999": 3 }, {}, {}, AHORA);
  assert.deepStrictEqual(r.huerfanos, ["999999"]);
  assert.strictEqual(r.pendientes.length, 0);
}

// --- Stock ausente del inventario = 0 unidades → rotura, pide el objetivo entero ---
{
  const r = calcularPedidos({}, seisCinfa(10), todos(5), pedCinfa, {}, AHORA);
  assert.strictEqual(r.pendientes.length, 1, "ausentes = 0 → 6 roturas");
  assert.ok(r.pendientes[0].lineas.every((l) => l.cantidad === 10), "max(5,10)−0 = 10");
}

// --- jun-26: artículo gestionado sin pedido en la carpeta → se ignora ---
{
  // Los 6 cumplen rotura pero ninguno tiene pedido asignado → no se construye nada.
  const r = calcularPedidos(todos(2), seisCinfa(10), todos(5), {}, {}, AHORA);
  assert.strictEqual(r.pendientes.length, 0, "sin pedido: ignorado");
  assert.strictEqual(r.huerfanos.length, 0, "no es huérfano (sí está en Ventas), solo sin pedido");
}

// --- jun-26: un código en varios pedidos suma su línea a cada uno (colisión) ---
{
  // 000001 pertenece a CINFA y a ALMACEN; el resto solo a CINFA. Ambos pedidos llegan a 6
  // líneas (CINFA con sus 6; ALMACEN solo tendría 1 → no alcanza el umbral). Para probar el
  // reparto, mapeo 000001..006 a ambos pedidos: los dos deben salir con 6 líneas.
  const pedDoble: PedidosDeCodigo = Object.fromEntries(C.map((c) => [c, ["CINFA", "ALMACEN"]]));
  const r = calcularPedidos(todos(2), seisCinfa(10), todos(5), pedDoble, {}, AHORA);
  assert.strictEqual(r.pendientes.length, 2, "el código va a los dos pedidos");
  assert.deepStrictEqual(r.pendientes.map((b) => b.pedido), ["ALMACEN", "CINFA"], "ordenados");
  assert.ok(r.pendientes.every((b) => b.lineas.length === 6), "cada pedido con sus 6 líneas");
}

console.log("pedidos.test.ts ✓");
