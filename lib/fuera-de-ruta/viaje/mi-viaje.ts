// Panel «Mi viaje» (Fase D, §4.12-4.13): a partir de la selección del usuario calcula el
// reparto en días, el tiempo total, los km y qué días van justos. NUNCA descarta una
// actividad —esa es la regla del flujo—: si no caben, el día se marca `apretado` y el
// panel avisa, pero todas se colocan. Estimación honesta para el panel; la cronología
// real (horas, pivote de comida) la construye la Fase E. Puro. Test al lado.
import type { Destino } from "../tipos";
import { tiempoCoche, kmCoche, type MatrizViajes } from "../planificador/geo";
import { horasDeLuz } from "../planificador/sol";
import { RITMO_MIN, COMIDA_MIN, visitaMin } from "../planificador/presupuesto";
import type { Comida, Ritmo } from "../planificador/tipos";

export type OpcionesViaje = { dias: number; ritmo: Ritmo; comida: Comida; fecha: Date };

export type DiaViaje = {
  numero: number;
  slugs: string[];
  min: number;       // visitas + coche intradía + comida (0 si el día queda libre)
  km: number;        // coche intradía (0 si la matriz no trae distancias)
  apretado: boolean; // el día no cabe en el presupuesto del ritmo elegido
};

export type ResumenViaje = {
  dias: DiaViaje[];    // siempre `opts.dias` días (los sobrantes, libres)
  totalMin: number;
  totalKm: number;
  totalParadas: number;
  desbordado: boolean; // el trabajo total no cabe en los días con este ritmo (aviso global)
};

const seg2min = (seg: number) => Math.round(seg / 60);

// Minutos activos que caben en un día: el menor entre el ritmo elegido y la luz de la
// fecha menos la comida. La luz se calcula en el centro de la selección (apenas varía
// dentro de una comunidad); sin selección con GPS, solo manda el ritmo.
export function presupuestoDia(seleccion: Destino[], opts: OpcionesViaje): number {
  const centro = centroDe(seleccion);
  const luz = centro ? horasDeLuz(opts.fecha, centro[0], centro[1]).minutosLuz : Infinity;
  return Math.min(RITMO_MIN[opts.ritmo], luz - COMIDA_MIN[opts.comida]);
}

// Selección → reparto en días + totales. Las actividades se encadenan por cercanía
// (vecino más próximo en coche) y la cadena se reparte en días de forma equilibrada
// (todos los días con carga proporcional: nunca un día sumidero de 30 h); los destinos
// sin GPS (no rutables) se cuelgan del día más corto, contando su visita.
export function resumenMiViaje(seleccion: Destino[], matriz: MatrizViajes, opts: OpcionesViaje): ResumenViaje {
  const presupuesto = presupuestoDia(seleccion, opts);
  const comidaMin = COMIDA_MIN[opts.comida];
  const enRuta = seleccion.filter((d) => d.gps && matriz.ids.includes(d.slug));
  const sinGps = seleccion.filter((d) => !enRuta.includes(d));
  const porSlug = new Map(seleccion.map((d) => [d.slug, d]));

  // Coste de ruta de cada parada de la cadena (coche desde la anterior + su visita); el
  // total marca las fronteras proporcionales que reparten la cadena en `opts.dias` tramos.
  const cadena = cadenaVecinos(enRuta.map((d) => d.slug), matriz);
  const costeRuta = cadena.reduce((s, slug, i) => {
    const coche = i > 0 ? seg2min(tiempoCoche(matriz, cadena[i - 1], slug)) : 0;
    return s + coche + visitaMin(porSlug.get(slug)!);
  }, 0);

  const dias: DiaViaje[] = [];
  let dia = nuevoDia();
  let prev: string | null = null;
  let acum = 0; // coste colocado hasta ahora, para cruzar las fronteras proporcionales

  for (const slug of cadena) {
    // Antes de colocar, cierra el día si ya cruzó su cuota proporcional y aún quedan días
    // por abrir. Reparte parejo en lugar de llenar cada día al tope y volcar el resto en
    // el último. El coche que quedaría al inicio del nuevo día no cuenta (prev = null).
    const frontera = (costeRuta * (dias.length + 1)) / opts.dias;
    if (dia.slugs.length > 0 && acum >= frontera && dias.length < opts.dias - 1) {
      cerrar(dia);
      dias.push(dia);
      dia = nuevoDia();
      prev = null;
    }
    const coche = prev ? seg2min(tiempoCoche(matriz, prev, slug)) : 0;
    const vis = visitaMin(porSlug.get(slug)!);
    dia.slugs.push(slug);
    dia.min += coche + vis;
    dia.km += prev ? kmCoche(matriz, prev, slug) / 1000 : 0;
    acum += coche + vis;
    prev = slug;
  }
  cerrar(dia);
  dias.push(dia);

  // Días vacíos hasta completar el viaje (quedaron libres) y renumerado final.
  while (dias.length < opts.dias) dias.push(nuevoDia());
  // Los sin-GPS al día más corto (por minutos), sumando su visita.
  for (const d of sinGps) {
    const corto = [...dias].sort((a, b) => a.min - b.min)[0];
    if (corto.slugs.length === 0) corto.min += comidaMin; // estrena día: reserva comida
    corto.slugs.push(d.slug);
    corto.min += visitaMin(d);
  }
  // `apretado` en un único sitio: un día aprieta si el trabajo (visitas + coche, sin la
  // comida, que el presupuesto ya descontó de la luz) no cabe en el presupuesto.
  dias.forEach((d, i) => {
    d.numero = i + 1;
    d.km = Math.round(d.km);
    d.apretado = d.slugs.length > 0 && d.min - comidaMin > presupuesto;
  });

  // Desbordado: el trabajo total (sin comidas) no cabe ni repartido a partes iguales.
  // Distingue "un día justo" de "no cabe en X días": dispara el aviso global.
  const trabajoTotal = dias.reduce((s, d) => s + (d.slugs.length > 0 ? d.min - comidaMin : 0), 0);

  return {
    dias,
    totalMin: dias.reduce((s, d) => s + d.min, 0),
    totalKm: dias.reduce((s, d) => s + d.km, 0),
    totalParadas: seleccion.length,
    desbordado: trabajoTotal > presupuesto * opts.dias,
  };

  function nuevoDia(): DiaViaje {
    return { numero: dias.length + 1, slugs: [], min: 0, km: 0, apretado: false };
  }
  // Al cerrar el día, suma la comida al total (para mostrar); `apretado` se decide luego.
  function cerrar(d: DiaViaje) {
    if (d.slugs.length > 0) d.min += comidaMin;
  }
}

// «Prefiero que la IA decida» (§4.12): pre-selecciona un conjunto equilibrado —las mejor
// puntuadas que llenan los días sin desbordarlos, encadenadas por cercanía— como borrador
// editable. Único heredero de las 3 propuestas. Reusa el mismo cálculo que el panel para
// que "lo que la IA propone" y "lo que el panel dice que cabe" no se contradigan.
export function elegirEquilibrado(
  candidatas: Destino[], matriz: MatrizViajes, opts: OpcionesViaje,
): string[] {
  const presupuestoTotal = opts.dias * presupuestoDia(candidatas, opts);
  const elegidas: Destino[] = [];
  for (const c of candidatas) {
    const r = resumenMiViaje([...elegidas, c], matriz, opts);
    if (elegidas.length > 0 && r.totalMin > presupuestoTotal) break;
    elegidas.push(c);
  }
  return elegidas.map((d) => d.slug);
}

// Cadena por vecino más cercano (coche): arranca en el primero de la selección y salta
// siempre al más próximo sin visitar. Da días con paradas geográficamente contiguas sin
// el coste del TSP exacto (el panel es una estimación; el orden fino es de la Fase E).
// La exporta también F3 (oportunidades) para medir desvíos contra la misma ruta.
export function cadenaVecinos(slugs: string[], matriz: MatrizViajes): string[] {
  if (slugs.length <= 1) return [...slugs];
  const restantes = new Set(slugs);
  let actual = slugs[0];
  restantes.delete(actual);
  const cadena = [actual];
  while (restantes.size) {
    let mejor = "", mejorT = Infinity;
    for (const s of restantes) {
      const t = tiempoCoche(matriz, actual, s);
      if (t < mejorT) { mejorT = t; mejor = s; }
    }
    cadena.push(mejor);
    restantes.delete(mejor);
    actual = mejor;
  }
  return cadena;
}

function centroDe(ds: Destino[]): [number, number] | null {
  const con = ds.filter((d) => d.gps);
  if (!con.length) return null;
  const lat = con.reduce((s, d) => s + d.gps![0], 0) / con.length;
  const lon = con.reduce((s, d) => s + d.gps![1], 0) / con.length;
  return [lat, lon];
}
