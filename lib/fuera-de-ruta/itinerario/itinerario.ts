// Generador de itinerario cronológico (Fase E, §5.3 + briefing §5). De «lista repartida
// en días» (lo que decide el panel «Mi viaje») a «plan cronológico»: para cada parada
// calcula hora de llegada, de inicio, estancia (modulada por el ritmo, no fija), hora de
// salida y conducción a la siguiente; ancla el día en la base donde se duerme (salida y
// regreso) y cruza cada jornada contra las horas de luz. Determinista, IA cero.
// Puro. Test: `npx tsx lib/fuera-de-ruta/itinerario/itinerario.test.ts`.
import type { Comida, Destino, DatosViajes, Restaurante, Ritmo } from "../tipos";
import type { ZonaAlojamiento } from "../alojamiento/alojamiento";
import { tiempoCoche, kmCoche, ordenarDia, seg2min, centroDe, type MatrizViajes } from "../geo";
import { horasDeLuz } from "../sol";
import { COMIDA_MIN, VISITA_DEFECTO } from "../presupuesto";
import type { DiaViaje } from "../viaje/mi-viaje";

// Hora de salida por defecto según ritmo (minutos desde medianoche): quien va a un ritmo
// activo madruga más. Configurable por día desde la UI (opts.horaSalida).
export const SALIDA_DEFECTO: Record<Ritmo, number> = { relajado: 9 * 60 + 30, medio: 9 * 60, activo: 8 * 60 };
const PREPARACION = 15;        // min para aparcar y prepararse antes de empezar la actividad
const COMIDA_MIN_HORA = 13 * 60; // no se come antes de esta hora (§ construirDia del planificador)

export type OpcionesItinerario = {
  ritmo: Ritmo;
  comida: Comida;
  fecha: Date;
  horaSalida?: Record<number, number>; // minutos desde medianoche por número de día; si falta, SALIDA_DEFECTO
};

export type ParadaItin = {
  slug: string;
  nombre: string;
  tipo: string;
  cocheDesdeAnteriorMin: number; // desde la parada anterior (o desde el alojamiento la primera)
  kmDesdeAnterior: number;
  horaLlegada: number;           // minutos desde medianoche
  prepMin: number;               // aparcar y prepararse
  horaInicio: number;            // llegada + preparación
  estanciaMin: number;           // estancia modulada por el ritmo
  horaSalida: number;            // inicio + estancia (+ comida si la actividad se parte)
  nocturna: boolean;             // dependeDeLuz === false: se coloca al final del día
  pausaComida?: ComidaItin;      // día de una sola parada: la comida parte la actividad por la mitad
};

export type ComidaItin = { restaurante?: string; horaInicio: number; min: number };

// Base donde se duerme: el pueblo es lo que se le dice al usuario («noche en Elizondo»);
// slug/nombre son el alojamiento con el que se ruta.
export type BaseItin = { slug: string; nombre: string; pueblo: string };

export type DiaItin = {
  numero: number;
  zona: string;
  alojamiento?: BaseItin;   // dónde se duerme esa noche; el regreso del día va aquí
  salidaDesde?: BaseItin;   // solo el día que se cambia de base: se sale con las maletas de la anterior
  horaSalida: number;
  amanecer: number;
  atardecer: number;
  paradas: ParadaItin[];
  comida?: ComidaItin;                             // comida del mediodía, si se programó
  regreso?: { cocheMin: number; km: number; horaLlegada: number }; // vuelta al alojamiento
  conduccionMin: number;                           // coche total del día (paradas + regreso)
  km: number;
  estanciaTotalMin: number;
  avisos: string[];
};

export type Itinerario = { dias: DiaItin[] };


// Estancia recomendada modulada por el ritmo: activo tira al mínimo (ver más sitios),
// relajado al ideal (disfrutar), medio al punto medio. Sin datos de estancia, cae a la
// duración (duracionHoras) y, en último caso, al valor por defecto del planificador.
export function estanciaPorRitmo(d: Destino, ritmo: Ritmo): number {
  const min = d.estanciaMin ?? (d.duracionHoras ? Math.round(d.duracionHoras[0] * 60) : VISITA_DEFECTO);
  const ideal = d.estanciaIdeal ?? (d.duracionHoras ? Math.round(d.duracionHoras[1] * 60) : min);
  if (ritmo === "activo") return min;
  if (ritmo === "relajado") return ideal;
  return Math.round((min + ideal) / 2);
}

// Selección repartida en días (panel «Mi viaje») + bases donde dormir (panel «Dónde
// dormir») → itinerario cronológico. Respeta el reparto del panel (qué destinos van en cada
// día); reordena dentro del día por cercanía y coloca las nocturnas al final. Los días
// libres (sin paradas) se conservan vacíos. **Las bases son las del panel, no se
// recalculan aquí**: si las dos fuentes no coinciden palabra por palabra, es un bug.
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

// Base de cada número de día. Las bases solo cubren los días con paradas; un día libre
// hereda la del día anterior (se duerme igual aunque no se visite nada).
function repartirBases(dias: DiaViaje[], bases: ZonaAlojamiento[]): Map<number, BaseItin> {
  const porDia = new Map<number, BaseItin>();
  for (const b of bases) {
    if (!b.ancla) continue; // base sin alojamiento rutable: el día se queda sin ancla, como antes
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

// Base de la noche y base de la noche anterior. El día que cambian, se conduce de una a
// otra: se sale de la anterior con las maletas y el regreso del día lleva a la nueva.
type Bases = { noche?: BaseItin; previa?: BaseItin };

function construirDia(dia: DiaViaje, ctx: Ctx, bases: Bases): DiaItin {
  const { opts } = ctx;
  const destinos = dia.slugs.map((s) => ctx.porSlug.get(s)!).filter(Boolean);
  const zona = destinos.length ? zonaDominante(destinos) : "";
  const alojamiento = bases.noche;
  // El primer día no viene de ninguna base: arranca en la suya (llegar de casa no se rutea).
  const arranque = bases.previa ?? alojamiento;
  const salidaDesde = arranque && arranque.slug !== alojamiento?.slug ? arranque : undefined;
  const horaSalida = opts.horaSalida?.[dia.numero] ?? SALIDA_DEFECTO[opts.ritmo];
  const avisos: string[] = [];

  // Horas de luz del día: en el centro de las paradas (apenas varía dentro de la comunidad).
  const centro = centroDe(destinos) ?? (ctx.porSlug.get(alojamiento?.slug ?? "")?.gps ?? null);
  const { amanecer, atardecer } = centro
    ? horasDeLuz(opts.fecha, centro[0], centro[1])
    : { amanecer: 0, atardecer: 0 };

  if (destinos.length === 0) {
    return { numero: dia.numero, zona, alojamiento, salidaDesde, horaSalida, amanecer, atardecer,
      paradas: [], conduccionMin: 0, km: 0, estanciaTotalMin: 0, avisos };
  }

  // Orden del día: rutables por cercanía (TSP arrancando en la base de la que se sale);
  // las nocturnas (dependeDeLuz === false: cuevas, cenas, museos) al final, tras la última
  // diurna. Los destinos sin GPS no entran en la matriz: se cuelgan al final sin coche.
  const enRuta = destinos.filter((d) => d.gps && ctx.matriz.ids.includes(d.slug));
  const sinGps = destinos.filter((d) => !enRuta.includes(d));
  const diurnas = enRuta.filter((d) => d.dependeDeLuz !== false);
  const nocturnas = enRuta.filter((d) => d.dependeDeLuz === false);
  const ordenDiurnas = ordenarDia(ctx.matriz, diurnas.map((d) => d.slug), arranque?.slug).orden;
  const ultimaDiurna = ordenDiurnas[ordenDiurnas.length - 1];
  const ordenNocturnas = ordenarDia(ctx.matriz, nocturnas.map((d) => d.slug), ultimaDiurna).orden;
  const orden = [...ordenDiurnas, ...ordenNocturnas, ...sinGps.map((d) => d.slug)];

  // Coche y estancia de cada parada; la primera arranca desde la base de salida (o 0 sin ancla).
  const previos = [arranque?.slug, ...orden.slice(0, -1)];
  const coches = orden.map((s, i) => {
    const prev = previos[i];
    return prev && ctx.matriz.ids.includes(s) && ctx.matriz.ids.includes(prev) ? seg2min(tiempoCoche(ctx.matriz, prev, s)) : 0;
  });
  const kms = orden.map((s, i) => {
    const prev = previos[i];
    return prev && ctx.matriz.ids.includes(s) && ctx.matriz.ids.includes(prev) ? kmCoche(ctx.matriz, prev, s) / 1000 : 0;
  });
  const estancias = orden.map((s) => estanciaPorRitmo(ctx.porSlug.get(s)!, opts.ritmo));

  // Comida del mediodía: bloque según la respuesta ("da-igual" → restaurante si la zona
  // tiene, si no picnic), intercalada en la parada que cruza la mitad del trabajo del día
  // (así siempre quedan paradas después de comer), nunca antes de COMIDA_MIN_HORA.
  const { comidaMin, restaurante } = resolverComida(opts.comida, zona, ctx, avisos);
  const idxComida = indiceComida(coches, estancias, orden.length, comidaMin);

  const paradas: ParadaItin[] = [];
  let comida: ComidaItin | undefined;
  let cursor = horaSalida;
  const unaParada = orden.length === 1;
  const nocturnasSet = new Set(nocturnas.map((d) => d.slug));
  orden.forEach((slug, i) => {
    const d = ctx.porSlug.get(slug)!;
    cursor += coches[i];
    if (i === idxComida) {
      cursor = Math.max(cursor, COMIDA_MIN_HORA);
      comida = { restaurante, horaInicio: cursor, min: comidaMin };
      cursor += comidaMin;
    }
    const horaLlegada = cursor;
    const prep = coches[i] > 0 ? PREPARACION : 0; // sin conducción previa no hay que aparcar
    const horaInicio = horaLlegada + prep;
    const fin = horaInicio + estancias[i];
    // Día de una sola actividad: la comida no puede intercalarse entre paradas (no hay dos),
    // así que parte la propia actividad por la mitad —comer al terminar 6 h de ruta no tiene
    // sentido—. Solo si la actividad sigue en marcha a la hora de comer; si acaba antes, se
    // come después (más abajo). La comida es tiempo extra: alarga la salida, no la estancia.
    let pausaComida: ComidaItin | undefined;
    let horaSalidaParada = fin;
    if (unaParada && comidaMin > 0 && fin > COMIDA_MIN_HORA) {
      const horaComida = Math.min(Math.max(horaInicio + Math.floor(estancias[i] / 2), COMIDA_MIN_HORA), fin);
      pausaComida = { restaurante, horaInicio: horaComida, min: comidaMin };
      horaSalidaParada = fin + comidaMin;
    }
    paradas.push({
      slug, nombre: d.nombre, tipo: d.tipo,
      cocheDesdeAnteriorMin: coches[i], kmDesdeAnterior: Math.round(kms[i]),
      horaLlegada, prepMin: prep, horaInicio, estanciaMin: estancias[i], horaSalida: horaSalidaParada,
      nocturna: nocturnasSet.has(slug), pausaComida,
    });
    cursor = horaSalidaParada;
  });
  // Comida no colocada aún (día de una parada que acaba antes de comer, o sin reparto): se
  // sitúa tras la última con hora coherente. Si la actividad se partió, ya lleva su pausa.
  if (comidaMin > 0 && idxComida < 0 && !paradas.some((p) => p.pausaComida)) {
    comida = { restaurante, horaInicio: Math.max(cursor, COMIDA_MIN_HORA), min: comidaMin };
  }

  // Vuelta a la base de la noche desde la última parada rutable (la última puede ser
  // sin-GPS). El día que se cambia de base, esta vuelta ES el traslado: mismo tramo, otro
  // destino —por eso no hay un trayecto extra que sumar—.
  let regreso: DiaItin["regreso"];
  const ultimaRutable = [...orden].reverse().find((s) => ctx.matriz.ids.includes(s));
  if (alojamiento && ultimaRutable && ctx.matriz.ids.includes(alojamiento.slug)) {
    const cocheMin = seg2min(tiempoCoche(ctx.matriz, ultimaRutable, alojamiento.slug));
    regreso = { cocheMin, km: Math.round(kmCoche(ctx.matriz, ultimaRutable, alojamiento.slug) / 1000), horaLlegada: cursor + cocheMin };
  }

  const conduccionMin = coches.reduce((s, c) => s + c, 0) + (regreso?.cocheMin ?? 0);
  const km = Math.round(kms.reduce((s, k) => s + k, 0) + (regreso?.km ?? 0));
  const estanciaTotalMin = estancias.reduce((s, e) => s + e, 0);

  // Aviso solo si el plan no cabe en la luz (la auditoría fina es Fase F): la última
  // actividad acaba después del anochecer. La hora que se muestra es la del fin real del
  // día —la vuelta al alojamiento, que es la última fila de la cronología—, no la salida de
  // la última parada; así el aviso coincide con lo que se ve arriba. Si cruza medianoche, se
  // dice explícito (en la cronología la hora va envuelta, aquí no puede quedar ambigua).
  const finUltima = paradas.length ? paradas[paradas.length - 1].horaSalida : horaSalida;
  if (atardecer > 0 && finUltima > atardecer) {
    const finDia = regreso ? regreso.horaLlegada : finUltima;
    const marca = finDia >= 1440 ? " (¡del día siguiente!)" : "";
    avisos.push(`El día termina a las ${fmtHora(finDia)}${marca}, después del anochecer (${fmtHora(atardecer)})`);
  }

  return { numero: dia.numero, zona, alojamiento, salidaDesde, horaSalida, amanecer, atardecer,
    paradas, comida, regreso, conduccionMin, km, estanciaTotalMin, avisos };
}

// Índice de la 1ª parada de la tarde: la que cruza la mitad del trabajo del día (coche +
// estancia). Con ≥2 paradas garantiza reparto mañana/tarde; con 1 (o sin comida) no parte.
function indiceComida(coches: number[], estancias: number[], n: number, comidaMin: number): number {
  if (comidaMin <= 0 || n < 2) return -1;
  const trabajoTotal = coches.reduce((s, c) => s + c, 0) + estancias.reduce((s, e) => s + e, 0);
  let acum = 0;
  for (let i = 0; i < n; i++) {
    if (i > 0 && acum + coches[i] >= trabajoTotal / 2) return i;
    acum += coches[i] + estancias[i];
  }
  return n - 1; // que al menos la última quede tras comer
}

// Comida del mediodía: minutos y restaurante de la zona. "da-igual" toma restaurante si la
// zona tiene y picnic si no (sin aviso); "restaurante" avisa cuando no hay.
function resolverComida(comida: Comida, zona: string, ctx: Ctx, avisos: string[]): { comidaMin: number; restaurante?: string } {
  if (comida === "restaurante" || comida === "da-igual") {
    const r = ctx.restPorZona.get(zona);
    if (r) return { comidaMin: COMIDA_MIN.restaurante, restaurante: r.nombre };
    if (comida === "restaurante") { avisos.push(`Sin restaurante en la zona (${zona}): lleva picnic`); return { comidaMin: COMIDA_MIN.picnic }; }
    return { comidaMin: COMIDA_MIN.picnic };
  }
  return { comidaMin: COMIDA_MIN[comida] };
}

// Un restaurante por zona (el primero que aparece).
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

// "HH:MM" desde minutos-de-medianoche. Exportada: la UI del itinerario pinta todas las
// horas. Si un día se alarga más allá de medianoche (sobre-selección extrema, ya avisada),
// la hora envuelve al reloj del día: "01:20" en vez de "25:20", que no es una hora real. En
// la cronología se ve solo, y el aviso del final lo dice explícito ("del día siguiente").
export const fmtHora = (min: number) => {
  const enDia = min % 1440;
  return `${String(Math.floor(enDia / 60)).padStart(2, "0")}:${String(enDia % 60).padStart(2, "0")}`;
};
