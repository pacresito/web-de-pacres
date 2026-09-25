// Panel «Mi viaje»: reparto de la selección en días, con tiempo, km y qué días van justos.
// NUNCA descarta una actividad: si no cabe, marca el día `apretado`. La cronología fina
// la monta `itinerario.ts`.
import type { Comida, Destino, Ritmo } from "../tipos";
import { tiempoCoche, kmCoche, seg2min, centroDe, vecinoMasCercano, SALTO_ZONA_MIN, type MatrizViajes } from "../geo";
import { horasDeLuz } from "../sol";
import { RITMO_MIN, COMIDA_MIN, estanciaPorRitmo } from "../presupuesto";

export type OpcionesViaje = { dias: number; ritmo: Ritmo; comida: Comida; fecha: Date };

export type DiaViaje = {
  numero: number;
  slugs: string[];
  min: number;       // visitas + coche + comida
  km: number;
  apretado: boolean; // no cabe en el presupuesto del ritmo
};

export type ResumenViaje = {
  dias: DiaViaje[];    // siempre `opts.dias`; los sobrantes, libres
  totalMin: number;
  totalKm: number;
  totalParadas: number;
  desbordado: boolean; // el total no cabe ni repartido a partes iguales
};

// Minutos activos por día: lo que pida el ritmo, sin pasar de la luz menos la comida.
export function presupuestoDia(seleccion: Destino[], opts: OpcionesViaje): number {
  const centro = centroDe(seleccion);
  const luz = centro ? horasDeLuz(opts.fecha, centro[0], centro[1]).minutosLuz : Infinity;
  return Math.min(RITMO_MIN[opts.ritmo], luz - COMIDA_MIN[opts.comida]);
}

// Encadena la selección por cercanía, la corta primero por geografía (los saltos de coche
// grandes) y reparte cada bloque por carga. Los destinos sin GPS van al día más corto.
export function resumenMiViaje(seleccion: Destino[], matriz: MatrizViajes, opts: OpcionesViaje): ResumenViaje {
  const presupuesto = presupuestoDia(seleccion, opts);
  const comidaMin = COMIDA_MIN[opts.comida];
  const visita = (d: Destino) => estanciaPorRitmo(d, opts.ritmo);
  const enRuta = seleccion.filter((d) => d.gps && matriz.ids.includes(d.slug));
  const sinGps = seleccion.filter((d) => !enRuta.includes(d));
  const porSlug = new Map(seleccion.map((d) => [d.slug, d]));

  const costeRuta = (tramo: string[]) => tramo.reduce((s, slug, i) => {
    const coche = i > 0 ? seg2min(tiempoCoche(matriz, tramo[i - 1], slug)) : 0;
    return s + coche + visita(porSlug.get(slug)!);
  }, 0);

  const cadena = vecinoMasCercano(matriz, enRuta.map((d) => d.slug)).orden;
  const zonas = repartoPorZonas(cadena, matriz, opts.dias, costeRuta);

  const dias: DiaViaje[] = [];
  zonas.forEach((z) => repartirBloque(z.bloque, z.dias, costeRuta(z.bloque)));

  // Reparto proporcional dentro del bloque: cierra el día al cruzar su cuota en vez de
  // llenar cada uno al tope y volcar el resto en el último.
  function repartirBloque(bloque: string[], nDias: number, carga: number) {
    const abiertos = dias.length;
    let dia = nuevoDia();
    let prev: string | null = null;
    let acum = 0;

    for (const slug of bloque) {
      const cerrados = dias.length - abiertos;
      const frontera = (carga * (cerrados + 1)) / nDias;
      if (dia.slugs.length > 0 && acum >= frontera && cerrados < nDias - 1) {
        cerrar(dia);
        dias.push(dia);
        dia = nuevoDia();
        prev = null;
      }
      const coche = prev ? seg2min(tiempoCoche(matriz, prev, slug)) : 0;
      const vis = visita(porSlug.get(slug)!);
      dia.slugs.push(slug);
      dia.min += coche + vis;
      dia.km += prev ? kmCoche(matriz, prev, slug) : 0;
      acum += coche + vis;
      prev = slug;
    }
    cerrar(dia);
    dias.push(dia);
  }

  while (dias.length < opts.dias) dias.push(nuevoDia());
  for (const d of sinGps) {
    const corto = [...dias].sort((a, b) => a.min - b.min)[0];
    if (corto.slugs.length === 0) corto.min += comidaMin;
    corto.slugs.push(d.slug);
    corto.min += visita(d);
  }
  // La comida no cuenta para `apretado`: el presupuesto ya la descontó de la luz.
  dias.forEach((d, i) => {
    d.numero = i + 1;
    d.km = Math.round(d.km);
    d.apretado = d.slugs.length > 0 && d.min - comidaMin > presupuesto;
  });

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
  function cerrar(d: DiaViaje) {
    if (d.slugs.length > 0) d.min += comidaMin;
  }
}

// Corta la cadena donde el salto de coche supera SALTO_ZONA_MIN y reparte los días por
// carga, no uno por zona. Una zona que no da ni para un día se fusiona con su vecina por
// el menor salto y se reparte de nuevo, así nunca sobran días vacíos.
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

// Días proporcionales a la carga, por mayores restos. Un 0 = la zona no da para un día.
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

// «Que elija Cris por mí»: las mejor puntuadas que llenan los días sin desbordarlos,
// medidas con el mismo cálculo que el panel para que no se contradigan.
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
