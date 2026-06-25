// Cierra la sesión de /farma: caduca la cookie y vuelve al login. Desde ahí se
// puede entrar con la otra clave (cambiar de usuario).
const PROD = process.env.NODE_ENV === "production";

export async function POST(): Promise<Response> {
  const cookie =
    `farma_session=; Path=/farma; Max-Age=0; HttpOnly; SameSite=Lax${PROD ? "; Secure" : ""}`;
  return new Response(null, {
    status: 303,
    headers: { Location: "/farma", "Set-Cookie": cookie },
  });
}
