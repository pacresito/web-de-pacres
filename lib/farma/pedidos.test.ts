// Test de lógica pura: `npx tsx lib/farma/pedidos.test.ts`. Fuera del build.
import assert from "assert";
import { bolsaDePedido, calcularPedidos, listarPedidos, type PedidosDeCodigo, type RefPedidos, type Stocks, type StMins } from "./pedidos";

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

// --- Ciclo de vida: descargado < 5 días → en descargados; ≥ 5 días → reabre ---
{
  const ref = seisCinfa(10);
  const reciente = calcularPedidos(todos(2), ref, todos(5), pedCinfa, { CINFA: haceDias(2) }, AHORA);
  assert.strictEqual(reciente.pendientes.length, 0, "descargado hace 2 días: no pendiente");
  assert.strictEqual(reciente.hechos.length, 1, "aparece en descargados");

  const viejo = calcularPedidos(todos(2), ref, todos(5), pedCinfa, { CINFA: haceDias(6) }, AHORA);
  assert.strictEqual(viejo.pendientes.length, 1, "descargado hace 6 días y sigue cumpliendo #1: reabre");
  assert.strictEqual(viejo.hechos.length, 0);
}

// --- Descargado se mantiene mientras tenga líneas; desaparece al reponerse del todo ---
{
  // Reposición total (todos a 99 ≥ objetivo): sin líneas → desaparece de ambas listas.
  const repuesto = calcularPedidos(todos(99), seisCinfa(10), todos(5), pedCinfa, { CINFA: haceDias(1) }, AHORA);
  assert.strictEqual(repuesto.pendientes.length, 0);
  assert.strictEqual(repuesto.hechos.length, 0, "repuesto del todo: desaparece");

  // Descargado sin rotura pero aún con líneas (todos a 9 → cantidad 1): sigue en descargados.
  const parcial = calcularPedidos(todos(9), seisCinfa(10), todos(5), pedCinfa, { CINFA: haceDias(1) }, AHORA);
  assert.strictEqual(parcial.pendientes.length, 0);
  assert.strictEqual(parcial.hechos.length, 1, "descargado con líneas: se mantiene aunque no cumpla #1");
}

// --- Descargado manual: un pedido sin rotura descargado aparece en descargados ---
{
  // Sin StMín → sin rotura, no cumple #1; pero descargado hace 1 día y con líneas por consumo.
  const r = calcularPedidos(todos(2), seisCinfa(10), {}, pedCinfa, { CINFA: haceDias(1) }, AHORA);
  assert.strictEqual(r.pendientes.length, 0, "sin rotura: no pendiente");
  assert.strictEqual(r.hechos.length, 1, "descargado manual: en descargados");
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

// --- jun-27: artículo de Ventas SIN StMín se pide por consumo ---
{
  // 000001 con StMín 5 y roto (2<5) dispara; 000002..006 SIN StMín, stock 2 < consumo 10.
  const r = calcularPedidos(todos(2), seisCinfa(10), { "000001": 5 }, pedCinfa, {}, AHORA);
  assert.strictEqual(r.pendientes.length, 1, "la rotura de 000001 dispara el pedido");
  assert.strictEqual(r.pendientes[0].lineas.length, 6, "los 6 entran, tengan StMín o no");
  const lineas = Object.fromEntries(r.pendientes[0].lineas.map((l) => [l.codigo, l.cantidad]));
  assert.strictEqual(lineas["000001"], 8, "con StMín: max(5,10)−2");
  assert.strictEqual(lineas["000002"], 8, "sin StMín: objetivo = consumo, max(0,10)−2");
}

// --- jun-27: un pedido sin ninguna rotura (nadie tiene StMín) no se auto-dispara ---
{
  const r = calcularPedidos(todos(2), seisCinfa(10), {}, pedCinfa, {}, AHORA);
  assert.strictEqual(r.pendientes.length, 0, "sin StMín no hay rotura: solo pedible en manual");
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

// --- pedido manual (jun-27): incluye artículos por consumo aunque ninguno tenga StMín ---
{
  // Sin StMín en nadie y sin rotura: calcularPedidos no lo dispara, pero el manual sí lo arma.
  const bolsa = bolsaDePedido("CINFA", todos(2), seisCinfa(10), {}, pedCinfa);
  assert.ok(bolsa, "el pedido manual se arma sin StMín");
  assert.strictEqual(bolsa!.lineas.length, 6, "6 líneas por consumo");
  assert.ok(bolsa!.lineas.every((l) => l.cantidad === 8), "objetivo = consumo: max(0,10)−2");
}

// --- listarPedidos (jun-27): parte de Ventas, no de StMín ---
{
  assert.deepStrictEqual(listarPedidos(pedCinfa, seisCinfa(10)), ["CINFA"], "pedido listado sin StMín");
}

console.log("pedidos.test.ts ✓");
