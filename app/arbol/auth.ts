// Gateo de /arbol: lee la cookie de sesión. Separado de lib/arbol/session.ts
// (puro) porque usa next/headers. Sin roles: solo "tiene sesión o no".
import { cookies } from "next/headers";
import { verifySession } from "@/lib/arbol/session";

/**
 * La puerta abierta de par en par, y solo en la máquina de casa. Sirve para poder mirar el
 * árbol en un navegador sin que nadie teclee la clave familiar: la clave se escribe donde se
 * usa, no donde se prueba. **Dos candados, porque esto abierto en producción son 428
 * personas a la vista:** el build de Vercel es siempre `production` y no llega ni a mirar la
 * variable, y en local hay que pedirlo a mano en `.env.local`, que no se commitea. Lo que se
 * salta es la puerta, nunca la firma: `session.ts` no se entera de que esto existe.
 */
const puertaAbiertaEnLocal = (): boolean =>
  // Quitar cualquiera de las dos condiciones publica el árbol de la familia entero y sin
  // clave, y el deploy sale verde igual. Esta línea no se «simplifica».
  process.env.NODE_ENV === "development" && process.env.ARBOL_LOCAL_SIN_CLAVE === "1";

export async function tieneSesion(): Promise<boolean> {
  if (puertaAbiertaEnLocal()) return true;
  const cookie = (await cookies()).get("arbol_session")?.value;
  return verifySession(cookie);
}
