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
import {
  baseDelMarco, bordesDelMarco, diaYMes, etiquetaDia, minutosEnMarco, partesLocales,
} from "./marco";

// ─── Criterios de visibilidad ─────────────────────────────────────────────────

export const ALTITUD_MINIMA = 15;      // grados sobre el horizonte
export const MAGNITUD_MAXIMA = -1;     // solo satélites más brillantes que esto
export const SOL_MAXIMO = -6;          // el observador necesita el Sol bajo el horizonte
export const DIAS = 7;                 // horizonte de la previsión
export const MARGEN_MINUTOS = 10;      // un evento sigue en la lista hasta 10 min después
const PASO_SEGUNDOS = 30;              // muestreo de la órbita

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

function esDeLaNoche(fecha: Date): boolean {
  return partesLocales(fecha).hora >= PRIMERA_HORA_DE_LA_NOCHE;
}

// ─── Geometría de andar por casa ──────────────────────────────────────────────

type Vec3 = { x: number; y: number; z: number };

const UA_KM = 149597870.7;
const RUMBOS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
                "S", "SSO", "SO", "OSO", "O", "ONO", "NO", "NNO"];

export function rumbo(azimutGrados: number): string {
  const az = ((azimutGrados % 360) + 360) % 360; // normaliza también azimuts negativos
  return RUMBOS[Math.round(az / 22.5) % 16];
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
  dia: string;          // "sáb 26", para la lista de próximos pasos
  hora: string;         // HH:MM local
  instante: number;     // epoch ms del comienzo — para ordenar y para la cuenta atrás
  instanteFin: number;  // epoch ms del final; igual al comienzo si el evento es un instante
};

// Un punto de la trayectoria dibujada: cuándo, dónde está el objeto (rumbo y altura) y si en
// ese instante se ve (trazo continuo) o no (discontinuo, p. ej. dentro de la sombra de la
// Tierra). El instante es lo que permite pintar en la carta dónde está el satélite ahora.
export type PuntoArco = { t: number; az: number; alt: number; vis: boolean };

export type EventoSatelite = EventoBase & {
  tipo: "satelite";
  nombre: string;
  horaFin: string;
  duracionMin: number;
  altitud: number;      // altitud máxima, grados
  magnitud: number;
  // El rumbo de entrada y salida no viaja aparte: la carta del cielo ya lo dibuja, y lo que
  // acompaña al texto es la magnitud —el dato que dice si vale la pena salir a mirar—.
  trayectoria: PuntoArco[]; // el arco entero sobre el horizonte, para la carta del cielo
  luna: PosicionLuna | null; // dónde está la Luna durante el paso, o null si no ha salido
};

/** La Luna durante un paso: su sitio en la carta (az/alt) y cómo se dice en voz alta (rumbo). */
export type PosicionLuna = { az: number; alt: number; rumbo: string };

export type EventoLuna = EventoBase & {
  tipo: "luna";
  azimut: number;
  desde: string;        // rumbo por el que sale
  iluminacion: number;  // 0–1
  anguloFase: number;   // 0° nueva, 180° llena — creciente por debajo de 180
};

// Los planetas ya no son eventos de la agenda: viven en su propia tabla (ver más abajo),
// porque están horas en el cielo y no piden cuenta atrás como un paso o una salida de Luna.
export type Evento = EventoSatelite | EventoLuna;

function marca(fecha: Date): EventoBase {
  return {
    dia: etiquetaDia(fecha),
    hora: partesLocales(fecha).hhmm,
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

const redondo = (n: number) => +n.toFixed(2);

// Un instante del satélite sobre el horizonte: dónde está y si en ese momento se ve. `vis` es
// que esté al sol y el observador a oscuras; el listón de altitud NO entra aquí (el arco se
// dibuja entero, hasta el horizonte), solo al decidir qué tramo se reporta como paso.
type Muestra = { fecha: Date; alt: number; az: number; mag: number; vis: boolean };

/** Estado del satélite visto desde la sede, o null si está bajo el horizonte. */
function muestraSatelite(sat: Satelite, satrec: ReturnType<typeof twoline2satrec>,
                         fecha: Date, sede: Sede, obsAstro: Astro.Observer): Muestra | null {
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
  const alt = radiansToDegrees(mira.elevation);
  if (alt < 0) return null; // bajo el horizonte: fuera del arco

  const sol = sunPos(jday(fecha));
  const solEci = { x: sol.rsun[0] * UA_KM, y: sol.rsun[1] * UA_KM, z: sol.rsun[2] * UA_KM };
  const solEcf = eciToEcf(solEci, gmst);
  const obsEcf = geodeticToEcf(obsGd);
  const fase = angulo(resta(solEcf, satEcf), resta(obsEcf, satEcf));

  const alSol = shadowFraction(sol.rsun, pv.position) <= 0.5;
  const observadorAOscuras = altitudSolar(fecha, obsAstro) <= SOL_MAXIMO;
  return {
    fecha,
    alt,
    az: radiansToDegrees(mira.azimuth),
    mag: magnitudSatelite(sat.magEstandar, mira.rangeSat, fase),
    vis: alSol && observadorAOscuras,
  };
}

/** La Luna solo si está sobre el horizonte; para pintarla como punto en la carta del satélite. */
function lunaEnCielo(obs: Astro.Observer, fecha: Date): PosicionLuna | null {
  const eq = Astro.Equator(Astro.Body.Moon, fecha, obs, true, true);
  const h = Astro.Horizon(fecha, obs, eq.ra, eq.dec, "normal");
  if (h.altitude <= 0) return null;
  return { az: redondo(h.azimuth), alt: redondo(h.altitude), rumbo: rumbo(h.azimuth) };
}

/**
 * De un arco entero sobre el horizonte, los pasos reportables: cada tramo continuo en que el
 * satélite se ve (al sol, observador a oscuras) por encima de la altitud mínima y con brillo
 * suficiente. Cada evento se lleva el arco completo (para la carta) y la posición de la Luna en
 * su cumbre. Preserva la semántica del muestreo anterior: mismo predicado, mismos tramos.
 */
function pasosDelArco(sat: Satelite, arco: Muestra[], sede: Sede): EventoSatelite[] {
  const trayectoria: PuntoArco[] = arco.map((m) => ({
    t: m.fecha.getTime(), az: redondo(m.az), alt: redondo(m.alt), vis: m.vis,
  }));
  const obs = new Astro.Observer(sede.lat, sede.lon, 0);
  const pasos: EventoSatelite[] = [];
  let tramo: Muestra[] = [];

  const cerrar = () => {
    if (tramo.length >= 2 && esDeLaNoche(tramo[0].fecha)) {
      const masBrillante = Math.min(...tramo.map((m) => m.mag));
      if (masBrillante <= MAGNITUD_MAXIMA) {
        const cumbre = tramo.reduce((a, b) => (b.alt > a.alt ? b : a));
        const inicio = tramo[0], fin = tramo[tramo.length - 1];
        pasos.push({
          ...marca(inicio.fecha),
          tipo: "satelite",
          nombre: sat.nombre,
          horaFin: partesLocales(fin.fecha).hhmm,
          instanteFin: fin.fecha.getTime(),
          duracionMin: Math.max(1, Math.round((fin.fecha.getTime() - inicio.fecha.getTime()) / 60000)),
          altitud: cumbre.alt,
          magnitud: masBrillante,
          trayectoria,
          luna: lunaEnCielo(obs, cumbre.fecha),
        });
      }
    }
    tramo = [];
  };

  for (const m of arco) {
    if (m.vis && m.alt >= ALTITUD_MINIMA) tramo.push(m);
    else cerrar();
  }
  cerrar();
  return pasos;
}

/** Pasos visibles de un satélite entre `desde` y `hasta`, ya filtrados por los criterios. */
export function pasosVisibles(sat: Satelite, desde: Date, hasta: Date, pasoSegundos = PASO_SEGUNDOS): EventoSatelite[] {
  const satrec = twoline2satrec(sat.tle1, sat.tle2);
  const pasos: EventoSatelite[] = [];
  let arco: Muestra[] = [];

  const cerrarArco = () => {
    if (arco.length) pasos.push(...pasosDelArco(sat, arco, sedeParaFecha(arco[0].fecha)));
    arco = [];
  };

  for (let t = desde.getTime(); t <= hasta.getTime(); t += pasoSegundos * 1000) {
    const fecha = new Date(t);
    const sede = sedeParaFecha(fecha);
    const obsAstro = new Astro.Observer(sede.lat, sede.lon, 0);
    const m = muestraSatelite(sat, satrec, fecha, sede, obsAstro);
    if (m) arco.push(m);
    else cerrarArco();
  }
  cerrarArco();
  return pasos;
}

// Buscar la reaparición de un satélite es barrer semanas de órbita, así que se hace con
// muestreo grueso: un paso que se ve dura minutos, no se escapa entre dos muestras de un
// minuto, y de una fecha a un mes vista solo se publica el día.
const PASO_BUSQUEDA_SEGUNDOS = 60;
const DIAS_REAPARICION_SAT = 30;

/**
 * Día en que un satélite vuelve a dejarse ver ("12 ago"), o null si no lo hace en un mes.
 * Se llama solo cuando no tiene ningún paso en la semana: es un barrido caro comparado con
 * el de la agenda.
 */
export function reaparicionSatelite(sat: Satelite, desde: Date): string | null {
  const hasta = new Date(desde.getTime() + DIAS_REAPARICION_SAT * 24 * 3600 * 1000);
  const [primero] = pasosVisibles(sat, desde, hasta, PASO_BUSQUEDA_SEGUNDOS);
  return primero ? diaYMes(new Date(primero.instante)) : null;
}

// ─── Luna ─────────────────────────────────────────────────────────────────────

// Lo que dura el espectáculo: la Luna sube un cuarto de grado por minuto, así que en
// veinte ya se ha despegado del horizonte y deja de ser lo que salías a ver.
const SALIDA_LUNA_MINUTOS = 20;

/** Salidas de la Luna que caen dentro del marco 18:00–02:00 — el espectáculo desde La Manga. */
export function salidasDeLuna(desde: Date, hasta: Date): EventoLuna[] {
  const eventos: EventoLuna[] = [];
  let cursor = desde;

  while (cursor < hasta) {
    const sede = sedeParaFecha(cursor);
    const obs = new Astro.Observer(sede.lat, sede.lon, 0);
    const salida = Astro.SearchRiseSet(Astro.Body.Moon, obs, +1, cursor, 2);
    if (!salida || salida.date > hasta) break;

    if (minutosEnMarco(salida.date) !== null) {
      const eq = Astro.Equator(Astro.Body.Moon, salida.date, obs, true, true);
      const horizonte = Astro.Horizon(salida.date, obs, eq.ra, eq.dec, "normal");
      eventos.push({
        ...marca(salida.date),
        instanteFin: salida.date.getTime() + SALIDA_LUNA_MINUTOS * 60000,
        tipo: "luna",
        azimut: horizonte.azimuth,
        desde: rumbo(horizonte.azimuth),
        iluminacion: Astro.Illumination(Astro.Body.Moon, salida.date).phase_fraction,
        anguloFase: Astro.MoonPhase(salida.date),
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

// La franja de visibilidad es la ventana real de cada planeta dentro del marco de la noche;
// si asoma pegada a un borde, ese extremo queda abierto (sin hora): antes de las 18:00 o
// después de las 02:00 no nos importa lo que haga.
const PASO_TABLA_MIN = 5;         // muestreo fino de la noche que se enseña
const PASO_REAPARICION_MIN = 20;  // muestreo grueso al buscar la vuelta de un planeta
const DIAS_REAPARICION = 90;      // hasta dónde se busca la reaparición; más allá, "en unos meses"

export type FasePlaneta = {
  iluminacion: number;       // fracción del disco iluminada, 0–1
  anguloFase: number;        // grados; 0 = lleno
  ringTilt: number | null;   // inclinación del anillo, grados (solo Saturno; null el resto)
};

/**
 * Altura del Sol (negativa = bajo el horizonte) a partir de la cual un astro de magnitud `mag`
 * se despega del cielo aún claro. No hay un crepúsculo único que valga para todos: Venus (−4,3)
 * se ve con el Sol todavía en el horizonte y Saturno (+0,5) lo pide bien entrado.
 *
 * Recta calibrada con lo observado desde La Manga: Venus nítido a las 21:15 del 23 jul 2026, a
 * 25° de altura y con el Sol en el horizonte. No es el *arcus visionis* de las tablas, que se
 * define con el astro asomando por el horizonte y no encaja con un planeta ya alto: no la
 * "arregles" para que case con él (7° + 1,1·mag llega trece minutos tarde a esa observación).
 *
 * Sin acotar a propósito: para Venus pide el Sol un pelo por encima del horizonte, y es correcto
 * —así se vio—; un tope en 0° lo retrasa 5–10 min en la mayoría de las noches en que se ve.
 *
 * Lo riguroso sería Schaefer 1993 (brillo del cielo y umbral de contraste), mucha más maquinaria
 * de la que esto pide.
 */
export function umbralSolar(mag: number): number {
  return -6 - 1.5 * mag;
}

export type Ventana = {
  desdeMin: number;       // minutos desde las 18:00 en que empieza a verse (0–480)
  hastaMin: number;       // minutos desde las 18:00 en que deja de verse (0–480)
  horaInicio: string;     // HH:MM local
  horaFin: string;        // HH:MM local
  abiertoInicio: boolean; // ya se veía en el borde del marco (18:00) → sin etiqueta
  abiertoFin: boolean;    // seguía viéndose en el otro borde (02:00) → sin etiqueta
};

export type FilaPlaneta = {
  nombre: string;
  magnitud: number;            // brillo aparente; cuanto más bajo, más brilla
  fase: FasePlaneta;
  ventana: Ventana | null;     // la de esta noche, o null si no se ve
  vuelveEl: string | null;     // "12 ago" si vuelve dentro de 90 días; null si tarda más ("en unos meses")
  vuelveEnDias: number | null; // noches que faltan para esa vuelta; ordena la tabla, y null si tarda más
};

/** Fase del planeta en un instante: fracción iluminada, ángulo y, en Saturno, el anillo. */
function faseEn(body: Astro.Body, fecha: Date): FasePlaneta {
  const il = Astro.Illumination(body, fecha);
  return { iluminacion: il.phase_fraction, anguloFase: il.phase_angle, ringTilt: il.ring_tilt ?? null };
}

type VentanaCruda = { inicio: Date; fin: Date; abiertoInicio: boolean; abiertoFin: boolean };

/**
 * Ventana visible de un planeta dentro del marco 18:00–02:00 de la noche que arranca en
 * `medianoche` (00:00 local de ese día): el tramo en que asoma sobre el horizonte con el cielo
 * ya bastante oscuro para su brillo (ver `umbralSolar`). `null` si esa noche no llega a verse.
 * `paso` fino para la noche que se pinta, grueso al buscar la vuelta.
 *
 * Sin listón de altura a propósito: desde La Manga el horizonte es el mar, y Venus se vio hasta
 * las 23:20 del 24 jul 2026 poniéndose a las 23:24. Poner uno recortaría la ventana por donde
 * más acierta.
 */
function ventanaNoche(body: Astro.Body, medianoche: Date, obs: Astro.Observer, paso: number,
                      mag: number): VentanaCruda | null {
  const [T0, T1] = bordesDelMarco(medianoche);
  const umbral = umbralSolar(mag);
  let inicio: Date | null = null, fin: Date | null = null, tPrimera = 0, tUltima = 0;
  for (let t = T0; t <= T1; t += paso * 60000) {
    const fecha = new Date(t);
    const eq = Astro.Equator(body, fecha, obs, true, true);
    if (Astro.Horizon(fecha, obs, eq.ra, eq.dec, "normal").altitude <= 0) continue;
    if (altitudSolar(fecha, obs) > umbral) continue;
    if (!inicio) { inicio = fecha; tPrimera = t; }
    fin = fecha; tUltima = t;
  }
  if (!inicio || !fin) return null;
  return { inicio, fin, abiertoInicio: tPrimera === T0, abiertoFin: tUltima === T1 };
}

/** Instante nocturno de referencia (20:00 local) para calcular la fase de un planeta. */
const nocheDe = (medianoche: Date) => new Date(medianoche.getTime() + 20 * 3600 * 1000);

/**
 * Los cinco planetas a simple vista, en orden fijo, para la tabla del observatorio. Cada uno
 * con su fase y, si se ve esta noche, la ventana dentro del marco 18:00–02:00; si no, la
 * fecha en que vuelve a verse (barrido día a día, hasta seis meses).
 */
export function tablaPlanetas(ahora: Date): FilaPlaneta[] {
  const base = baseDelMarco(ahora);
  const obsDe = (medianoche: Date) => {
    const sede = sedeParaFecha(nocheDe(medianoche));
    return new Astro.Observer(sede.lat, sede.lon, 0);
  };

  return PLANETAS.map(({ nombre, body }) => {
    // El brillo apenas se mueve de una noche a la siguiente, así que el de esta noche sirve
    // también para decidir cuánto crepúsculo pide el planeta en las que vienen.
    const magnitud = redondo(Astro.Illumination(body, nocheDe(base)).mag);
    const v = ventanaNoche(body, base, obsDe(base), PASO_TABLA_MIN, magnitud);
    if (v) {
      const [T0] = bordesDelMarco(base);
      return {
        nombre,
        magnitud,
        fase: faseEn(body, v.inicio),
        ventana: {
          desdeMin: Math.round((v.inicio.getTime() - T0) / 60000),
          hastaMin: Math.round((v.fin.getTime() - T0) / 60000),
          horaInicio: partesLocales(v.inicio).hhmm,
          horaFin: partesLocales(v.fin).hhmm,
          abiertoInicio: v.abiertoInicio,
          abiertoFin: v.abiertoFin,
        },
        vuelveEl: null,
        vuelveEnDias: null,
      };
    }
    // No se ve esta noche: la primera noche que sí, día a día con muestreo grueso.
    let vuelveEl: string | null = null;
    let vuelveEnDias: number | null = null;
    for (let d = 1; d <= DIAS_REAPARICION; d++) {
      const noche = new Date(base.getTime() + d * 24 * 3600 * 1000);
      if (ventanaNoche(body, noche, obsDe(noche), PASO_REAPARICION_MIN, magnitud)) {
        vuelveEl = diaYMes(noche);
        vuelveEnDias = d;
        break;
      }
    }
    return { nombre, magnitud, fase: faseEn(body, nocheDe(base)), ventana: null, vuelveEl, vuelveEnDias };
  });
}

// ─── El cielo de esta noche ───────────────────────────────────────────────────

// Cuántos pasos futuros caben en el pie de la tarjeta: los dos siguientes de la semana.
const PROXIMOS_PASOS = 2;
// Lo que no se ve en toda la semana no se lista: se anuncia el día que vuelve.
const DIAS_LUNA = 30;

/** Un satélite que esta semana no aparece, con el día en que vuelve (null si tarda un mes o más). */
export type Ausente = { nombre: string; vuelveEl: string | null };

/** Una cita futura, sin más equipaje que lo que pide la cuenta atrás de la línea de estado. */
export type Cita = { nombre: string; instante: number; instanteFin: number };

export type Cielo = {
  sede: string;
  planetas: FilaPlaneta[];
  luna: EventoLuna | null;      // la salida de esta noche, si cae dentro del marco
  lunaVuelveEl: string | null;  // y si no, el día en que vuelve a salir dentro de él
  pasos: EventoSatelite[];      // los pasos de esta noche, con su carta del cielo
  proximos: EventoSatelite[];   // los que vienen después, hasta dos
  ausentes: Ausente[];          // los satélites que no vuelven a asomar esta semana
  citas: Cita[];                // todo lo de la semana, para la cuenta atrás
};

/** Todo lo que el observatorio enseña de una noche, calculado de una vez. */
export function cielo(satelites: Satelite[], ahora: Date, dias = DIAS): Cielo {
  // El barrido arranca en la apertura del marco, no en "ahora": la noche se enseña entera,
  // y lo que ya ha ocurrido sigue en su sitio —te dice qué era esa luz que viste a las diez—.
  // De día, cuando el marco aún no ha abierto, basta con mirar desde un poco antes de ahora.
  const [abre, cierra] = bordesDelMarco(baseDelMarco(ahora));
  const desde = new Date(Math.min(ahora.getTime() - MARGEN_MINUTOS * 60000, abre));
  const hasta = new Date(ahora.getTime() + dias * 24 * 3600 * 1000);

  const pasosSemana = satelites
    .flatMap((s) => pasosVisibles(s, desde, hasta))
    .sort((a, b) => a.instante - b.instante);
  // Las salidas de Luna se buscan a un mes: si esta noche no sale dentro del marco, la
  // siguiente que sí puede estar a dos semanas —la Luna se retrasa 50 min cada día—.
  const lunas = salidasDeLuna(desde, new Date(desde.getTime() + DIAS_LUNA * 24 * 3600 * 1000));

  const deEstaNoche = (e: Evento) => e.instante >= abre && e.instante <= cierra;
  const futuros = pasosSemana.filter((p) => p.instante > cierra);
  const lunaEstaNoche = lunas.find(deEstaNoche) ?? null;
  const proximaLuna = lunas.find((l) => l.instante > cierra);
  const citas: Cita[] = [...pasosSemana, ...lunas.filter((l) => l.instante <= hasta.getTime())]
    .sort((a, b) => a.instante - b.instante)
    .map((e) => ({
      nombre: e.tipo === "luna" ? "Moon" : e.nombre,
      instante: e.instante,
      instanteFin: e.instanteFin,
    }));

  return {
    sede: sedeParaFecha(ahora).nombre,
    planetas: tablaPlanetas(ahora),
    luna: lunaEstaNoche,
    lunaVuelveEl: lunaEstaNoche || !proximaLuna ? null : diaYMes(new Date(proximaLuna.instante)),
    pasos: pasosSemana.filter(deEstaNoche),
    proximos: futuros.slice(0, PROXIMOS_PASOS),
    ausentes: satelites
      .filter((s) => !futuros.some((p) => p.nombre === s.nombre))
      .map((s) => ({ nombre: s.nombre, vuelveEl: reaparicionSatelite(s, hasta) })),
    citas,
  };
}
