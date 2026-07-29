// Gateo de /arbol: lee la cookie de sesión. Separado de lib/arbol/session.ts
// (puro) porque usa next/headers. Sin roles: solo "tiene sesión o no".
import { cookies } from "next/headers";
import { verifySession } from "@/lib/arbol/session";

export async function tieneSesion(): Promise<boolean> {
  const cookie = (await cookies()).get("arbol_session")?.value;
  return verifySession(cookie);
}
