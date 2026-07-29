// Cierra la sesión de /arbol: caduca la cookie y vuelve al login.
const PROD = process.env.NODE_ENV === "production";

export async function POST(): Promise<Response> {
  const cookie =
    `arbol_session=; Path=/arbol; Max-Age=0; HttpOnly; SameSite=Lax${PROD ? "; Secure" : ""}`;
  return new Response(null, {
    status: 303,
    headers: { Location: "/arbol", "Set-Cookie": cookie },
  });
}
