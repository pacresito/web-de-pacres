// Test del panel «Mi viaje». `npx tsx lib/fuera-de-ruta/viaje/mi-viaje.test.ts`.
// Sobre los datos reales de Navarra: reparto en días, no-descarte, totales y «IA decide».
import assert from "assert";
import { resumenMiViaje, elegirEquilibrado, presupuestoDia } from "./mi-viaje";
import type { DatosViajes, Destino } from "../tipos";
import type { MatrizViajes } from "../planificador/geo";
import navarra from "../../../data/fuera-de-ruta/navarra.json";
import matriz from "../../../data/fuera-de-ruta/matriz-navarra.json";

const datos = navarra as unknown as DatosViajes;
const m = matriz as MatrizViajes;
const bySlug = (s: string) => datos.destinos.find((d) => d.slug === s)!;
const opts = { dias: 2, ritmo: "medio" as const, comida: "picnic" as const, fecha: new Date("2026-07-18") };

// --- Selección vacía: días vacíos, totales a cero, nunca peta ---
let r = resumenMiViaje([], m, opts);
assert.strictEqual(r.dias.length, 2, "siempre `dias` días, aun sin selección");
assert.strictEqual(r.totalParadas, 0, "0 paradas");
assert.strictEqual(r.totalMin, 0, "0 minutos sin selección");
assert.ok(r.dias.every((d) => d.slugs.length === 0 && !d.apretado), "días libres, ninguno apretado");

// --- La matriz trae km reales (Fase D): el total de km es > 0 con paradas repartidas ---
const tres: Destino[] = ["nacedero-del-urederra", "ubagua", "ojo-de-iturmendi"].map(bySlug);
r = resumenMiViaje(tres, m, opts);
assert.strictEqual(r.totalParadas, 3, "3 paradas");
assert.strictEqual(r.dias.flatMap((d) => d.slugs).length, 3, "las 3 se colocan, ninguna se descarta");
assert.ok(r.totalKm > 0, "km reales de la matriz (metros presentes)");
// Una selección holgada NO debe marcar días apretados: el presupuesto ya descuenta la
// comida, así que el aviso solo salta por el trabajo real (regresión del doble conteo).
assert.ok(r.dias.every((d) => !d.apretado), "3 sitios en 2 días entran de sobra, ningún día apretado");

// Una selección holgada no desborda: cabe de sobra en los días.
assert.strictEqual(r.desbordado, false, "3 sitios en 2 días no desbordan");

// --- Regla del flujo: MUCHA selección en 1 día no descarta nada, solo aprieta ---
const todos = datos.destinos.filter((d) => d.tipo !== "alojamiento");
r = resumenMiViaje(todos, m, { ...opts, dias: 1 });
assert.strictEqual(r.dias.flatMap((d) => d.slugs).length, todos.length, "todas colocadas en 1 día");
assert.ok(r.dias[0].apretado, "un día con todo va apretado");
assert.strictEqual(r.desbordado, true, "todos los destinos en 1 día desbordan (aviso global)");

// --- Reparto equilibrado: mucha selección NO se apila en el último día ---
// Con todo repartido en varios días, ninguno debe llevar más de la mitad de las paradas
// (antes el último día era el sumidero: absorbía casi todo y salían días de 30 h).
r = resumenMiViaje(todos, m, { ...opts, dias: 4 });
assert.strictEqual(r.dias.flatMap((d) => d.slugs).length, todos.length, "todas colocadas, ninguna descartada");
const conParadas = r.dias.filter((d) => d.slugs.length > 0);
assert.ok(conParadas.length >= 2, "el reparto usa varios días, no uno solo");
const maxEnUnDia = Math.max(...r.dias.map((d) => d.slugs.length));
assert.ok(maxEnUnDia <= Math.ceil(todos.length / 2), "ningún día se queda con casi todo");

// --- Presupuesto: más ritmo = más minutos por día ---
assert.ok(
  presupuestoDia(tres, { ...opts, ritmo: "activo" }) > presupuestoDia(tres, { ...opts, ritmo: "relajado" }),
  "ritmo activo da más presupuesto que relajado",
);

// --- «IA decide»: subconjunto no vacío, sin repetir, que cabe en el presupuesto total ---
const candidatas = todos; // ya en orden de puntos daría igual: aquí basta un orden estable
const elegidas = elegirEquilibrado(candidatas, m, opts);
assert.ok(elegidas.length > 0 && elegidas.length <= candidatas.length, "elige un subconjunto no vacío");
assert.strictEqual(new Set(elegidas).size, elegidas.length, "sin duplicados");
const rElegidas = resumenMiViaje(elegidas.map(bySlug), m, opts);
assert.ok(
  rElegidas.totalMin <= opts.dias * presupuestoDia(elegidas.map(bySlug), opts) || elegidas.length === 1,
  "lo elegido cabe en el presupuesto (o es una sola parada irreductible)",
);

console.log("OK mi-viaje.test.ts");
