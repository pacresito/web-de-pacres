// Test de las guías finales (Fase G). `npx tsx lib/fuera-de-ruta/guia/guia.test.ts`.
// Sobre los datos reales de Navarra: totales coherentes con el itinerario, consejos
// derivados del dato (y solo los útiles) y alternativas de lluvia precalculadas.
import assert from "assert";
import { totalesViaje, consejosDelDia, alternativasLluvia, esRefugio, CIERRE } from "./guia";
import { generarItinerario } from "../itinerario/itinerario";
import type { OpcionesItinerario } from "../itinerario/itinerario";
import { resumenMiViaje } from "../viaje/mi-viaje";
import { zonasAlojamiento } from "../alojamiento/alojamiento";
import type { DatosViajes } from "../tipos";
import type { MatrizViajes } from "../geo";
import navarra from "../../../data/fuera-de-ruta/navarra.json";
import matriz from "../../../data/fuera-de-ruta/matriz-navarra.json";

const datos = navarra as unknown as DatosViajes;
const m = matriz as MatrizViajes;
const porSlug = new Map(datos.destinos.map((d) => [d.slug, d]));
const bySlug = (s: string) => porSlug.get(s)!;
const opts: OpcionesItinerario = { ritmo: "medio", comida: "picnic", fecha: new Date("2026-07-18") };

const itinerarioDe = (slugs: string[], o: OpcionesItinerario, dias = 2) => {
  const sel = slugs.map(bySlug);
  const reparto = resumenMiViaje(sel, m, { dias, ritmo: o.ritmo, comida: o.comida, fecha: o.fecha });
  return generarItinerario(reparto.dias, datos, m, o, zonasAlojamiento(reparto, porSlug, m));
};

const it = itinerarioDe(["cascada-de-xorroxin", "elizondo", "infernuko-errota"], opts, 2);

// --- Totales: suma de los días, sin contar los libres como días con plan ---
const t = totalesViaje(it);
assert.strictEqual(t.dias, it.dias.length, "los días del viaje son los del itinerario");
assert.strictEqual(t.actividades, 3, "las 3 actividades seleccionadas");
assert.ok(t.diasConPlan <= t.dias, "los días con plan nunca superan los días");
assert.strictEqual(t.conduccionMin, it.dias.reduce((s, d) => s + d.conduccionMin, 0), "conducción = suma de los días");
assert.ok(t.zonas.length >= 1 && t.zonas.every((z) => datos.zonas.some((x) => x.id === z)), "zonas reales, sin repetir");
assert.strictEqual(new Set(t.zonas).size, t.zonas.length, "las zonas no se repiten");

// --- Consejos: derivados del dato; un día libre no genera ninguno ---
const diaConPlan = it.dias.find((d) => d.paradas.length > 0)!;
const consejos = consejosDelDia(diaConPlan, porSlug);
assert.ok(consejos.length > 0 && consejos.length <= 5, "entre 1 y 5 consejos");
assert.ok(consejos.every((c) => c.trim().length > 0), "sin consejos vacíos");
const libre = generarItinerario([{ numero: 1, slugs: [], min: 0, km: 0, apretado: false }], datos, m, opts, []);
assert.deepStrictEqual(consejosDelDia(libre.dias[0], porSlug), [], "un día libre no tiene consejos");

// El material de las paradas aparece agregado y sin repetir.
const conMaterial = itinerarioDe(["ruta-bunkers-de-otsondo"], opts, 1);
const material = bySlug("ruta-bunkers-de-otsondo").material ?? [];
if (material.length) {
  const linea = consejosDelDia(conMaterial.dias[0], porSlug).find((c) => c.startsWith("Llevar:"));
  assert.ok(linea?.includes(material[0]), "el material del destino sale en los consejos");
}

// Con picnic se avisa de comprar la comida; con restaurante en la zona, no.
const picnic = itinerarioDe(["cascada-de-xorroxin", "elizondo"], { ...opts, comida: "picnic" }, 1);
assert.ok(
  consejosDelDia(picnic.dias[0], porSlug).some((c) => c.startsWith("Comprar la comida")),
  "sin restaurante se compra la comida antes",
);
const restaurante = itinerarioDe(["cascada-de-xorroxin", "elizondo"], { ...opts, comida: "restaurante" }, 1);
assert.ok(
  !consejosDelDia(restaurante.dias[0], porSlug).some((c) => c.startsWith("Comprar la comida")),
  "con parada en restaurante no se avisa de comprar comida",
);

// --- Refugios: pueblo sí; ruta de montaña no; cueva con caminata larga tampoco ---
assert.ok(esRefugio(bySlug("elizondo")), "un pueblo es refugio de lluvia");
assert.ok(!esRefugio(bySlug("cascada-de-xorroxin")), "una cascada no lo es");
assert.ok(!esRefugio(bySlug("cueva-de-arpea")), "una cueva a 3 km de sendero no es alternativa de lluvia");

// --- Alternativas: precalculadas, cercanas y nunca ya en el viaje ---
const alt = alternativasLluvia(it, porSlug, datos.destinos, m, "medio");
const enViaje = new Set(it.dias.flatMap((d) => d.paradas.map((p) => p.slug)));
for (const [origen, a] of alt) {
  assert.ok(enViaje.has(origen), "la clave es una parada del viaje");
  assert.ok(!enViaje.has(a.slug), "la alternativa no está ya en el viaje");
  assert.ok(a.cocheMin <= 60, "la alternativa queda a menos de una hora");
  assert.ok(a.estanciaMin > 0 && a.motivo.length > 0, "trae tiempo necesario y motivo");
  assert.ok(esRefugio(bySlug(a.slug)), "la alternativa es un refugio");
}
assert.ok(!alt.has("elizondo"), "una parada que ya es refugio no necesita alternativa");

// Con el refugio de la zona libre (Elizondo fuera del viaje), la cascada sí tiene alternativa.
const altBaztan = alternativasLluvia(
  itinerarioDe(["cascada-de-xorroxin", "infernuko-errota"], opts, 1), porSlug, datos.destinos, m, "medio",
);
assert.strictEqual(altBaztan.get("cascada-de-xorroxin")?.slug, "elizondo", "el refugio más cercano del Baztán es Elizondo");

// Sin refugio a menos de una hora no se inventa ninguno (Peña Izaga: Ujué a 67 min).
const altLejos = alternativasLluvia(
  itinerarioDe(["pena-izaga"], opts, 1), porSlug, datos.destinos, m, "medio",
);
assert.strictEqual(altLejos.size, 0, "sin refugio cerca, sin alternativa");

// --- Cierre obligatorio (§1.9) ---
assert.ok(CIERRE.includes("horarios, reservas o condiciones de acceso"), "la frase de cierre es la de la spec");

console.log("OK guia.test.ts");
