// Lo que las vistas de la guía derivan del itinerario: totales, consejos del día y
// alternativas de lluvia.
import type { Destino, Ritmo } from "../tipos";
import { tiempoCoche, kmCoche, seg2min, type MatrizViajes } from "../geo";
import { estanciaPorRitmo } from "../presupuesto";
import type { ComidaItin, DiaItin, Itinerario } from "../itinerario/itinerario";

// Cierre obligatorio: no garantizamos datos de terceros.
export const CIERRE =
  "La guía se genera con la información disponible en el momento de su creación. Por este motivo, " +
  "antes de realizar el viaje se recomienda comprobar posibles cambios que dependan de terceros, " +
  "como horarios, reservas o condiciones de acceso.";

export type TotalesViaje = {
  dias: number;
  diasConPlan: number;
  actividades: number;
  conduccionMin: number;
  km: number;
  estanciaMin: number;
  zonas: string[]; // ids, en orden de viaje
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

// Todas las comidas del día: la del mediodía y la que parte una actividad.
export const comidasDe = (dia: DiaItin): ComidaItin[] =>
  [dia.comida, ...dia.paradas.map((p) => p.pausaComida)].filter((c) => c !== undefined);

// Solo lo que cambia algo que se hace ANTES de salir, derivado de las paradas del día.
// El orden es la prioridad.
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

  const comidas = comidasDe(dia);
  if (comidas.length > 0 && comidas.every((c) => !c.restaurante)) {
    consejos.push("Comprar la comida antes de salir: hoy no hay parada en restaurante");
  }

  // Por la hora, no por `nocturna`: una cueva a las 11:00 sigue siendo de día.
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

// Lluvia: a cada parada que la lluvia estropea se le precalcula el refugio más cercano
// fuera del viaje —por tipo o actividad, y sin caminata larga—. No consulta la previsión.
const MOTIVO_REFUGIO = new Map([
  ["pueblo", "Un pueblo se pasea igual con lluvia y siempre hay dónde resguardarse."],
  ["cueva", "Bajo tierra la lluvia da lo mismo."],
  ["balneario", "Bajo techo, y con lluvia hasta mejor."],
  ["spa", "Bajo techo, y con lluvia hasta mejor."],
  ["bodega", "Visita bajo techo."],
  ["museo", "Visita bajo techo."],
]);
const MAX_PASEO_KM = 2;
// Sustituye a la actividad del día entero, así que aguanta más coche que una parada.
const MAX_COCHE_MIN = 60;

const categoria = (d: Destino) => d.actividad ?? d.tipo;

export function esRefugio(d: Destino): boolean {
  return MOTIVO_REFUGIO.has(categoria(d)) && !!d.gps && (!d.distanciaKm || d.distanciaKm[1] <= MAX_PASEO_KM);
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

// Por slug de la parada a la que sustituye. Las que ya son refugio no tienen.
export function alternativasLluvia(
  it: Itinerario, destinos: Destino[], matriz: MatrizViajes, ritmo: Ritmo,
): Map<string, Alternativa> {
  const porSlug = new Map(destinos.map((d) => [d.slug, d]));
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
        km: Math.round(kmCoche(matriz, parada.slug, cerca.r.slug)),
        estanciaMin: estanciaPorRitmo(cerca.r, ritmo),
        motivo: MOTIVO_REFUGIO.get(categoria(cerca.r))!,
      });
    }
  }
  return alternativas;
}
