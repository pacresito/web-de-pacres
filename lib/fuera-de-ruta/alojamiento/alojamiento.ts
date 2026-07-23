// Zonas de alojamiento (Fase F4, §4.15): sobre el viaje ya repartido en días, propone
// DÓNDE dormir —localidades base, nunca un establecimiento ni Booking—. El reparto por
// días de `mi-viaje` ya es un clustering geográfico (cadena por cercanía); aquí se agrupan
// días consecutivos en una misma base y se corta donde mudarse ahorra más coche del que
// cuesta la mudanza. La localidad sale de `pueblosAlojamiento` —dato ya curado y ordenado
// por cercanía (F4.0, decisión de Pablo)—, nunca de un GPS inventado. Puro. Test al lado.
import type { Destino } from "../tipos";
import type { ResumenViaje } from "../viaje/mi-viaje";
import { tiempoCoche, seg2min, SALTO_ZONA_MIN, type MatrizViajes } from "../geo";

// Una base de alojamiento: la localidad, los días que cubre, las paradas que quedan a mano
// (para el porqué) y —si mudarse aquí desde la zona anterior evita un trayecto largo— los
// minutos de coche que ahorra. `pueblo` es siempre una localidad, jamás un hotel: es lo
// que se le enseña al usuario. El `ancla` es lo contrario: un alojamiento real con GPS que
// el itinerario usa para rutar (salir por la mañana, volver por la noche), nunca una
// recomendación. Falta cuando el tramo no tiene ningún alojamiento rutable cerca, y con
// ella falta `cocheDiaMin`, que es lo que se conduce desde esa base cada día.
export type ZonaAlojamiento = {
  pueblo: string;
  dias: number[];
  paradas: string[];
  ahorroMin?: number;
  ancla?: { slug: string; nombre: string };
  cocheDiaMin?: (number | null)[];  // ida + vuelta a la base, paralelo a `dias` (null: día sin paradas rutables)
};

export type OpcionesAlojamiento = {
  ahorroMin?: number;  // coche que debe ahorrar una mudanza para que compense hacerla
  max?: number;        // red de seguridad opcional: nunca más de N bases
  saltoMin?: number;   // salto de coche que justifica mudarse, solo sin alojamientos que medir
};

// Lo que cuesta mudarse, en minutos: deshacer y rehacer maletas, check-out y check-in, no
// poder dejar nada tirado. Una base más solo se añade si ahorra más coche que esto. Es el
// número que sustituye al viejo tope de 3 bases: el tope cortaba justo antes de la mudanza
// más rentable en viajes que cruzan la provincia, y no cortaba nada en los cortos.
const AHORRO_MUDANZA_MIN = 90;


// Viaje repartido en días → zonas de alojamiento. Vacío si no hay nada rutable que dormir
// cerca. Se corta donde mudarse compensa; con `max`, nunca más de esas zonas.
export function zonasAlojamiento(
  resumen: ResumenViaje,
  porSlug: Map<string, Destino>,
  matriz: MatrizViajes,
  opts: OpcionesAlojamiento = {},
): ZonaAlojamiento[] {
  const dias = resumen.dias.filter((d) => d.slugs.length > 0);
  const anclas = [...porSlug.values()].filter((d) => d.tipo === "alojamiento" && d.gps && matriz.ids.includes(d.slug));
  if (dias.every((d) => rutables(d, matriz).length === 0)) return [];

  // Con alojamientos que medir se corta por lo que ahorra la mudanza; sin ellos no hay
  // coche base↔día que calcular, así que queda el salto entre días como única señal.
  const cortes = anclas.length > 0
    ? cortesPorAhorro(dias, anclas, matriz, opts)
    : cortesPorSalto(dias, matriz, opts);

  // Recorre los días agrupándolos en tramos; un corte cierra el tramo y abre el siguiente,
  // que arranca anotando lo que ahorra mudarse.
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

// Cortes por rentabilidad: se arranca con una sola base y se añade la mudanza que más
// coche ahorra, mientras ahorre más de lo que cuesta mudarse. Se para sola —cuando ninguna
// compensa— y por eso no necesita tope; `max` queda solo de red de seguridad. Devuelve
// frontera (índice del día tras el que se corta) → minutos que ahorra esa mudanza.
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

// Cortes sin alojamientos que medir: los saltos de coche entre días que superan el umbral,
// los mayores primero si hay tope. Es la regla vieja, y aquí sigue por ser la única que no
// necesita una base real con la que medir.
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

// Lo que de verdad se conduce durmiendo en un tramo: ida a la primera parada de cada día y
// vuelta desde la última. Gana el alojamiento rutable que menos sume —se elige por las
// paradas, no por el pueblo: el pueblo no tiene GPS y los alojamientos de los datos no
// cubren todos—. `undefined` si no hay alojamientos o el tramo no tiene nada rutable.
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

// Localidad base del tramo: la más votada en los `pueblosAlojamiento` de sus destinos, con
// peso por posición (el primero de cada lista es el más cercano, así que pesa más). Sin
// ningún pueblo en los datos, cae a la zona de la provincia —nunca queda sin nombre—.
function puebloBase(destinos: Destino[]): string {
  const votos = new Map<string, number>();
  for (const d of destinos) {
    const pueblos = d.pueblosAlojamiento ?? [];
    pueblos.forEach((p, i) => votos.set(p, (votos.get(p) ?? 0) + (pueblos.length - i)));
  }
  if (votos.size === 0) return destinos[0]?.zona ?? "";
  return [...votos].sort((a, b) => b[1] - a[1])[0][0];
}
