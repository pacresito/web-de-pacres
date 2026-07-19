// Guías finales (Fase G, §5.4-5.9 + briefing §10). Cuatro vistas de los MISMOS datos —el
// itinerario de la Fase E—, no cuatro procesos: aquí solo vive lo que hay que derivar para
// ellas —totales del viaje, consejos del día y las alternativas de lluvia precalculadas—.
// Determinista, IA cero. Puro. Test: `npx tsx lib/fuera-de-ruta/guia/guia.test.ts`.
import type { Destino } from "../tipos";
import { tiempoCoche, kmCoche, type MatrizViajes } from "../planificador/geo";
import type { Ritmo } from "../planificador/tipos";
import { estanciaPorRitmo, type DiaItin, type Itinerario } from "../itinerario/itinerario";

// Frase de cierre obligatoria de las guías (§1.9): no garantizamos datos de terceros.
export const CIERRE =
  "La guía se genera con la información disponible en el momento de su creación. Por este motivo, " +
  "antes de realizar el viaje se recomienda comprobar posibles cambios que dependan de terceros, " +
  "como horarios, reservas o condiciones de acceso.";

const seg2min = (seg: number) => Math.round(seg / 60);

// --------------------------------------------------------------- Totales del viaje
export type TotalesViaje = {
  dias: number;
  diasConPlan: number;
  actividades: number;
  conduccionMin: number;
  km: number;
  estanciaMin: number;
  zonas: string[]; // ids de zona visitadas, en orden de viaje
};

export function totalesViaje(it: Itinerario): TotalesViaje {
  const conPlan = it.dias.filter((d) => d.paradas.length > 0);
  const zonas: string[] = [];
  for (const d of conPlan) if (d.zona && !zonas.includes(d.zona)) zonas.push(d.zona);
  return {
    dias: it.dias.length,
    diasConPlan: conPlan.length,
    actividades: conPlan.reduce((s, d) => s + d.paradas.length, 0),
    conduccionMin: it.dias.reduce((s, d) => s + d.conduccionMin, 0),
    km: it.dias.reduce((s, d) => s + d.km, 0),
    estanciaMin: it.dias.reduce((s, d) => s + d.estanciaTotalMin, 0),
    zonas,
  };
}

// --------------------------------------------------------------- Consejos del día
// «Solo consejos realmente útiles» (§5.4): los que cambian algo que haces ANTES de salir
// —qué metes en la mochila, qué reservas, con qué coche vas—. Todos se derivan del dato de
// las paradas del día; nada genérico ("lleva agua" no depende del día, así que no entra).
// Orden = prioridad: si hay más de MAX_CONSEJOS, se quedan los primeros.
const MAX_CONSEJOS = 5;

export function consejosDelDia(dia: DiaItin, porSlug: Map<string, Destino>): string[] {
  const paradas = dia.paradas.map((p) => porSlug.get(p.slug)).filter((d): d is Destino => !!d);
  if (paradas.length === 0) return [];
  const nombres = (ds: Destino[]) => ds.map((d) => d.nombre).join(", ");
  const consejos: string[] = [];

  const conReserva = paradas.filter((d) => d.reserva);
  if (conReserva.length) consejos.push(`Reservar antes de ir: ${nombres(conReserva)}`);

  const material = [...new Set(paradas.flatMap((d) => d.material ?? []))];
  if (material.length) consejos.push(`Llevar: ${material.slice(0, 4).join(" · ")}`);

  // La comida solo se compra antes si el día no pasa por ningún restaurante.
  const comidas = [dia.comida, ...dia.paradas.map((p) => p.pausaComida)].filter((c) => c !== undefined);
  if (comidas.length > 0 && comidas.every((c) => !c.restaurante)) {
    consejos.push("Comprar la comida antes de salir: hoy no hay parada en restaurante");
  }

  // Frontal: solo si el día se alarga más allá del anochecer. Que una parada sea `nocturna`
  // no basta —significa que no depende de la luz, y una cueva a las 11:00 sigue siendo de
  // día—; la linterna que pida por sí misma ya viene en su `material`.
  const finDia = dia.paradas.at(-1)!.horaSalida;
  if (dia.atardecer > 0 && finDia > dia.atardecer) {
    consejos.push("Llevar frontal o linterna: el día acaba sin luz");
  }

  const conHorario = paradas.filter((d) => d.horario);
  if (conHorario.length) consejos.push(`Comprobar horarios y accesos: ${nombres(conHorario)}`);

  const pistas = paradas.filter((d) => d.accesoCarretera === "pista");
  if (pistas.length) consejos.push(`Acceso por pista sin asfaltar: ${nombres(pistas)}`);

  const sinSenalizar = paradas.filter((d) => /gps|track/i.test(d.senalizacion ?? ""));
  if (sinSenalizar.length) consejos.push(`Descargar el track con cobertura, la señalización es justa: ${nombres(sinSenalizar)}`);

  if (dia.km >= 150) consejos.push(`Salir con el depósito lleno: hoy son ${dia.km} km`);

  return consejos.slice(0, MAX_CONSEJOS);
}

// --------------------------------------------------------------- Guía B: lluvia
// Alternativa precalculada por actividad (§5.5): NO se reorganiza el viaje ni se consulta
// meteorología — a cada parada que la lluvia estropea se le busca de antemano el refugio
// más cercano que no está ya en el viaje. Decide el usuario, y solo si llueve.
//
// «Refugio» sobre el dato que hay: sitios donde la lluvia no cancela el plan (pueblo que se
// pasea, cueva, balneario, bodega, museo) y que no exijan una caminata larga para llegar
// —una alternativa de lluvia que empieza con 5 km de sendero no es una alternativa—.
const TIPOS_REFUGIO = new Set(["pueblo", "cueva"]);
const ACTIVIDADES_REFUGIO = new Set(["balneario", "spa", "bodega", "museo"]);
const MAX_PASEO_KM = 2;
// Una hora de coche: el refugio sustituye a la actividad del día entero, no a un rato, así
// que aguanta más viaje que una parada normal (con 45 min, Tudela —el plan de lluvia obvio
// de las Bardenas— se quedaba fuera por un minuto).
const MAX_COCHE_MIN = 60;

const MOTIVO: Record<string, string> = {
  pueblo: "Un pueblo se pasea igual con lluvia y siempre hay dónde resguardarse.",
  cueva: "Bajo tierra la lluvia da lo mismo.",
  balneario: "Bajo techo, y con lluvia hasta mejor.",
  spa: "Bajo techo, y con lluvia hasta mejor.",
  bodega: "Visita bajo techo.",
  museo: "Visita bajo techo.",
};

export function esRefugio(d: Destino): boolean {
  const categoria = d.actividad ?? d.tipo;
  const cubierto = TIPOS_REFUGIO.has(d.tipo) || ACTIVIDADES_REFUGIO.has(categoria);
  return cubierto && !!d.gps && (!d.distanciaKm || d.distanciaKm[1] <= MAX_PASEO_KM);
}

export type Alternativa = {
  slug: string;
  nombre: string;
  queEs: string;
  cocheMin: number;
  km: number;
  estanciaMin: number;
  motivo: string;
};

// Clave: slug de la parada del itinerario a la que sustituye. Las paradas que ya son
// refugio no la necesitan (la lluvia no las estropea) y no aparecen en el mapa.
export function alternativasLluvia(
  it: Itinerario, porSlug: Map<string, Destino>, destinos: Destino[], matriz: MatrizViajes, ritmo: Ritmo,
): Map<string, Alternativa> {
  const enViaje = new Set(it.dias.flatMap((d) => d.paradas.map((p) => p.slug)));
  const refugios = destinos.filter((d) => !enViaje.has(d.slug) && esRefugio(d) && matriz.ids.includes(d.slug));
  const alternativas = new Map<string, Alternativa>();
  if (refugios.length === 0) return alternativas;

  for (const dia of it.dias) {
    for (const parada of dia.paradas) {
      const origen = porSlug.get(parada.slug);
      if (!origen || esRefugio(origen) || !matriz.ids.includes(parada.slug)) continue;
      if (alternativas.has(parada.slug)) continue;

      const cerca = refugios
        .map((r) => ({ r, min: seg2min(tiempoCoche(matriz, parada.slug, r.slug)) }))
        .sort((a, b) => a.min - b.min)[0];
      if (cerca.min > MAX_COCHE_MIN) continue;

      alternativas.set(parada.slug, {
        slug: cerca.r.slug,
        nombre: cerca.r.nombre,
        queEs: cerca.r.queEs,
        cocheMin: cerca.min,
        km: Math.round(kmCoche(matriz, parada.slug, cerca.r.slug) / 1000),
        estanciaMin: estanciaPorRitmo(cerca.r, ritmo),
        motivo: MOTIVO[cerca.r.actividad ?? cerca.r.tipo] ?? "Se disfruta igual con mal tiempo.",
      });
    }
  }
  return alternativas;
}
