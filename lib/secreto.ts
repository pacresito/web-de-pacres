// Comparación de secretos en tiempo constante. Único sitio donde se compara una clave
// con la de su variable de entorno: todas pasan por aquí, sin excepción.
import { timingSafeEqual } from "crypto";

/** `false` si el secreto no está definido o el input no es una cadena. Longitudes
 *  distintas salen sin comparar (timingSafeEqual lanzaría); como el largo de cada
 *  secreto es fijo, eso no reintroduce timing explotable. */
export function comparaSecreto(input: unknown, esperado: string | undefined): boolean {
  if (!esperado || typeof input !== "string") return false;
  const a = Buffer.from(input);
  const b = Buffer.from(esperado);
  return a.length === b.length && timingSafeEqual(a, b);
}
