// Login de /arbol: una sola clave (familiar), rate limit por IP (reutiliza el de
// registros) y cookie firmada. Acertar resetea el contador.
import { checkRateLimit, clearRateLimit, clientIp } from "@/lib/registro";
import { prefijo } from "@/lib/keys";
import { passwordOk, signSession } from "@/lib/arbol/session";

const RATE_PREFIX = prefijo("arbol:login");
const PROD = process.env.NODE_ENV === "production";

export async function POST(request: Request): Promise<Response> {
  const ip = clientIp(request);
  if (!(await checkRateLimit(ip, RATE_PREFIX))) {
    return Response.json({ error: "Demasiados intentos. Espera 30 minutos." }, { status: 429 });
  }

  let body: { password?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 });
  }
  if (!passwordOk(body.password)) {
    return Response.json({ error: "Clave incorrecta" }, { status: 401 });
  }

  await clearRateLimit(ip, RATE_PREFIX);
  const { valor, expira } = signSession();
  const cookie =
    `arbol_session=${valor}; Path=/arbol; Expires=${expira.toUTCString()}; ` +
    `HttpOnly; SameSite=Lax${PROD ? "; Secure" : ""}`;

  const res = Response.json({ ok: true });
  res.headers.set("Set-Cookie", cookie);
  return res;
}
