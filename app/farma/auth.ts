// Gateo de las páginas servidor de /farma: lee la cookie de sesión y, donde haga
// falta, redirige. Separado de lib/farma/session.ts (puro) porque usa next/headers.
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySession, type Rol } from "@/lib/farma/session";

/**
 * La puerta abierta de par en par, como admin, y solo en la máquina de casa. Sirve para
 * trabajar en /farma sin teclear la clave de María: la clave se escribe donde se usa, no
 * donde se prueba. **Dos candados, porque esto abierto en producción es el inventario y los
 * precios de la farmacia a la vista de cualquiera:** el build de Vercel es siempre
 * `production` y no llega ni a mirar la variable, y en local hay que pedirlo a mano en
 * `.env.local`, que no se commitea. Lo que se salta es la puerta, nunca la firma:
 * `session.ts` no se entera de que esto existe.
 */
const puertaAbiertaEnLocal = (): boolean =>
  // Quitar cualquiera de las dos condiciones abre la farmacia entera y sin clave, y el
  // deploy sale verde igual. Esta línea no se «simplifica».
  process.env.NODE_ENV === "development" && process.env.FARMA_LOCAL_SIN_CLAVE === "1";

export async function getRol(): Promise<Rol | null> {
  if (puertaAbiertaEnLocal()) return "admin";
  const cookie = (await cookies()).get("farma_session")?.value;
  return verifySession(cookie)?.rol ?? null;
}

/** Páginas solo-admin (panel /farma/maria y sus subpáginas): si no es admin, vuelve a /farma. */
export async function requireAdmin(): Promise<void> {
  if ((await getRol()) !== "admin") redirect("/farma");
}
