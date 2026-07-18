// Zonas de alojamiento (Fase F4, §4.15): sobre el viaje ya repartido en días, propone
// DÓNDE dormir —2-3 localidades base, nunca un establecimiento ni Booking—. El reparto por
// días de `mi-viaje` ya es un clustering geográfico (cadena por cercanía); aquí se agrupan
// días consecutivos en una misma base y se corta donde el salto de coche entre un día y el
// siguiente es grande: ahí compensa mudarse en vez de volver cada noche al mismo sitio.
// La localidad sale de `pueblosAlojamiento` —dato ya curado y ordenado por cercanía (F4.0,
// decisión de Pablo)—, nunca de un GPS inventado. Puro. Test al lado.
import type { Destino } from "../tipos";
import type { ResumenViaje } from "../viaje/mi-viaje";
import { tiempoCoche, type MatrizViajes } from "../planificador/geo";

// Una base de alojamiento: la localidad, los días que cubre, las paradas que quedan a mano
// (para el porqué) y —si mudarse aquí desde la zona anterior evita un trayecto largo— los
// minutos de coche que ahorra. `pueblo` es siempre una localidad, jamás un hotel.
export type ZonaAlojamiento = {
  pueblo: string;
  dias: number[];
  paradas: string[];
  ahorroMin?: number;
};

export type OpcionesAlojamiento = {
  max?: number;       // tope de zonas (no trocear el viaje en más bases de la cuenta)
  saltoMin?: number;  // salto de coche (min) a partir del cual compensa cambiar de base
};

const MAX_ZONAS = 3;
const SALTO_MIN = 25;

const seg2min = (seg: number) => Math.round(seg / 60);

// Viaje repartido en días → zonas de alojamiento. Vacío si no hay nada rutable que dormir
// cerca. Nunca más de `max` zonas: corta solo en los saltos mayores.
export function zonasAlojamiento(
  resumen: ResumenViaje,
  porSlug: Map<string, Destino>,
  matriz: MatrizViajes,
  opts: OpcionesAlojamiento = {},
): ZonaAlojamiento[] {
  const max = opts.max ?? MAX_ZONAS;
  const saltoMin = opts.saltoMin ?? SALTO_MIN;

  const dias = resumen.dias.filter((d) => d.slugs.length > 0);
  const rutables = (i: number) => dias[i].slugs.filter((s) => matriz.ids.includes(s));
  const conRutables = dias.filter((_, i) => rutables(i).length > 0);
  if (conRutables.length === 0) return [];

  // Salto de coche entre el final de un día y el arranque del siguiente. `null` si alguno
  // no tiene paradas rutables (no se puede medir): esa frontera no corta.
  const fronteras = dias.slice(0, -1).map((_, i) => {
    const a = rutables(i), b = rutables(i + 1);
    if (a.length === 0 || b.length === 0) return null;
    return seg2min(tiempoCoche(matriz, a[a.length - 1], b[0]));
  });

  // Cortamos en los saltos mayores que superen el umbral, hasta dejar `max` zonas.
  const cortables = fronteras
    .map((salto, i) => ({ i, salto }))
    .filter((f): f is { i: number; salto: number } => f.salto != null && f.salto >= saltoMin)
    .sort((a, b) => b.salto - a.salto)
    .slice(0, max - 1);
  const corteEn = new Map(cortables.map((c) => [c.i, c.salto]));

  // Recorre los días agrupándolos en tramos; un corte cierra el tramo y abre el siguiente,
  // que arranca anotando lo que ahorra mudarse (el salto de esa frontera).
  const zonas: ZonaAlojamiento[] = [];
  let tramo: DiaViajeMin[] = [];
  let ahorro: number | undefined;
  dias.forEach((d, i) => {
    tramo.push(d);
    if (corteEn.has(i)) {
      zonas.push(cerrarTramo(tramo, porSlug, ahorro));
      ahorro = corteEn.get(i);
      tramo = [];
    }
  });
  if (tramo.length > 0) zonas.push(cerrarTramo(tramo, porSlug, ahorro));
  return zonas;
}

type DiaViajeMin = ResumenViaje["dias"][number];

function cerrarTramo(
  tramo: DiaViajeMin[], porSlug: Map<string, Destino>, ahorroMin?: number,
): ZonaAlojamiento {
  const destinos = tramo.flatMap((d) => d.slugs.map((s) => porSlug.get(s)).filter((x): x is Destino => x != null));
  return {
    pueblo: puebloBase(destinos),
    dias: tramo.map((d) => d.numero),
    paradas: destinos.map((d) => d.nombre),
    ...(ahorroMin != null && { ahorroMin }),
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
