// Panel «Mi viaje» (Fase D, §4.12-4.13): a partir de la selección del usuario calcula el
// reparto en días, el tiempo total, los km y qué días van justos. NUNCA descarta una
// actividad —esa es la regla del flujo—: si no caben, el día se marca `apretado` y el
// panel avisa, pero todas se colocan. Estimación honesta para el panel; la cronología
// real (horas, pivote de comida) la construye la Fase E. Puro. Test al lado.
import type { Comida, Destino, Ritmo } from "../tipos";
import { tiempoCoche, kmCoche, seg2min, centroDe, SALTO_ZONA_MIN, type MatrizViajes } from "../geo";
import { horasDeLuz } from "../sol";
import { RITMO_MIN, COMIDA_MIN, visitaMin } from "../presupuesto";

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


// Minutos activos que caben en un día: el menor entre el ritmo elegido y la luz de la
// fecha menos la comida. La luz se calcula en el centro de la selección (apenas varía
// dentro de una comunidad); sin selección con GPS, solo manda el ritmo.
export function presupuestoDia(seleccion: Destino[], opts: OpcionesViaje): number {
  const centro = centroDe(seleccion);
  const luz = centro ? horasDeLuz(opts.fecha, centro[0], centro[1]).minutosLuz : Infinity;
  return Math.min(RITMO_MIN[opts.ritmo], luz - COMIDA_MIN[opts.comida]);
}

// Selección → reparto en días + totales. Las actividades se encadenan por cercanía
// (vecino más próximo en coche) y la cadena se corta primero por geografía —en los saltos
// de coche grandes, los mismos que hacen cambiar de base— y solo dentro de cada bloque se
// reparte por carga; los destinos sin GPS (no rutables) se cuelgan del día más corto,
// contando su visita.
export function resumenMiViaje(seleccion: Destino[], matriz: MatrizViajes, opts: OpcionesViaje): ResumenViaje {
  const presupuesto = presupuestoDia(seleccion, opts);
  const comidaMin = COMIDA_MIN[opts.comida];
  const enRuta = seleccion.filter((d) => d.gps && matriz.ids.includes(d.slug));
  const sinGps = seleccion.filter((d) => !enRuta.includes(d));
  const porSlug = new Map(seleccion.map((d) => [d.slug, d]));

  // Coste de ruta de un tramo de cadena: coche desde la parada anterior + visita de cada
  // una. Mide la carga de un bloque y marca sus fronteras proporcionales internas.
  const costeRuta = (tramo: string[]) => tramo.reduce((s, slug, i) => {
    const coche = i > 0 ? seg2min(tiempoCoche(matriz, tramo[i - 1], slug)) : 0;
    return s + coche + visitaMin(porSlug.get(slug)!);
  }, 0);

  const cadena = cadenaVecinos(enRuta.map((d) => d.slug), matriz);
  const zonas = repartoPorZonas(cadena, matriz, opts.dias, costeRuta);

  const dias: DiaViaje[] = [];
  zonas.forEach((z) => repartirBloque(z.bloque, z.dias, costeRuta(z.bloque)));

  // Un bloque en sus `nDias` días: la cuota proporcional de siempre, ahora solo dentro de
  // la zona. Con un único bloque (ningún salto grande) el reparto es el de antes.
  function repartirBloque(bloque: string[], nDias: number, carga: number) {
    const abiertos = dias.length; // días ya cerrados por los bloques anteriores
    let dia = nuevoDia();
    let prev: string | null = null;
    let acum = 0; // coste colocado del bloque, para cruzar sus fronteras proporcionales

    for (const slug of bloque) {
      // Antes de colocar, cierra el día si ya cruzó su cuota proporcional y aún quedan días
      // por abrir. Reparte parejo en lugar de llenar cada día al tope y volcar el resto en
      // el último. El coche que quedaría al inicio del nuevo día no cuenta (prev = null).
      const cerrados = dias.length - abiertos;
      const frontera = (carga * (cerrados + 1)) / nDias;
      if (dia.slugs.length > 0 && acum >= frontera && cerrados < nDias - 1) {
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
  }

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

// La cadena troceada en zonas, con los días que le tocan a cada una. Se corta donde el
// salto de coche entre dos paradas consecutivas supera el umbral —el mismo con el que se
// cambia de base de alojamiento, o días y bases discreparían— y los días se reparten
// **por carga**, no por número de zonas: dar un día fijo a cada una dejaba días de 17 h
// junto a días de 4 h. Una zona que no da ni para un día se fusiona con su vecina (por el
// menor de los saltos) y se vuelve a repartir; así nunca sobran días vacíos.
function repartoPorZonas(
  cadena: string[], matriz: MatrizViajes, dias: number, carga: (tramo: string[]) => number,
): { bloque: string[]; dias: number }[] {
  let cortes = cadena.slice(1)
    .map((slug, i) => ({ i: i + 1, salto: seg2min(tiempoCoche(matriz, cadena[i], slug)) }))
    .filter((c) => c.salto >= SALTO_ZONA_MIN);

  for (;;) {
    const bloques = trocear(cadena, cortes.map((c) => c.i));
    const reparto = diasPorCarga(bloques.map(carga), dias);
    if (cortes.length === 0 || reparto.every((d) => d > 0)) {
      return bloques.map((bloque, i) => ({ bloque, dias: Math.max(reparto[i], 1) }));
    }
    const menor = cortes.reduce((m, c) => (c.salto < m.salto ? c : m));
    cortes = cortes.filter((c) => c !== menor);
  }
}

function trocear(cadena: string[], cortes: number[]): string[][] {
  const enCorte = new Set(cortes);
  const bloques: string[][] = [[]];
  cadena.forEach((slug, i) => {
    if (enCorte.has(i)) bloques.push([]);
    bloques[bloques.length - 1].push(slug);
  });
  return bloques;
}

// Reparto de los días proporcional a la carga de cada zona, por mayores restos. Un 0
// significa que esa zona no da ni para un día: quien llama la fusiona y reparte de nuevo.
function diasPorCarga(cargas: number[], dias: number): number[] {
  const total = cargas.reduce((s, c) => s + c, 0);
  if (total === 0) return cargas.map((_, i) => (i === 0 ? dias : 0));
  const exactos = cargas.map((c) => (c * dias) / total);
  const reparto = exactos.map(Math.floor);
  let sobrantes = dias - reparto.reduce((s, d) => s + d, 0);
  for (const { i } of exactos.map((e, i) => ({ i, resto: e % 1 })).sort((a, b) => b.resto - a.resto)) {
    if (sobrantes-- <= 0) break;
    reparto[i]++;
  }
  return reparto;
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
