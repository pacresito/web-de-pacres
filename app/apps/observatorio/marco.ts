// El marco de la noche: de las 19:00 a la 01:00 de la mañana siguiente. Todo lo que pinta el
// observatorio comparte este eje —planetas, Luna y satélites—; fuera de él no miramos.
//
// Va en su propio módulo, sin dependencias, porque lo usan las dos orillas: el motor en el
// servidor y la vista en el navegador. Importarlo del motor arrastraría astronomy-engine y
// satellite.js al bundle de cliente.

export const MARCO_INICIO_H = 19;
const MARCO_FIN_H = 25;                                    // 01:00 del día siguiente
export const MARCO_MINUTOS = (MARCO_FIN_H - MARCO_INICIO_H) * 60; // 360

// La noche se sigue enseñando dos horas después de cerrar el marco: a las 03:00 lo que
// interesa es lo que ha pasado esta noche, no lo que traerá la de mañana. A las 04:00 releva.
const RELEVO_H = 28;

const TZ = "Europe/Madrid";

const FMT_PARTES = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});

/** La fecha vista desde Madrid: todo el cálculo va en UTC, la hora local solo al etiquetar. */
export function partesLocales(fecha: Date) {
  const p = Object.fromEntries(FMT_PARTES.formatToParts(fecha).map((x) => [x.type, x.value]));
  return { mes: +p.month, dia: +p.day, hora: +p.hour, minuto: +p.minute, hhmm: `${p.hour}:${p.minute}` };
}

/** Minutos desde la apertura del marco en que cae `fecha`, o null si queda fuera de él. */
export function minutosEnMarco(fecha: Date): number | null {
  const { hora, minuto } = partesLocales(fecha);
  // El marco cruza la medianoche: la madrugada cuenta como hora + 24.
  const h = hora >= MARCO_INICIO_H ? hora : hora + 24;
  const min = (h - MARCO_INICIO_H) * 60 + minuto;
  return min >= 0 && min <= MARCO_MINUTOS ? min : null;
}

/** Medianoche local (00:00) del día en que cae `fecha`, como instante UTC. */
function medianocheLocal(fecha: Date): Date {
  const { hora, minuto } = partesLocales(fecha);
  const t = new Date(fecha);
  t.setUTCMinutes(t.getUTCMinutes() - hora * 60 - minuto);
  t.setUTCSeconds(0, 0);
  return t;
}

/** Medianoche del día cuyo marco está abierto: de madrugada, la de ayer — la noche sigue viva. */
export function baseDelMarco(ahora: Date): Date {
  const base = medianocheLocal(ahora);
  const deMadrugada = partesLocales(ahora).hora < RELEVO_H - 24;
  return deMadrugada ? new Date(base.getTime() - 24 * 3600 * 1000) : base;
}

/** Instantes de apertura y cierre del marco que arranca en la medianoche `base`. */
export function bordesDelMarco(base: Date): [number, number] {
  return [base.getTime() + MARCO_INICIO_H * 3600 * 1000, base.getTime() + MARCO_FIN_H * 3600 * 1000];
}

// "sáb, 26" → "sáb 26": el día tal como se lee en la lista de próximos pasos.
const FMT_DIA = new Intl.DateTimeFormat("es-ES", { timeZone: TZ, weekday: "short", day: "numeric" });
export const etiquetaDia = (fecha: Date) => FMT_DIA.format(fecha).replace(",", "");

// "12 ago": la fecha de vuelta de lo que esta noche no se ve.
const FMT_DIA_MES = new Intl.DateTimeFormat("es-ES", { timeZone: TZ, day: "numeric", month: "short" });
export const diaYMes = (fecha: Date) => FMT_DIA_MES.format(fecha).replace(".", "");

// ── El enlace a un paso ──
// El aviso al móvil llega con el satélite a punto de salir: su enlace señala el paso que
// anuncia para que la web abra su carta, y no la portada. Vive aquí porque lo escribe el
// servidor y lo lee el navegador, y ninguno de los dos debe importar el módulo del otro.

/** «?paso=iss-1753301234000»: el nombre y el arranque del arco visible. */
export const enlaceDePaso = (nombre: string, visibleDesde: number) =>
  `?paso=${encodeURIComponent(`${nombre.toLowerCase()}-${visibleDesde}`)}`;

/** Lo que señala un `location.search`, o null si no señala ningún paso. */
export function pasoDelEnlace(busqueda: string): { nombre: string; visibleDesde: number } | null {
  const valor = new URLSearchParams(busqueda).get("paso");
  const partes = valor?.match(/^(.+)-(\d+)$/);
  return partes ? { nombre: partes[1], visibleDesde: +partes[2] } : null;
}
