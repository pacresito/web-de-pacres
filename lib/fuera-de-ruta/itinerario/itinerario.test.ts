// Test del generador de itinerario (Fase E). `npx tsx lib/fuera-de-ruta/itinerario/itinerario.test.ts`.
// Sobre los datos reales de Navarra: cronología encadenada, estancia por ritmo, ancla en
// alojamiento (salida/regreso), nocturnas al final y comida intercalada.
import assert from "assert";
import { generarItinerario, estanciaPorRitmo, SALIDA_DEFECTO, fmtHora } from "./itinerario";
import type { OpcionesItinerario } from "./itinerario";
import { resumenMiViaje } from "../viaje/mi-viaje";
import { zonasAlojamiento } from "../alojamiento/alojamiento";
import type { DatosViajes } from "../tipos";
import type { MatrizViajes } from "../planificador/geo";
import navarra from "../../../data/fuera-de-ruta/navarra.json";
import matriz from "../../../data/fuera-de-ruta/matriz-navarra.json";

const datos = navarra as unknown as DatosViajes;
const m = matriz as MatrizViajes;
const bySlug = (s: string) => datos.destinos.find((d) => d.slug === s)!;
const opts: OpcionesItinerario = { ritmo: "medio", comida: "picnic", fecha: new Date("2026-07-18") };

const porSlug = new Map(datos.destinos.map((d) => [d.slug, d]));

// Reparte con el panel, calcula las bases donde dormir y genera el itinerario: el mismo
// encadenado que la UI, para que el test se rompa si las dos fuentes se separan.
const itinerarioDe = (slugs: string[], o: OpcionesItinerario, dias = 2) => {
  const sel = slugs.map(bySlug);
  const reparto = resumenMiViaje(sel, m, { dias, ritmo: o.ritmo, comida: o.comida, fecha: o.fecha });
  return generarItinerario(reparto.dias, datos, m, o, zonasAlojamiento(reparto, porSlug, m));
};

// --- Estancia por ritmo: activo ≤ medio ≤ relajado, y respeta min/ideal del dato ---
const xorroxin = bySlug("cascada-de-xorroxin");
const bunkers = bySlug("ruta-bunkers-de-otsondo"); // estanciaMin 120, estanciaIdeal 180
assert.strictEqual(estanciaPorRitmo(bunkers, "activo"), 120, "activo → estanciaMin");
assert.strictEqual(estanciaPorRitmo(bunkers, "relajado"), 180, "relajado → estanciaIdeal");
assert.strictEqual(estanciaPorRitmo(bunkers, "medio"), 150, "medio → punto medio");
assert.ok(
  estanciaPorRitmo(xorroxin, "activo") <= estanciaPorRitmo(xorroxin, "relajado"),
  "activo nunca da más estancia que relajado",
);

// --- Cronología encadenada: cada parada empieza tras llegar+prep y termina en su estancia ---
const it = itinerarioDe(["cascada-de-xorroxin", "elizondo", "infernuko-errota"], opts, 1);
const dia = it.dias[0];
assert.ok(dia.paradas.length === 3, "las 3 paradas del día");
assert.strictEqual(dia.horaSalida, SALIDA_DEFECTO.medio, "arranca a la hora por defecto del ritmo");
for (const p of dia.paradas) {
  assert.strictEqual(p.horaInicio, p.horaLlegada + p.prepMin, "inicio = llegada + preparación");
  assert.strictEqual(p.horaSalida, p.horaInicio + p.estanciaMin, "salida = inicio + estancia");
}
// Monotonía temporal: cada parada empieza después de que acabe la anterior.
for (let i = 1; i < dia.paradas.length; i++) {
  assert.ok(dia.paradas[i].horaLlegada >= dia.paradas[i - 1].horaSalida, "el día avanza en el tiempo");
}

// --- Ancla en la base: baztán duerme en Hotel Elizondo; hay salida (coche 1ª parada) y regreso ---
assert.ok(dia.alojamiento && dia.alojamiento.slug === "hotel-elizondo", "ancla en el alojamiento de la base");
assert.ok(dia.alojamiento!.pueblo.length > 0, "la base lleva el pueblo que ve el usuario");
assert.strictEqual(dia.salidaDesde, undefined, "sin cambio de base no hay traslado");
assert.ok(dia.paradas[0].cocheDesdeAnteriorMin >= 0, "la 1ª parada arranca desde el alojamiento");
assert.ok(dia.regreso && dia.regreso.horaLlegada >= dia.paradas.at(-1)!.horaSalida, "regreso tras la última parada");
assert.ok(dia.conduccionMin >= dia.regreso.cocheMin, "la conducción total incluye el regreso");

// --- Comida intercalada: con ≥2 paradas y comida, se programa y parte la jornada ---
const conComida = itinerarioDe(["cascada-de-xorroxin", "elizondo", "infernuko-errota"], { ...opts, comida: "restaurante" }, 1);
const dc = conComida.dias[0];
assert.ok(dc.comida, "hay bloque de comida");
assert.ok(dc.comida!.horaInicio >= 13 * 60, "no se come antes de las 13:00");
assert.ok(
  dc.paradas.some((p) => p.horaInicio >= dc.comida!.horaInicio + dc.comida!.min),
  "queda al menos una parada después de comer",
);

// --- Nocturnas al final: una actividad dependeDeLuz=false se coloca tras las diurnas ---
// Busca un destino nocturno real; si no hay, se omite esta comprobación (datos-dependiente).
const nocturno = datos.destinos.find((d) => d.dependeDeLuz === false && d.gps && m.ids.includes(d.slug));
if (nocturno) {
  const zonaNoct = nocturno.zona;
  const diurnoMismaZona = datos.destinos.find(
    (d) => d.zona === zonaNoct && d.dependeDeLuz !== false && d.tipo !== "alojamiento" && d.gps && m.ids.includes(d.slug),
  );
  if (diurnoMismaZona) {
    const itN = itinerarioDe([diurnoMismaZona.slug, nocturno.slug], opts, 1);
    const paradas = itN.dias[0].paradas;
    const idxNoct = paradas.findIndex((p) => p.slug === nocturno.slug);
    assert.strictEqual(idxNoct, paradas.length - 1, "la nocturna va la última del día");
    assert.ok(paradas[idxNoct].nocturna, "marcada como nocturna");
  }
}

// --- Día de una sola parada: la comida parte la actividad, no cae al final ---
// Irati (estancia ideal 240 min) con salida a las 09:30 acaba pasadas las 13:00 → parte.
const unDia = itinerarioDe(["selva-de-irati-embalse-de-irabia"], { ...opts, ritmo: "relajado", comida: "restaurante" }, 1);
const du = unDia.dias[0];
assert.strictEqual(du.paradas.length, 1, "una sola parada");
assert.ok(!du.comida, "la comida no va a nivel de día: parte la actividad");
const pu = du.paradas[0];
assert.ok(pu.pausaComida, "la actividad lleva su pausa de comida");
assert.ok(pu.pausaComida!.horaInicio >= 13 * 60, "no se come antes de las 13:00");
assert.ok(pu.pausaComida!.horaInicio > pu.horaInicio && pu.pausaComida!.horaInicio < pu.horaSalida, "la comida cae dentro de la actividad");
assert.strictEqual(pu.horaSalida, pu.horaInicio + pu.estanciaMin + pu.pausaComida!.min, "la comida alarga la salida, no la estancia");

// Actividad corta que acaba antes de comer: NO se parte, la comida va después.
const corta = generarItinerario(
  [{ numero: 1, slugs: ["fabrica-de-orbaizeta"], min: 0, km: 0, apretado: false }],
  datos, m, { ...opts, ritmo: "activo", comida: "picnic", horaSalida: { 1: 8 * 60 } }, [],
);
const pc = corta.dias[0].paradas[0];
if (pc.horaInicio + pc.estanciaMin <= 13 * 60) {
  assert.ok(!pc.pausaComida, "actividad que acaba antes de las 13:00 no se parte");
}

// --- Día libre: sin paradas, sin conducción, no revienta ---
const vacio = generarItinerario(
  [{ numero: 1, slugs: [], min: 0, km: 0, apretado: false }], datos, m, opts, [],
);
assert.strictEqual(vacio.dias[0].paradas.length, 0, "día libre sin paradas");
assert.strictEqual(vacio.dias[0].conduccionMin, 0, "sin conducción");

// --- Base sin alojamiento rutable: el día se queda sin ancla, pero se construye igual ---
const sinAncla = generarItinerario(
  [{ numero: 1, slugs: ["cascada-de-xorroxin"], min: 0, km: 0, apretado: false }], datos, m, opts,
  [{ pueblo: "Un pueblo sin hotel en los datos", dias: [1], paradas: [] }],
);
assert.strictEqual(sinAncla.dias[0].alojamiento, undefined, "base sin ancla → día sin alojamiento");
assert.strictEqual(sinAncla.dias[0].regreso, undefined, "y sin regreso, como antes de las bases");
assert.strictEqual(sinAncla.dias[0].paradas.length, 1, "pero el día se planifica igual");

// --- Cambio de base: el caso que destapó el fallo (Baztán + Urbasa en 2 días) ---
// El día que se muda sale de la base vieja y termina en la nueva: sin hoteles huérfanos y
// sin el regreso de 93 km que provocaba anclar cada día por su cuenta.
const dosBases = itinerarioDe(
  ["ruta-bunkers-de-otsondo", "cascada-de-xorroxin", "nacedero-del-urederra", "ojo-de-iturmendi"], opts, 2,
);
const [d1, d2] = dosBases.dias;
assert.notStrictEqual(d1.alojamiento!.slug, d2.alojamiento!.slug, "el viaje cambia de base");
assert.strictEqual(d1.salidaDesde, undefined, "el primer día arranca en su propia base");
assert.ok(d2.salidaDesde, "el día de la mudanza sale de otra base");
assert.strictEqual(d2.salidaDesde!.slug, d1.alojamiento!.slug, "sale justo de donde durmió la noche anterior");
assert.strictEqual(d2.regreso && d2.regreso.horaLlegada >= d2.paradas.at(-1)!.horaSalida, true, "y termina llegando a la nueva");
// La cadena no tiene huecos: dormir donde acabó el día es la única forma de que el mapa cierre.
assert.strictEqual(d2.paradas[0].cocheDesdeAnteriorMin > 0, true, "el traslado se conduce: cuenta como coche del día");

// --- Horas de luz reales presentes y coherentes ---
assert.ok(dia.amanecer > 0 && dia.atardecer > dia.amanecer, "amanecer y anochecer coherentes");

// --- fmtHora ---
assert.strictEqual(fmtHora(8 * 60), "08:00");
assert.strictEqual(fmtHora(13 * 60 + 5), "13:05");
// Pasada la medianoche: envuelve al reloj del día (no "25:20", "32:41", que no son horas).
assert.strictEqual(fmtHora(24 * 60), "00:00");
assert.strictEqual(fmtHora(25 * 60 + 20), "01:20");
assert.strictEqual(fmtHora(32 * 60 + 41), "08:41");

console.log("OK itinerario.test.ts");
