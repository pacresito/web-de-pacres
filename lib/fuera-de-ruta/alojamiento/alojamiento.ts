// Dónde dormir: agrupa días consecutivos en una base y corta donde mudarse ahorra más
// coche del que cuesta. Propone localidades (de `pueblosAlojamiento`), nunca un hotel.
import type { Destino } from "../tipos";
import type { ResumenViaje } from "../viaje/mi-viaje";
import { tiempoCoche, seg2min, SALTO_ZONA_MIN, type MatrizViajes } from "../geo";

// `pueblo` es lo que ve el usuario. `ancla` es un alojamiento real con GPS con el que el
// itinerario ruta, nunca una recomendación; falta si el tramo no tiene ninguno rutable.
export type ZonaAlojamiento = {
  pueblo: string;
  dias: number[];
  paradas: string[];
  ahorroMin?: number;               // coche que ahorra mudarse aquí desde la base anterior
  ancla?: { slug: string; nombre: string };
  cocheDiaMin?: (number | null)[];  // ida + vuelta a la base, paralelo a `dias`
};

export type OpcionesAlojamiento = {
  ahorroMin?: number;  // coche que debe ahorrar una mudanza para compensar
  max?: number;        // tope de bases
  saltoMin?: number;   // salto que justifica mudarse, cuando no hay alojamientos que medir
};

// Lo que cuesta mudarse (maletas, check-out, check-in). Una base más solo entra si ahorra
// más coche que esto.
const AHORRO_MUDANZA_MIN = 90;

export function zonasAlojamiento(
  resumen: ResumenViaje,
  porSlug: Map<string, Destino>,
  matriz: MatrizViajes,
  opts: OpcionesAlojamiento = {},
): ZonaAlojamiento[] {
  const dias = resumen.dias.filter((d) => d.slugs.length > 0);
  const anclas = [...porSlug.values()].filter((d) => d.tipo === "alojamiento" && d.gps && matriz.ids.includes(d.slug));
  if (dias.every((d) => rutables(d, matriz).length === 0)) return [];

  // Sin alojamientos no hay coche base↔día que medir: solo queda el salto entre días.
  const cortes = anclas.length > 0
    ? cortesPorAhorro(dias, anclas, matriz, opts)
    : cortesPorSalto(dias, matriz, opts);

  const zonas: ZonaAlojamiento[] = [];
  let tramo: DiaViajeMin[] = [];
  let ahorro: number | undefined;
  dias.forEach((d, i) => {
    tramo.push(d);
    if (cortes.has(i)) {
      zonas.push(cerrarTramo(tramo, porSlug, anclas, matriz, ahorro));
      ahorro = cortes.get(i);
      tramo = [];
    }
  });
  if (tramo.length > 0) zonas.push(cerrarTramo(tramo, porSlug, anclas, matriz, ahorro));
  return zonas;
}

type DiaViajeMin = ResumenViaje["dias"][number];

const rutables = (dia: DiaViajeMin, matriz: MatrizViajes) => dia.slugs.filter((s) => matriz.ids.includes(s));

// Añade la mudanza que más coche ahorra mientras compense. Devuelve índice del día tras
// el que se corta → minutos que ahorra.
function cortesPorAhorro(
  dias: DiaViajeMin[], anclas: Destino[], matriz: MatrizViajes, opts: OpcionesAlojamiento,
): Map<number, number> {
  const minimo = opts.ahorroMin ?? AHORRO_MUDANZA_MIN;
  const cocheTotal = (cortes: number[]) =>
    trocear(dias, cortes).reduce((suma, t) => suma + (costeBase(t, anclas, matriz)?.coche ?? 0), 0);

  const elegidos = new Map<number, number>();
  let coche = cocheTotal([]);
  while (opts.max == null || elegidos.size < opts.max - 1) {
    let mejor = { frontera: -1, coche: Infinity };
    for (let i = 0; i < dias.length - 1; i++) {
      if (elegidos.has(i)) continue;
      const conEste = cocheTotal([...elegidos.keys(), i]);
      if (conEste < mejor.coche) mejor = { frontera: i, coche: conEste };
    }
    const ahorro = coche - mejor.coche;
    if (mejor.frontera < 0 || ahorro < minimo) break;
    elegidos.set(mejor.frontera, ahorro);
    coche = mejor.coche;
  }
  return elegidos;
}

// Los saltos de coche entre días que superan el umbral, los mayores primero si hay tope.
function cortesPorSalto(
  dias: DiaViajeMin[], matriz: MatrizViajes, opts: OpcionesAlojamiento,
): Map<number, number> {
  const saltoMin = opts.saltoMin ?? SALTO_ZONA_MIN;
  const saltos = dias.slice(0, -1).map((_, i) => {
    const a = rutables(dias[i], matriz), b = rutables(dias[i + 1], matriz);
    return a.length === 0 || b.length === 0 ? null : seg2min(tiempoCoche(matriz, a[a.length - 1], b[0]));
  });
  const cortables = saltos
    .map((salto, i) => ({ i, salto }))
    .filter((f): f is { i: number; salto: number } => f.salto != null && f.salto >= saltoMin)
    .sort((a, b) => b.salto - a.salto)
    .slice(0, opts.max == null ? undefined : opts.max - 1);
  return new Map(cortables.map((c) => [c.i, c.salto]));
}

function trocear(dias: DiaViajeMin[], cortes: number[]): DiaViajeMin[][] {
  const enCorte = new Set(cortes);
  const tramos: DiaViajeMin[][] = [[]];
  dias.forEach((d, i) => {
    tramos[tramos.length - 1].push(d);
    if (enCorte.has(i) && i < dias.length - 1) tramos.push([]);
  });
  return tramos;
}

// Coche de dormir en el tramo (ida a la primera parada y vuelta desde la última) con el
// alojamiento rutable que menos sume. Se elige por las paradas: el pueblo no tiene GPS.
function costeBase(tramo: DiaViajeMin[], anclas: Destino[], matriz: MatrizViajes) {
  const paradas = tramo.map((d) => rutables(d, matriz));
  if (anclas.length === 0 || paradas.every((p) => p.length === 0)) return undefined;

  let mejor: { coche: number; ancla: Destino; porDia: (number | null)[] } | undefined;
  for (const a of anclas) {
    const porDia = paradas.map((p) =>
      p.length === 0 ? null : seg2min(tiempoCoche(matriz, a.slug, p[0])) + seg2min(tiempoCoche(matriz, p[p.length - 1], a.slug)));
    const coche = porDia.reduce((s: number, x) => s + (x ?? 0), 0);
    if (!mejor || coche < mejor.coche) mejor = { coche, ancla: a, porDia };
  }
  return mejor;
}

function cerrarTramo(
  tramo: DiaViajeMin[], porSlug: Map<string, Destino>, anclas: Destino[],
  matriz: MatrizViajes, ahorroMin?: number,
): ZonaAlojamiento {
  const destinos = tramo.flatMap((d) => d.slugs.map((s) => porSlug.get(s)).filter((x): x is Destino => x != null));
  const base = costeBase(tramo, anclas, matriz);
  return {
    pueblo: puebloBase(destinos),
    dias: tramo.map((d) => d.numero),
    paradas: destinos.map((d) => d.nombre),
    ...(ahorroMin != null && { ahorroMin }),
    ...(base && { ancla: { slug: base.ancla.slug, nombre: base.ancla.nombre }, cocheDiaMin: base.porDia }),
  };
}

// La localidad más votada en los `pueblosAlojamiento` del tramo; el primero de cada lista
// es el más cercano y pesa más. Sin ninguno, la zona.
function puebloBase(destinos: Destino[]): string {
  const votos = new Map<string, number>();
  for (const d of destinos) {
    const pueblos = d.pueblosAlojamiento ?? [];
    pueblos.forEach((p, i) => votos.set(p, (votos.get(p) ?? 0) + (pueblos.length - i)));
  }
  if (votos.size === 0) return destinos[0]?.zona ?? "";
  return [...votos].sort((a, b) => b[1] - a[1])[0][0];
}
