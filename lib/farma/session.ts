// Sesion de /farma: cookie firmada (HMAC), sin sistema de usuarios. El valor es
// `rol.expiraEpoch.hmac`; la sesion caduca el proximo lunes 00:00 (Europe/Madrid)
// para forzar re-login semanal. Modulo puro (solo crypto): testeable con `npx tsx`.
import { createHmac, timingSafeEqual } from "crypto";

export type Rol = "user" | "admin";

const TZ = "Europe/Madrid";

function secret(): string {
  const s = process.env.FARMA_SESSION_SECRET;
  if (!s) throw new Error("FARMA_SESSION_SECRET no está definida.");
  return s;
}

function hmac(data: string): string {
  return createHmac("sha256", secret()).update(data).digest("hex");
}

/** Offset de Madrid respecto a UTC, en ms, para un instante dado (maneja CET/CEST).
 *  Lee la hora de pared en Madrid y la trata como si fuera UTC; la diferencia con el
 *  instante real es el offset. Independiente de la zona horaria del servidor. */
function madridOffsetMs(utcMs: number): number {
  const f = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ, hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const p = Object.fromEntries(f.formatToParts(new Date(utcMs)).map((x) => [x.type, x.value]));
  const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
  return asUTC - utcMs;
}

/** Próximo lunes 00:00 en Europe/Madrid (siempre estrictamente futuro). Vercel
 *  corre en UTC, por eso se calcula el offset real de Madrid en esa fecha. */
export function nextMondayMadrid(now: Date = new Date()): Date {
  const f = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ, weekday: "short", year: "numeric", month: "2-digit", day: "2-digit",
  });
  const p = Object.fromEntries(f.formatToParts(now).map((x) => [x.type, x.value]));
  const wd = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 }[p.weekday] ?? 1;
  const add = ((8 - wd) % 7) || 7;                        // días hasta el próximo lunes
  const guess = Date.UTC(+p.year, +p.month - 1, +p.day + add); // 00:00 "UTC" de ese lunes
  return new Date(guess - madridOffsetMs(guess));        // corrige al offset de Madrid
}

export function signSession(rol: Rol): { valor: string; expira: Date } {
  const expira = nextMondayMadrid();
  const data = `${rol}.${Math.floor(expira.getTime() / 1000)}`;
  return { valor: `${data}.${hmac(data)}`, expira };
}

/** Verifica firma (timing-safe) y expiración. Devuelve el rol o null. */
export function verifySession(cookie: string | undefined): { rol: Rol } | null {
  if (!cookie) return null;
  const [rol, epoch, sig] = cookie.split(".");
  if ((rol !== "user" && rol !== "admin") || !epoch || !sig) return null;
  const expected = hmac(`${rol}.${epoch}`);
  const a = Buffer.from(sig), b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  if (!(Number(epoch) * 1000 > Date.now())) return null;  // caducada (o epoch inválido)
  return { rol };
}
