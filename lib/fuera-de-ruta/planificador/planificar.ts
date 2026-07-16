// Pipeline determinista del planificador "Crear mi viaje" (Fase E, IA cero).
// Genera 3 propuestas a partir de los mismos inputs, cada una con una estrategia de
// reparto distinta. Lógica pura. Test: `npx tsx lib/fuera-de-ruta/planificador/planificar.test.ts`.
import type { Destino, Restaurante } from "../tipos";
import { filtrarDestinos } from "../filtrar";
import { PROPUESTA_TEXTO } from "../formato";
import { tiempoCoche, ordenarDia, type MatrizViajes } from "./geo";
import { horasDeLuz } from "./sol";
import type { Comida, Descarte, Dia, Parada, PlanInput, Propuesta, Ritmo } from "./tipos";

const RITMO_MIN: Record<Ritmo, number> = { relajado: 300, medio: 420, activo: 540 };
// Minutos reservados para la comida. "da-igual" reserva como picnic en el presupuesto
// global; por día se resuelve a restaurante (90) si la zona tiene, o picnic si no.
const COMIDA_MIN: Record<Comida, number> = { restaurante: 90, picnic: 30, "da-igual": 30, "solo-cena": 0 };
const INICIO_DIA = 9 * 60;  // hora realista de arranque (no el amanecer astronómico, que apelmazaba todo de madrugada)
const COMIDA_MIN_HORA = 13 * 60; // no se come antes de esta hora: en días cortos se espera al mediodía en vez de comer a media mañana
const VISITA_DEFECTO = 90;   // minutos si el destino no trae duracionHoras
const MAX_PARADAS_DIA = 8;   // tope del TSP por fuerza bruta (ver geo.ordenarDia)
const PENAL_ZONA = 30;       // min de coche "imaginario" que la estrategia "Mínimo coche"
                             // suma al considerar un candidato de otra zona: sesga hacia
                             // agotar la zona antes de saltar, sin llegar a prohibirlo.

const min = (seg: number) => Math.round(seg / 60);
const visitaMin = (d: Destino) => (d.duracionHoras ? Math.round(((d.duracionHoras[0] + d.duracionHoras[1]) / 2) * 60) : VISITA_DEFECTO);
const fmt = (m: number) => `${Math.floor(m / 60)}h${String(m % 60).padStart(2, "0")}`;

type Estrategia = {
  id: Propuesta["id"];
  nombre: string;
  orden: (candidatos: Destino[], imprescindibles: string[]) => Destino[]; // orden de consideración
  penalZona?: number; // penaliza (min) elegir un candidato de otra zona; sesga a días compactos
};

// Agrupa candidatos por zona (los de la misma zona quedan contiguos): así las
// semillas de los días van rotando de zona en zona en vez de saltar sueltas.
const porZona = (cs: Destino[]) => [...cs].sort((a, b) => a.zona.localeCompare(b.zona));

const ESTRATEGIAS: Estrategia[] = [
  { id: "A", nombre: PROPUESTA_TEXTO.A, orden: porZona },
  { id: "B", nombre: PROPUESTA_TEXTO.B, orden: porZona, penalZona: PENAL_ZONA },
  {
    id: "C", nombre: PROPUESTA_TEXTO.C,
    orden: (cs, imp) => [...cs].sort((a, b) => rangoImp(a, imp) - rangoImp(b, imp)),
  },
];

// Los imprescindibles primero (en el orden que los marcó el usuario); el resto detrás.
const rangoImp = (d: Destino, imp: string[]) => { const i = imp.indexOf(d.slug); return i < 0 ? imp.length : i; };

export function planificar(input: PlanInput): Propuesta[] {
  const { datos, matriz, filtros, dias, ritmo, comida, fecha, imprescindibles = [] } = input;

  // Candidatos: filtrados, con GPS (los necesita la matriz) y visitables (no alojamientos).
  const candidatos = filtrarDestinos(datos.destinos, filtros)
    .filter((d) => d.gps && matriz.ids.includes(d.slug) && d.tipo !== "alojamiento");
  const porSlug = new Map(candidatos.map((d) => [d.slug, d]));
  const restPorZona = agruparRestaurantes(datos.restaurantes);

  // Presupuesto de minutos activos por día: el menor entre el ritmo y la luz menos comida.
  // La luz se calcula en el centro de los candidatos (apenas varía dentro de una comunidad).
  const centro = centroDe(candidatos);
  const luzTotal = centro ? horasDeLuz(fecha, centro[0], centro[1]).minutosLuz : 0;
  const presupuesto = Math.min(RITMO_MIN[ritmo], luzTotal - COMIDA_MIN[comida]);

  const propuestas = ESTRATEGIAS.map((e) =>
    repartir(e, e.orden(candidatos, imprescindibles), { matriz, porSlug, restPorZona, comida, fecha, dias, presupuesto }));
  return anotarAlternativas(propuestas);
}

type Ctx = {
  matriz: MatrizViajes;
  porSlug: Map<string, Destino>;
  restPorZona: Map<string, Restaurante>;
  comida: Comida;
  fecha: Date;
  dias: number;
  presupuesto: number;
};

// Reparte los candidatos en días: por cada día, arranca en una semilla y va sumando
// el vecino más cercano (por coche) mientras quepa en el presupuesto y en el tope de
// paradas. La estrategia decide el orden de las semillas y el tope de coche marginal.
function repartir(estr: Estrategia, ordenados: Destino[], ctx: Ctx): Propuesta {
  let restantes = [...ordenados];
  const dias: Dia[] = [];

  while (restantes.length && dias.length < ctx.dias) {
    const semilla = restantes.shift()!;
    const cluster = [semilla.slug];
    let gastado = visitaMin(semilla);

    while (cluster.length < MAX_PARADAS_DIA) {
      // Entre los candidatos que aún caben en el presupuesto del día, el de menor coste:
      // coche real al clúster + penalización por cambiar de zona (0 salvo en "Mínimo
      // coche"). Solo se corta cuando ninguno cabe, para no dejar el día a medias.
      const zonaCluster = zonaDominante(cluster.map((s) => ctx.porSlug.get(s)!));
      let cand: Destino | null = null, cocheCand = 0, mejorCoste = Infinity;
      for (const r of restantes) {
        const coche = min(Math.min(...cluster.map((s) => tiempoCoche(ctx.matriz, s, r.slug))));
        if (gastado + visitaMin(r) + coche > ctx.presupuesto) continue;
        const coste = coche + (estr.penalZona && r.zona !== zonaCluster ? estr.penalZona : 0);
        if (coste < mejorCoste) { mejorCoste = coste; cand = r; cocheCand = coche; }
      }
      if (!cand) break;
      cluster.push(cand.slug);
      gastado += visitaMin(cand) + cocheCand;
      restantes = restantes.filter((x) => x !== cand);
    }
    dias.push(construirDia(dias.length + 1, cluster, ctx));
  }

  const cocheTotalMin = dias.reduce((s, d) => s + d.paradas.reduce((t, p) => t + p.cocheDesdeAnterior, 0), 0);
  const colocados = dias.flatMap((d) => d.paradas.map((p) => p.slug));
  const sinEncajar: Descarte[] = restantes.map((r) => ({ slug: r.slug, motivo: motivoDescarte(r.slug, colocados, ctx) }));
  const avisos: string[] = [];
  if (sinEncajar.length) avisos.push(`${sinEncajar.length} destino(s) no caben en ${ctx.dias} día(s)`);
  return { id: estr.id, nombre: estr.nombre, dias, sinEncajar, cocheTotalMin, avisos };
}

// Motivo humano del descarte: no cupo en los días pedidos, y a cuánto coche queda del
// destino colocado más cercano (lo que "costaría" recogerlo). Solo usa la matriz.
function motivoDescarte(slug: string, colocados: string[], ctx: Ctx): string {
  const base = `no cupo en ${ctx.dias} día(s)`;
  if (!colocados.length) return base;
  const cercano = min(Math.min(...colocados.map((c) => tiempoCoche(ctx.matriz, slug, c))));
  return `${base} · a ${cercano} min en coche de la parada más cercana`;
}

// Marca en cada descarte si otra propuesta sí coloca ese destino ("está en la C").
function anotarAlternativas(propuestas: Propuesta[]): Propuesta[] {
  const colocadosPorProp = new Map(
    propuestas.map((p) => [p.id, new Set(p.dias.flatMap((d) => d.paradas.map((x) => x.slug)))]),
  );
  for (const p of propuestas) {
    for (const desc of p.sinEncajar) {
      const otra = propuestas.find((q) => q.id !== p.id && colocadosPorProp.get(q.id)!.has(desc.slug));
      if (otra) desc.enPropuesta = otra.id;
    }
  }
  return propuestas;
}

function construirDia(numero: number, clusterSlugs: string[], ctx: Ctx): Dia {
  const { orden } = ordenarDia(ctx.matriz, clusterSlugs);
  const destinos = orden.map((s) => ctx.porSlug.get(s)!);
  const zona = zonaDominante(destinos);
  const avisos: string[] = [];

  // Comida del mediodía. "da-igual" toma restaurante si la zona tiene y picnic si no,
  // sin aviso (el usuario ya dijo que le da igual); "restaurante" avisa cuando no hay.
  let restaurante: string | undefined;
  let comidaMin = COMIDA_MIN[ctx.comida];
  if (ctx.comida === "restaurante" || ctx.comida === "da-igual") {
    const r = ctx.restPorZona.get(zona);
    if (r) { restaurante = r.nombre; comidaMin = COMIDA_MIN.restaurante; }
    else if (ctx.comida === "restaurante") avisos.push(`Sin restaurante en la zona (${zona}): lleva picnic`);
    else comidaMin = COMIDA_MIN.picnic;
  }

  // El día arranca a una hora realista de turismo. La comida NO se ancla al reloj
  // (eso la mandaba al cierre en días que acababan antes de las 14:00): parte la
  // jornada por la mitad del trabajo, así siempre quedan paradas después de comer.
  const centro = centroDe(destinos)!;
  const { amanecer, minutosLuz } = horasDeLuz(ctx.fecha, centro[0], centro[1]);
  const coches = orden.map((s, i) => (i === 0 ? 0 : min(tiempoCoche(ctx.matriz, orden[i - 1], s))));
  const visitas = destinos.map(visitaMin);
  const trabajoTotal = coches.reduce((s, c) => s + c, 0) + visitas.reduce((s, v) => s + v, 0);

  // Índice de la 1ª parada de la tarde: la que cruza la mitad del trabajo del día.
  // Con ≥2 paradas garantiza reparto mañana/tarde; con 1 (o solo-cena) no hay reparto.
  let idxComida = -1;
  if (comidaMin > 0 && orden.length >= 2) {
    let acum = 0;
    for (let i = 0; i < orden.length; i++) {
      if (i > 0 && acum + coches[i] >= trabajoTotal / 2) { idxComida = i; break; }
      acum += coches[i] + visitas[i];
    }
    if (idxComida < 0) idxComida = orden.length - 1; // que al menos la última quede tras comer
  }

  const paradas: Parada[] = [];
  let cursor = Math.max(amanecer, INICIO_DIA);
  let comidaHoraInicio: number | undefined;
  orden.forEach((slug, i) => {
    const d = destinos[i];
    cursor += coches[i];
    if (i === idxComida) { cursor = Math.max(cursor, COMIDA_MIN_HORA); comidaHoraInicio = cursor; cursor += comidaMin; }
    paradas.push({ slug, nombre: d.nombre, tipo: d.tipo, visitaMin: visitas[i], cocheDesdeAnterior: coches[i], horaInicio: cursor });
    cursor += visitas[i];
  });
  // Día de una sola parada: la comida del mediodía existe pero no parte el recorrido;
  // se sitúa tras la última, con hora coherente (los solo-cena no llevan comida aquí).
  if (comidaMin > 0 && idxComida < 0) comidaHoraInicio = Math.max(cursor, COMIDA_MIN_HORA);

  const minutosActivos = trabajoTotal + comidaMin;

  if (minutosActivos > minutosLuz) {
    avisos.push(`Jornada apretada: ${fmt(minutosActivos)} de actividad para ${fmt(minutosLuz)} de luz`);
  }
  return { numero, zona, paradas, restaurante, comidaHoraInicio, minutosActivos, minutosLuz, avisos };
}

// Un restaurante por zona para la comida del mediodía (el primero que aparece).
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

// Centro geográfico (media de las coordenadas) para calcular las horas de luz.
function centroDe(ds: Destino[]): [number, number] | null {
  const con = ds.filter((d) => d.gps);
  if (!con.length) return null;
  const lat = con.reduce((s, d) => s + d.gps![0], 0) / con.length;
  const lon = con.reduce((s, d) => s + d.gps![1], 0) / con.length;
  return [lat, lon];
}
