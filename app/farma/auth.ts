// Gateo de las páginas servidor de /farma: lee la cookie de sesión y, donde haga
// falta, redirige. Separado de lib/farma/session.ts (puro) porque usa next/headers.
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySession, type Rol } from "@/lib/farma/session";

export async function getRol(): Promise<Rol | null> {
  const cookie = (await cookies()).get("farma_session")?.value;
  return verifySession(cookie)?.rol ?? null;
}

/** Páginas solo-admin (panel /farma/maria y sus subpáginas): si no es admin, vuelve a /farma. */
export async function requireAdmin(): Promise<void> {
  if ((await getRol()) !== "admin") redirect("/farma");
}
