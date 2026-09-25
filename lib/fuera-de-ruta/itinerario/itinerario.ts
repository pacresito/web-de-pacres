// Del reparto en días del panel a un plan cronológico: hora de llegada, inicio, estancia
// y salida de cada parada, comida intercalada y regreso a la base, cruzado con la luz.
import type { Comida, Destino, DatosViajes, Restaurante, Ritmo } from "../tipos";
import type { ZonaAlojamiento } from "../alojamiento/alojamiento";
import { tiempoCoche, kmCoche, ordenarDia, seg2min, centroDe, type MatrizViajes } from "../geo";
import { horasDeLuz } from "../sol";
import { COMIDA_MIN, estanciaPorRitmo } from "../presupuesto";
import { fmtHora } from "../formato";
import type { DiaViaje } from "../viaje/mi-viaje";

// Minutos desde medianoche: a ritmo activo se madruga más.
export const SALIDA_DEFECTO: Record<Ritmo, number> = { relajado: 9 * 60 + 30, medio: 9 * 60, activo: 8 * 60 };
const PREPARACION = 15;          // aparcar y prepararse
const COMIDA_MIN_HORA = 13 * 60; // no se come antes

export type OpcionesItinerario = {
  ritmo: Ritmo;
  comida: Comida;
  fecha: Date;
  horaSalida?: Record<number, number>; // por número de día
};

// Horas en minutos desde medianoche.
export type ParadaItin = {
  slug: string;
  nombre: string;
  tipo: string;
  cocheDesdeAnteriorMin: number; // la primera, desde el alojamiento
  kmDesdeAnterior: number;
  horaLlegada: number;
  prepMin: number;
  horaInicio: number;
  estanciaMin: number;
  horaSalida: number;
  nocturna: boolean;             // dependeDeLuz === false: va al final del día
  pausaComida?: ComidaItin;      // día de una sola parada: la comida la parte por la mitad
};

export type ComidaItin = { restaurante?: string; horaInicio: number; min: number };

// `pueblo` es lo que se dice al usuario; slug y nombre, el alojamiento con el que se ruta.
export type BaseItin = { slug: string; nombre: string; pueblo: string };

export type DiaItin = {
  numero: number;
  zona: string;
  alojamiento?: BaseItin;   // dónde se duerme; el regreso del día va aquí
  salidaDesde?: BaseItin;   // solo el día que se cambia de base
  horaSalida: number;
  amanecer: number;
  atardecer: number;
  paradas: ParadaItin[];
  comida?: ComidaItin;
  comidaAntesDe?: number;   // índice de la parada que sigue a la comida; sin él, va tras la última
  regreso?: { cocheMin: number; km: number; horaLlegada: number };
  conduccionMin: number;
  km: number;
  estanciaTotalMin: number;
  avisos: string[];
};

export type Itinerario = { dias: DiaItin[] };

// Respeta qué destinos van en cada día y las bases del panel —no las recalcula: si no
// coinciden palabra por palabra, es un bug—. Dentro del día reordena por cercanía.
export function generarItinerario(
  dias: DiaViaje[], datos: DatosViajes, matriz: MatrizViajes, opts: OpcionesItinerario,
  bases: ZonaAlojamiento[],
): Itinerario {
  const porSlug = new Map(datos.destinos.map((d) => [d.slug, d]));
  const restPorZona = agruparRestaurantes(datos.restaurantes);
  const basePorDia = repartirBases(dias, bases);

  return {
    dias: dias.map((dia) => construirDia(dia, { porSlug, restPorZona, matriz, opts }, {
      noche: basePorDia.get(dia.numero),
      previa: basePorDia.get(dia.numero - 1),
    })),
  };
}

// Un día libre duerme en la base del anterior.
function repartirBases(dias: DiaViaje[], bases: ZonaAlojamiento[]): Map<number, BaseItin> {
  const porDia = new Map<number, BaseItin>();
  for (const b of bases) {
    if (!b.ancla) continue;
    const base: BaseItin = { ...b.ancla, pueblo: b.pueblo };
    for (const n of b.dias) porDia.set(n, base);
  }
  let ultima: BaseItin | undefined;
  for (const d of dias) {
    const base = porDia.get(d.numero) ?? ultima;
    if (base) porDia.set(d.numero, base);
    ultima = base;
  }
  return porDia;
}

type Ctx = {
  porSlug: Map<string, Destino>;
  restPorZona: Map<string, Restaurante>;
  matriz: MatrizViajes;
  opts: OpcionesItinerario;
};

// El día que cambian, se sale de `previa` con las maletas y el regreso lleva a `noche`.
type Bases = { noche?: BaseItin; previa?: BaseItin };

function construirDia(dia: DiaViaje, ctx: Ctx, bases: Bases): DiaItin {
  const { opts, matriz } = ctx;
  const destinos = dia.slugs.flatMap((s) => ctx.porSlug.get(s) ?? []);
  const zona = destinos.length ? zonaDominante(destinos) : "";
  const alojamiento = bases.noche;
  // El primer día arranca en su propia base: llegar de casa no se ruta.
  const arranque = bases.previa ?? alojamiento;
  const salidaDesde = arranque && arranque.slug !== alojamiento?.slug ? arranque : undefined;
  const horaSalida = opts.horaSalida?.[dia.numero] ?? SALIDA_DEFECTO[opts.ritmo];
  const avisos: string[] = [];

  const centro = centroDe(destinos) ?? (ctx.porSlug.get(alojamiento?.slug ?? "")?.gps ?? null);
  const { amanecer, atardecer } = centro
    ? horasDeLuz(opts.fecha, centro[0], centro[1])
    : { amanecer: 0, atardecer: 0 };

  if (destinos.length === 0) {
    return { numero: dia.numero, zona, alojamiento, salidaDesde, horaSalida, amanecer, atardecer,
      paradas: [], conduccionMin: 0, km: 0, estanciaTotalMin: 0, avisos };
  }

  // Diurnas por cercanía desde la base, nocturnas después y sin GPS al final.
  const enRuta = destinos.filter((d) => d.gps && matriz.ids.includes(d.slug));
  const sinGps = destinos.filter((d) => !enRuta.includes(d));
  const diurnas = enRuta.filter((d) => d.dependeDeLuz !== false);
  const nocturnas = enRuta.filter((d) => d.dependeDeLuz === false);
  const ordenDiurnas = ordenarDia(matriz, diurnas.map((d) => d.slug), arranque?.slug).orden;
  const ultimaDiurna = ordenDiurnas[ordenDiurnas.length - 1];
  const ordenNocturnas = ordenarDia(matriz, nocturnas.map((d) => d.slug), ultimaDiurna).orden;
  const orden = [...ordenDiurnas, ...ordenNocturnas, ...sinGps.map((d) => d.slug)];

  const rutable = (s: string | undefined): s is string => !!s && matriz.ids.includes(s);
  const tramos = orden.map((s, i) => {
    const prev = i > 0 ? orden[i - 1] : arranque?.slug;
    return rutable(prev) && rutable(s)
      ? { coche: seg2min(tiempoCoche(matriz, prev, s)), km: kmCoche(matriz, prev, s) }
      : { coche: 0, km: 0 };
  });
  const coches = tramos.map((t) => t.coche);
  const estancias = orden.map((s) => estanciaPorRitmo(ctx.porSlug.get(s)!, opts.ritmo));

  const { comidaMin, restaurante } = resolverComida(opts.comida, zona, ctx, avisos);
  const idxComida = indiceComida(coches, estancias, orden.length, comidaMin);

  const paradas: ParadaItin[] = [];
  let comida: ComidaItin | undefined;
  let cursor = horaSalida;
  const unaParada = orden.length === 1;
  orden.forEach((slug, i) => {
    const d = ctx.porSlug.get(slug)!;
    cursor += coches[i];
    if (i === idxComida) {
      cursor = Math.max(cursor, COMIDA_MIN_HORA);
      comida = { restaurante, horaInicio: cursor, min: comidaMin };
      cursor += comidaMin;
    }
    const horaLlegada = cursor;
    const prep = coches[i] > 0 ? PREPARACION : 0;
    const horaInicio = horaLlegada + prep;
    const fin = horaInicio + estancias[i];
    // Con una sola actividad no hay hueco entre paradas: si sigue en marcha a la hora de
    // comer, la comida la parte y alarga la salida.
    let pausaComida: ComidaItin | undefined;
    let horaSalidaParada = fin;
    if (unaParada && comidaMin > 0 && fin > COMIDA_MIN_HORA) {
      const horaComida = Math.min(Math.max(horaInicio + Math.floor(estancias[i] / 2), COMIDA_MIN_HORA), fin);
      pausaComida = { restaurante, horaInicio: horaComida, min: comidaMin };
      horaSalidaParada = fin + comidaMin;
    }
    paradas.push({
      slug, nombre: d.nombre, tipo: d.tipo,
      cocheDesdeAnteriorMin: coches[i], kmDesdeAnterior: Math.round(tramos[i].km),
      horaLlegada, prepMin: prep, horaInicio, estanciaMin: estancias[i], horaSalida: horaSalidaParada,
      nocturna: d.dependeDeLuz === false && enRuta.includes(d), pausaComida,
    });
    cursor = horaSalidaParada;
  });
  if (comidaMin > 0 && idxComida < 0 && !paradas.some((p) => p.pausaComida)) {
    comida = { restaurante, horaInicio: Math.max(cursor, COMIDA_MIN_HORA), min: comidaMin };
  }

  // La vuelta sale de la última parada rutable. El día que se cambia de base, esta vuelta
  // ES el traslado: no hay un tramo extra que sumar.
  let regreso: DiaItin["regreso"];
  const ultimaRutable = [...orden].reverse().find(rutable);
  if (alojamiento && ultimaRutable && rutable(alojamiento.slug)) {
    const cocheMin = seg2min(tiempoCoche(matriz, ultimaRutable, alojamiento.slug));
    regreso = { cocheMin, km: Math.round(kmCoche(matriz, ultimaRutable, alojamiento.slug)), horaLlegada: cursor + cocheMin };
  }

  const conduccionMin = coches.reduce((s, c) => s + c, 0) + (regreso?.cocheMin ?? 0);
  const km = Math.round(tramos.reduce((s, t) => s + t.km, 0) + (regreso?.km ?? 0));
  const estanciaTotalMin = estancias.reduce((s, e) => s + e, 0);

  // La hora del aviso es la de llegada a la base, la última fila que se ve.
  const finUltima = paradas.length ? paradas[paradas.length - 1].horaSalida : horaSalida;
  if (atardecer > 0 && finUltima > atardecer) {
    const finDia = regreso ? regreso.horaLlegada : finUltima;
    const marca = finDia >= 1440 ? " (¡del día siguiente!)" : "";
    avisos.push(`El día termina a las ${fmtHora(finDia)}${marca}, después del anochecer (${fmtHora(atardecer)})`);
  }

  return { numero: dia.numero, zona, alojamiento, salidaDesde, horaSalida, amanecer, atardecer,
    paradas, comida, comidaAntesDe: idxComida >= 0 ? idxComida : undefined,
    regreso, conduccionMin, km, estanciaTotalMin, avisos };
}

// La primera parada que cruza la mitad del trabajo del día, para que siempre quede algo
// después de comer. -1 si no hay comida o solo hay una parada.
function indiceComida(coches: number[], estancias: number[], n: number, comidaMin: number): number {
  if (comidaMin <= 0 || n < 2) return -1;
  const trabajoTotal = coches.reduce((s, c) => s + c, 0) + estancias.reduce((s, e) => s + e, 0);
  let acum = 0;
  for (let i = 0; i < n; i++) {
    if (i > 0 && acum + coches[i] >= trabajoTotal / 2) return i;
    acum += coches[i] + estancias[i];
  }
  return n - 1;
}

// "restaurante" avisa si la zona no tiene; "da-igual" cae a picnic sin avisar.
function resolverComida(comida: Comida, zona: string, ctx: Ctx, avisos: string[]): { comidaMin: number; restaurante?: string } {
  if (comida === "restaurante" || comida === "da-igual") {
    const r = ctx.restPorZona.get(zona);
    if (r) return { comidaMin: COMIDA_MIN.restaurante, restaurante: r.nombre };
    if (comida === "restaurante") avisos.push(`Sin restaurante en la zona (${zona}): lleva picnic`);
    return { comidaMin: COMIDA_MIN.picnic };
  }
  return { comidaMin: COMIDA_MIN[comida] };
}

// El primer restaurante de cada zona.
function agruparRestaurantes(rs: Restaurante[]): Map<string, Restaurante> {
  const m = new Map<string, Restaurante>();
  for (const r of rs) if (!m.has(r.zona)) m.set(r.zona, r);
  return m;
}

const zonaDominante = (ds: Destino[]): string => {
  const cuenta = new Map<string, number>();
  for (const d of ds) cuenta.set(d.zona, (cuenta.get(d.zona) ?? 0) + 1);
  return [...cuenta].sort((a, b) => b[1] - a[1])[0][0];
};
