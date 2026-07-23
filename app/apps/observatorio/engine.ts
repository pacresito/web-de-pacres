// Motor del Observatorio: qué se ve en el cielo esta noche y las siguientes.
// Lógica pura, sin React ni DOM — se verifica con `npx tsx engine.test.ts`.
//
// Tres fuentes de eventos, todas calculadas aquí mismo (ningún servicio externo salvo
// el TLE de los satélites, que entra por parámetro):
//   · Pasos de la ISS y la Tiangong  → SGP4 (satellite.js) sobre el TLE del día
//   · Salida de la Luna              → efemérides (astronomy-engine)
//   · Planetas a simple vista        → efemérides (astronomy-engine)

import * as Astro from "astronomy-engine";
import {
  twoline2satrec, propagate, gstime, jday, sunPos,
  eciToEcf, geodeticToEcf, ecfToLookAngles, degreesToRadians, radiansToDegrees,
} from "satellite.js";

// ─── Criterios de visibilidad ─────────────────────────────────────────────────

export const ALTITUD_MINIMA = 15;      // grados sobre el horizonte
export const MAGNITUD_MAXIMA = -1;     // solo satélites más brillantes que esto
export const SOL_MAXIMO = -6;          // el observador necesita el Sol bajo el horizonte
export const HORA_MINIMA_LUNA = 20;    // la salida de la Luna interesa a partir de las 20:00
export const DIAS = 7;                 // horizonte de la previsión
export const MARGEN_MINUTOS = 10;      // un evento sigue en la lista hasta 10 min después
const PASO_SEGUNDOS = 30;              // muestreo de la órbita
const PASO_PLANETAS_MINUTOS = 5;

// Los planetas no comparten el listón de los satélites: Venus con −4 se sigue viendo
// pegado al horizonte y Saturno con +0.5 no. Lo que los tumba es la extinción
// atmosférica, ~0.28 mag por masa de aire (≈ 1/sen h), así que la altura mínima sale
// de cuánta puede tragar cada uno antes de perderse.
const MAGNITUD_LIMITE_OJO = 4;         // lo más débil que se distingue con algo de ciudad
const EXTINCION_POR_AIRMASS = 0.28;
const ALTITUD_MINIMA_PLANETA = 5;      // más abajo mandan la bruma y el terreno, no la óptica

/** Altura a la que un planeta de esa magnitud deja de verse a simple vista. */
export function altitudMinimaPlaneta(magnitud: number): number {
  const airmassMax = (MAGNITUD_LIMITE_OJO - magnitud) / EXTINCION_POR_AIRMASS;
  if (airmassMax <= 1) return 90; // no se ve ni en el cenit
  return Math.max(ALTITUD_MINIMA_PLANETA, radiansToDegrees(Math.asin(1 / airmassMax)));
}

// Nada de madrugada: todo evento debe caer antes de las 00:00 hora local. Como todos
// ocurren de noche, basta con exigir que la hora local sea de tarde/noche.
const PRIMERA_HORA_DE_LA_NOCHE = 12;

// ─── Sedes ────────────────────────────────────────────────────────────────────

export type Sede = { nombre: string; lat: number; lon: number };

const LA_MANGA: Sede = { nombre: "La Manga", lat: 37.66, lon: -0.72 };
const MADRID: Sede = { nombre: "Madrid", lat: 40.46, lon: -3.69 };

/** Dónde estamos esa noche: La Manga en verano y en Navidad, Madrid el resto del año. */
export function sedeParaFecha(fecha: Date): Sede {
  const { mes, dia } = partesLocales(fecha);
  const mmdd = mes * 100 + dia;
  const enLaManga =
    (mmdd >= 620 && mmdd <= 909) ||  // 20 jun – 9 sep
    mmdd >= 1220 || mmdd <= 109;     // 20 dic – 9 ene
  return enLaManga ? LA_MANGA : MADRID;
}

// ─── Tiempo local ─────────────────────────────────────────────────────────────
// Todo el cálculo va en UTC; la hora local (con su cambio de hora) solo aparece al
// etiquetar los eventos y al decidir si caen antes de medianoche.

const TZ = "Europe/Madrid";

const FMT_PARTES = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});

export function partesLocales(fecha: Date) {
  const p = Object.fromEntries(FMT_PARTES.formatToParts(fecha).map((x) => [x.type, x.value]));
  return {
    mes: +p.month, dia: +p.day, hora: +p.hour, minuto: +p.minute,
    fechaISO: `${p.year}-${p.month}-${p.day}`,
    hhmm: `${p.hour}:${p.minute}`,
  };
}

const FMT_NOCHE = new Intl.DateTimeFormat("es-ES", {
  timeZone: TZ, weekday: "short", day: "numeric", month: "short",
});

/** "jue, 23 jul" → "Jue, 23 jul", para que case con "Hoy" y "Mañana". */
function etiquetaNoche(fecha: Date): string {
  const s = FMT_NOCHE.format(fecha);
  return s[0].toUpperCase() + s.slice(1);
}

/** Medianoche local (00:00) del día en que cae `fecha`, como instante UTC. */
function medianocheLocal(fecha: Date): Date {
  const { hora, minuto } = partesLocales(fecha);
  const t = new Date(fecha);
  t.setUTCMinutes(t.getUTCMinutes() - hora * 60 - minuto);
  t.setUTCSeconds(0, 0);
  return t;
}

function esDeLaNoche(fecha: Date): boolean {
  return partesLocales(fecha).hora >= PRIMERA_HORA_DE_LA_NOCHE;
}

// ─── Geometría de andar por casa ──────────────────────────────────────────────

type Vec3 = { x: number; y: number; z: number };

const UA_KM = 149597870.7;
const RUMBOS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
                "S", "SSO", "SO", "OSO", "O", "ONO", "NO", "NNO"];

export function rumbo(azimutGrados: number): string {
  return RUMBOS[Math.round((azimutGrados % 360) / 22.5) % 16];
}

function angulo(a: Vec3, b: Vec3): number {
  const dot = a.x * b.x + a.y * b.y + a.z * b.z;
  const na = Math.hypot(a.x, a.y, a.z);
  const nb = Math.hypot(b.x, b.y, b.z);
  return Math.acos(Math.min(1, Math.max(-1, dot / (na * nb))));
}

function resta(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

// ─── Brillo de un satélite ────────────────────────────────────────────────────

/**
 * Magnitud aparente de un satélite, con el modelo clásico de esfera difusa:
 * su magnitud estándar (medida a 1000 km y con el 50 % del disco iluminado) corregida
 * por distancia y por ángulo de fase. Es una aproximación — el brillo real depende de
 * la orientación de los paneles solares — pero ordena bien los pasos: acierta cuál es
 * espectacular y cuál es un puntito.
 */
export function magnitudSatelite(magEstandar: number, rangoKm: number, faseRad: number): number {
  const p = (fase: number) => (Math.sin(fase) + (Math.PI - fase) * Math.cos(fase)) / Math.PI;
  return magEstandar + 5 * Math.log10(rangoKm / 1000) - 2.5 * Math.log10(p(faseRad) / p(Math.PI / 2));
}

// ─── Eventos ──────────────────────────────────────────────────────────────────

export type EventoBase = {
  noche: string;        // clave YYYY-MM-DD de la noche a la que pertenece
  etiquetaNoche: string;
  sede: string;
  hora: string;         // HH:MM local
  instante: number;     // epoch ms del comienzo — para ordenar y para la cuenta atrás
  instanteFin: number;  // epoch ms del final; igual al comienzo si el evento es un instante
};

export type EventoSatelite = EventoBase & {
  tipo: "satelite";
  nombre: string;
  horaFin: string;
  duracionMin: number;
  altitud: number;      // altitud máxima, grados
  magnitud: number;
  desde: string;        // rumbo por el que aparece
  hasta: string;        // rumbo por el que se pierde
};

export type EventoLuna = EventoBase & {
  tipo: "luna";
  azimut: number;
  desde: string;
  iluminacion: number;  // 0–1
  magnitud: number;
  fase: string;
  anguloFase: number;   // 0° nueva, 180° llena — creciente por debajo de 180
};

export type EventoPlaneta = EventoBase & {
  tipo: "planeta";
  nombre: string;
  horaFin: string;      // cuándo baja de la altitud mínima (o medianoche)
  altitud: number;      // altitud máxima mientras es visible
  magnitud: number;
  desde: string;
};

export type Evento = EventoSatelite | EventoLuna | EventoPlaneta;

export type Noche = {
  clave: string;
  etiqueta: string;
  sede: string;
  eventos: Evento[];
};

function marca(fecha: Date, sede: Sede): EventoBase {
  const p = partesLocales(fecha);
  return {
    noche: p.fechaISO,
    etiquetaNoche: etiquetaNoche(fecha),
    sede: sede.nombre,
    hora: p.hhmm,
    instante: fecha.getTime(),
    instanteFin: fecha.getTime(),
  };
}

// ─── Satélites ────────────────────────────────────────────────────────────────

export type Satelite = { nombre: string; magEstandar: number; tle1: string; tle2: string };

/**
 * Altitud del Sol sobre el horizonte, en grados. Sin refracción a propósito: el
 * crepúsculo se define geométricamente, y así este criterio coincide con el
 * anochecer que busca `SearchAltitude` para los planetas.
 */
export function altitudSolar(fecha: Date, obs: Astro.Observer): number {
  const eq = Astro.Equator(Astro.Body.Sun, fecha, obs, true, true);
  return Astro.Horizon(fecha, obs, eq.ra, eq.dec).altitude;
}

const RADIO_TIERRA_KM = 6378.137; // WGS84
const RADIO_SOL_KM = 695700;

// Fracción del disco solar que la Tierra tapa vista desde el satélite: 0 = a plena
// luz, 1 = umbra total. Intersección de dos círculos (Sol y Tierra proyectados sobre
// el cielo del satélite). Es JS puro; satellite.js solo la trae en su build WASM (7.x),
// que cuelga el bundler — por eso vive aquí y nos quedamos en la 6.x sin WASM.
function shadowFraction(rsunUA: number[], sat: { x: number; y: number; z: number }): number {
  const sol = [rsunUA[0] * UA_KM, rsunUA[1] * UA_KM, rsunUA[2] * UA_KM];
  const solLen = Math.hypot(sol[0], sol[1], sol[2]);
  const pos = [sat.x, sat.y, sat.z];
  const posLen = Math.hypot(pos[0], pos[1], pos[2]);
  // Producto del satélite con la dirección antisolar (hacia la sombra).
  const dot = -(pos[0] * sol[0] + pos[1] * sol[1] + pos[2] * sol[2]) / solLen;
  if (dot <= 0) return 0; // satélite en el lado diurno de la Tierra
  const rE = Math.asin(RADIO_TIERRA_KM / posLen); // radio angular de la Tierra
  const rS = Math.asin(RADIO_SOL_KM / solLen);    // radio angular del Sol
  const d = Math.acos(dot / posLen);              // separación angular Tierra–Sol
  if (d <= rE - rS) return 1; // disco solar dentro del de la Tierra → umbra
  if (d >= rE + rS) return 0; // discos separados → plena luz
  // Penumbra: área de solape de los dos discos / área del disco solar.
  const a = rS * rS * Math.acos((d * d + rS * rS - rE * rE) / (2 * d * rS));
  const b = rE * rE * Math.acos((d * d + rE * rE - rS * rS) / (2 * d * rE));
  const c = 0.5 * Math.sqrt((-d + rS + rE) * (d + rS - rE) * (d - rS + rE) * (d + rS + rE));
  return (a + b - c) / (Math.PI * rS * rS);
}

type MuestraSat = { fecha: Date; altitud: number; azimut: number; magnitud: number };

/** Estado del satélite visto desde la sede, o null si está bajo el horizonte o a oscuras. */
function muestraSatelite(sat: Satelite, satrec: ReturnType<typeof twoline2satrec>,
                         fecha: Date, sede: Sede, obsAstro: Astro.Observer): MuestraSat | null {
  const pv = propagate(satrec, fecha);
  if (!pv) return null;

  const gmst = gstime(fecha);
  const obsGd = {
    latitude: degreesToRadians(sede.lat),
    longitude: degreesToRadians(sede.lon),
    height: 0,
  };
  const satEcf = eciToEcf(pv.position, gmst);
  const mira = ecfToLookAngles(obsGd, satEcf);
  const altitud = radiansToDegrees(mira.elevation);
  if (altitud < ALTITUD_MINIMA) return null;

  // El satélite tiene que estar al sol y el observador a oscuras.
  const sol = sunPos(jday(fecha));
  if (shadowFraction(sol.rsun, pv.position) > 0.5) return null;
  if (altitudSolar(fecha, obsAstro) > SOL_MAXIMO) return null;

  const solEci = { x: sol.rsun[0] * UA_KM, y: sol.rsun[1] * UA_KM, z: sol.rsun[2] * UA_KM };
  const solEcf = eciToEcf(solEci, gmst);
  const obsEcf = geodeticToEcf(obsGd);
  const fase = angulo(resta(solEcf, satEcf), resta(obsEcf, satEcf));

  return {
    fecha,
    altitud,
    azimut: radiansToDegrees(mira.azimuth),
    magnitud: magnitudSatelite(sat.magEstandar, mira.rangeSat, fase),
  };
}

/** Convierte un tramo continuo de muestras visibles en el evento que se enseña. */
function pasoDesdeMuestras(sat: Satelite, tramo: MuestraSat[], sede: Sede): EventoSatelite {
  const cumbre = tramo.reduce((a, b) => (b.altitud > a.altitud ? b : a));
  const masBrillante = Math.min(...tramo.map((m) => m.magnitud));
  const inicio = tramo[0], fin = tramo[tramo.length - 1];
  return {
    ...marca(inicio.fecha, sede),
    tipo: "satelite",
    nombre: sat.nombre,
    horaFin: partesLocales(fin.fecha).hhmm,
    instanteFin: fin.fecha.getTime(),
    duracionMin: Math.max(1, Math.round((fin.fecha.getTime() - inicio.fecha.getTime()) / 60000)),
    altitud: cumbre.altitud,
    magnitud: masBrillante,
    desde: rumbo(inicio.azimut),
    hasta: rumbo(fin.azimut),
  };
}

/** Pasos visibles de un satélite entre `desde` y `hasta`, ya filtrados por los criterios. */
export function pasosVisibles(sat: Satelite, desde: Date, hasta: Date): EventoSatelite[] {
  const satrec = twoline2satrec(sat.tle1, sat.tle2);
  const pasos: EventoSatelite[] = [];
  let tramo: MuestraSat[] = [];

  const cerrarTramo = (sede: Sede) => {
    if (tramo.length >= 2) {
      const paso = pasoDesdeMuestras(sat, tramo, sede);
      if (paso.magnitud <= MAGNITUD_MAXIMA && esDeLaNoche(tramo[0].fecha)) pasos.push(paso);
    }
    tramo = [];
  };

  for (let t = desde.getTime(); t <= hasta.getTime(); t += PASO_SEGUNDOS * 1000) {
    const fecha = new Date(t);
    const sede = sedeParaFecha(fecha);
    const obsAstro = new Astro.Observer(sede.lat, sede.lon, 0);
    const m = muestraSatelite(sat, satrec, fecha, sede, obsAstro);
    if (m) tramo.push(m);
    else cerrarTramo(sede);
  }
  cerrarTramo(sedeParaFecha(hasta));
  return pasos;
}

// ─── Luna ─────────────────────────────────────────────────────────────────────

// Lo que dura el espectáculo: la Luna sube un cuarto de grado por minuto, así que en
// veinte ya se ha despegado del horizonte y deja de ser lo que salías a ver.
const SALIDA_LUNA_MINUTOS = 20;

const FASES = [
  "luna nueva", "creciente", "cuarto creciente", "gibosa creciente",
  "luna llena", "gibosa menguante", "cuarto menguante", "menguante",
];

/** Nombre de la fase a partir del ángulo Sol–Luna (0° nueva, 180° llena). */
export function nombreFase(anguloFase: number): string {
  return FASES[Math.round(anguloFase / 45) % 8];
}

/** Salidas de la Luna entre las 20:00 y las 00:00 — el espectáculo desde La Manga. */
export function salidasDeLuna(desde: Date, hasta: Date): EventoLuna[] {
  const eventos: EventoLuna[] = [];
  let cursor = desde;

  while (cursor < hasta) {
    const sede = sedeParaFecha(cursor);
    const obs = new Astro.Observer(sede.lat, sede.lon, 0);
    const salida = Astro.SearchRiseSet(Astro.Body.Moon, obs, +1, cursor, 2);
    if (!salida || salida.date > hasta) break;

    const { hora } = partesLocales(salida.date);
    if (hora >= HORA_MINIMA_LUNA) {
      const eq = Astro.Equator(Astro.Body.Moon, salida.date, obs, true, true);
      const horizonte = Astro.Horizon(salida.date, obs, eq.ra, eq.dec, "normal");
      const luz = Astro.Illumination(Astro.Body.Moon, salida.date);
      const anguloFase = Astro.MoonPhase(salida.date);
      eventos.push({
        ...marca(salida.date, sede),
        instanteFin: salida.date.getTime() + SALIDA_LUNA_MINUTOS * 60000,
        tipo: "luna",
        azimut: horizonte.azimuth,
        desde: rumbo(horizonte.azimuth),
        iluminacion: luz.phase_fraction,
        magnitud: luz.mag,
        fase: nombreFase(anguloFase),
        anguloFase,
      });
    }
    cursor = new Date(salida.date.getTime() + 60 * 60 * 1000);
  }
  return eventos;
}

// ─── Planetas ─────────────────────────────────────────────────────────────────

const PLANETAS: { nombre: string; body: Astro.Body }[] = [
  { nombre: "Mercurio", body: Astro.Body.Mercury },
  { nombre: "Venus", body: Astro.Body.Venus },
  { nombre: "Marte", body: Astro.Body.Mars },
  { nombre: "Júpiter", body: Astro.Body.Jupiter },
  { nombre: "Saturno", body: Astro.Body.Saturn },
];

/**
 * Planetas visibles a simple vista entre el anochecer y las 00:00, uno por noche, con la
 * ventana en que se les ve por encima de su altitud mínima. A los planetas no se les aplica
 * el corte de magnitud de los satélites: Saturno nunca llegaría a −1 y aun así se ve bien.
 */
export function planetasVisibles(desde: Date, hasta: Date): EventoPlaneta[] {
  const eventos: EventoPlaneta[] = [];

  for (let dia = 0; dia < DIAS; dia++) {
    const medianoche = new Date(medianocheLocal(desde).getTime() + dia * 24 * 3600 * 1000);
    const sede = sedeParaFecha(medianoche);
    const obs = new Astro.Observer(sede.lat, sede.lon, 0);

    // Ventana: desde que el Sol baja de −6° hasta la medianoche local siguiente.
    const anochecer = Astro.SearchAltitude(Astro.Body.Sun, obs, -1, medianoche, 1, SOL_MAXIMO);
    if (!anochecer) continue;
    const inicio = new Date(Math.max(anochecer.date.getTime(), desde.getTime()));
    const fin = new Date(Math.min(medianoche.getTime() + 24 * 3600 * 1000, hasta.getTime()));
    if (inicio >= fin) continue;

    for (const planeta of PLANETAS) {
      const magnitud = Astro.Illumination(planeta.body, inicio).mag;
      const altitudMinima = altitudMinimaPlaneta(magnitud);
      let primera: { fecha: Date; azimut: number } | null = null;
      let ultima: Date | null = null;
      let altitudMax = -90;
      for (let t = inicio.getTime(); t <= fin.getTime(); t += PASO_PLANETAS_MINUTOS * 60000) {
        const fecha = new Date(t);
        const eq = Astro.Equator(planeta.body, fecha, obs, true, true);
        const h = Astro.Horizon(fecha, obs, eq.ra, eq.dec, "normal");
        if (h.altitude < altitudMinima) continue;
        primera ??= { fecha, azimut: h.azimuth };
        ultima = fecha;
        altitudMax = Math.max(altitudMax, h.altitude);
      }
      if (!primera || !ultima) continue;
      eventos.push({
        ...marca(primera.fecha, sede),
        tipo: "planeta",
        nombre: planeta.nombre,
        horaFin: partesLocales(ultima).hhmm,
        instanteFin: ultima.getTime(),
        altitud: altitudMax,
        magnitud,
        desde: rumbo(primera.azimut),
      });
    }
  }
  return eventos;
}

// ─── Agenda del cielo ─────────────────────────────────────────────────────────

/** Agrupa todos los eventos de las próximas noches, en orden cronológico. */
export function agenda(satelites: Satelite[], ahora: Date, dias = DIAS): Noche[] {
  // El barrido arranca un poco antes de ahora: lo que acaba de pasar sigue interesando
  // —te asomas y aún lo pillas, o al menos sabes que era eso lo que has visto—.
  const desde = new Date(ahora.getTime() - MARGEN_MINUTOS * 60000);
  const hasta = new Date(ahora.getTime() + dias * 24 * 3600 * 1000);
  const eventos: Evento[] = [
    ...satelites.flatMap((s) => pasosVisibles(s, desde, hasta)),
    ...salidasDeLuna(desde, hasta),
    ...planetasVisibles(desde, hasta),
  ].sort((a, b) => a.instante - b.instante);

  const hoy = partesLocales(ahora).fechaISO;
  const manana = partesLocales(new Date(ahora.getTime() + 24 * 3600 * 1000)).fechaISO;
  const etiqueta = (e: Evento) =>
    e.noche === hoy ? "Hoy" : e.noche === manana ? "Mañana" : e.etiquetaNoche;

  const noches = new Map<string, Noche>();
  for (const e of eventos) {
    const noche = noches.get(e.noche) ??
      { clave: e.noche, etiqueta: etiqueta(e), sede: e.sede, eventos: [] };
    noche.eventos.push(e);
    noches.set(e.noche, noche);
  }
  return [...noches.values()];
}
