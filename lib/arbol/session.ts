// Sesión de /arbol: cookie firmada (HMAC), sin roles — solo "tiene la clave o no".
// Caduca a los 90 días (dato de consulta familiar, no hace falta re-login semanal
// como en farma). Módulo puro (solo crypto): testeable con `npx tsx`.
import { createHmac, timingSafeEqual } from "crypto";
import { comparaSecreto } from "../secreto";

const DIAS_VALIDEZ = 90;

export function passwordOk(input: unknown): boolean {
  return comparaSecreto(input, process.env.ARBOL_PASSWORD);
}

function secret(): string {
  const s = process.env.ARBOL_SESSION_SECRET;
  if (!s) throw new Error("ARBOL_SESSION_SECRET no está definida.");
  return s;
}

function hmac(data: string): string {
  return createHmac("sha256", secret()).update(data).digest("hex");
}

export function signSession(now: Date = new Date()): { valor: string; expira: Date } {
  const expira = new Date(now.getTime() + DIAS_VALIDEZ * 24 * 60 * 60 * 1000);
  const data = `ok.${Math.floor(expira.getTime() / 1000)}`;
  return { valor: `${data}.${hmac(data)}`, expira };
}

/** Verifica firma (timing-safe) y expiración. */
export function verifySession(cookie: string | undefined): boolean {
  if (!cookie) return false;
  const [tag, epoch, sig] = cookie.split(".");
  if (tag !== "ok" || !epoch || !sig) return false;
  const expected = hmac(`${tag}.${epoch}`);
  const a = Buffer.from(sig), b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  return Number(epoch) * 1000 > Date.now();
}
