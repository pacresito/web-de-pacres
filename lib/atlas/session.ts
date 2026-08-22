// Sesión de Atlas: cookie firmada (HMAC), sin roles — solo "tiene la clave o no". Misma pieza
// que la de /arbol, con su propia clave: un secreto que sirve para dos cosas es un secreto que
// no se puede rotar sin romper una de ellas.
//
// Caduca al año. Esto es un mazo de países, no datos médicos, y la clave se teclea en el móvil
// a través de una pulsación larga escondida: pedirla cada tres meses es exactamente la fricción
// que hace que se deje de usar.
//
// Módulo puro (solo crypto): se verifica con `npx tsx lib/atlas/session.test.ts`.
import { createHmac, timingSafeEqual } from "crypto";
import { comparaSecreto } from "../secreto";

const DIAS_VALIDEZ = 365;

export function passwordOk(input: unknown): boolean {
  return comparaSecreto(input, process.env.ATLAS_PASSWORD);
}

const hmac = (data: string, secreto: string): string =>
  createHmac("sha256", secreto).update(data).digest("hex");

/** Firmar sin secreto revienta a propósito: significa que falta una variable de entorno. */
export function signSession(now: Date = new Date()): { valor: string; expira: Date } {
  const secreto = process.env.ATLAS_SESSION_SECRET;
  if (!secreto) throw new Error("ATLAS_SESSION_SECRET no está definida.");
  const expira = new Date(now.getTime() + DIAS_VALIDEZ * 24 * 60 * 60 * 1000);
  const data = `ok.${Math.floor(expira.getTime() / 1000)}`;
  return { valor: `${data}.${hmac(data, secreto)}`, expira };
}

/**
 * Verifica firma (timing-safe) y expiración. **Sin secreto devuelve false en vez de reventar**,
 * al revés que al firmar: esto se llama en cada carga de la página, y un despliegue al que le
 * falte la variable tiene que quedarse sin puerta, no escupir un 500 por visita.
 */
export function verifySession(cookie: string | undefined): boolean {
  const secreto = process.env.ATLAS_SESSION_SECRET;
  if (!cookie || !secreto) return false;
  const [tag, epoch, sig] = cookie.split(".");
  if (tag !== "ok" || !epoch || !sig) return false;
  const a = Buffer.from(sig), b = Buffer.from(hmac(`${tag}.${epoch}`, secreto));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  return Number(epoch) * 1000 > Date.now();
}
