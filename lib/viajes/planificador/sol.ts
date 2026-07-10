// Amanecer y atardecer por fecha y coordenadas, con la ecuación solar (NOAA),
// sin dependencias. Devuelve minutos desde la medianoche local en la zona horaria
// dada (por defecto, la peninsular española). Lo usa el planificador para el
// presupuesto de horas de luz. Test: `npx tsx lib/viajes/planificador/sol.test.ts`.

const rad = Math.PI / 180;

export type Luz = {
  amanecer: number;    // minutos desde la medianoche local
  atardecer: number;   // minutos desde la medianoche local
  minutosLuz: number;  // atardecer − amanecer
};

const julianDe = (fecha: Date) => fecha.getTime() / 86400000 + 2440587.5;
const julianAFecha = (j: number) => new Date((j - 2440587.5) * 86400000);

// Minutos desde la medianoche del instante, leídos en la zona horaria tz (aplica
// automáticamente el horario de verano de esa zona: no calculamos el offset a mano).
function minutosLocales(instante: Date, tz: string): number {
  const partes = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(instante);
  const h = +partes.find((p) => p.type === "hour")!.value;
  const m = +partes.find((p) => p.type === "minute")!.value;
  return h * 60 + m;
}

export function horasDeLuz(fecha: Date, lat: number, lon: number, tz = "Europe/Madrid"): Luz {
  const lw = -lon; // la ecuación usa longitud oeste positiva; nuestro lon es este positivo
  const n = Math.round(julianDe(fecha) - 2451545.0 + 0.0008); // día desde J2000
  const Jstar = n + lw / 360;                                  // mediodía solar medio
  const M = (357.5291 + 0.98560028 * Jstar) % 360;            // anomalía media del Sol (grados)
  const C = 1.9148 * Math.sin(M * rad) + 0.02 * Math.sin(2 * M * rad) + 0.0003 * Math.sin(3 * M * rad);
  const lambda = (M + C + 282.9372) % 360;                    // longitud eclíptica (180 + 102.9372)
  const Jtransit = 2451545.0 + Jstar + 0.0053 * Math.sin(M * rad) - 0.0069 * Math.sin(2 * lambda * rad);
  const delta = Math.asin(Math.sin(lambda * rad) * Math.sin(23.44 * rad)); // declinación solar (rad)
  const cosOmega =
    (Math.sin(-0.833 * rad) - Math.sin(lat * rad) * Math.sin(delta)) /
    (Math.cos(lat * rad) * Math.cos(delta));
  // Fuera de [-1, 1]: sol de medianoche o noche polar (no aplica a España; lo acotamos).
  const omega = Math.acos(Math.max(-1, Math.min(1, cosOmega))) / rad; // ángulo horario (grados)
  const amanecer = minutosLocales(julianAFecha(Jtransit - omega / 360), tz);
  const atardecer = minutosLocales(julianAFecha(Jtransit + omega / 360), tz);
  return { amanecer, atardecer, minutosLuz: atardecer - amanecer };
}
