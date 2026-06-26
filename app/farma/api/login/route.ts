// Login de /farma: compara la clave con las dos env (admin/user), con rate limit
// por IP (reutiliza el de registros) y cookie firmada con el rol. Acertar resetea
// el contador, como en lib/registro.ts.
import { timingSafeEqual } from "crypto";
import { checkRateLimit, clearRateLimit, clientIp } from "@/lib/registro";
import { signSession, type Rol } from "@/lib/farma/session";

const RATE_PREFIX = process.env.NODE_ENV === "development" ? "farma:login-dev:" : "farma:login:";
const PROD = process.env.NODE_ENV === "production";

function match(input: string, expected: string | undefined): boolean {
  if (!expected) return false;
  const a = Buffer.from(input), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

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
  const pw = body.password;
  if (typeof pw !== "string") {
    return Response.json({ error: "Clave incorrecta" }, { status: 401 });
  }

  // Admin: comparación estricta. Usuario: normalizada (la teclea María a diario).
  let rol: Rol | null = null;
  if (match(pw, process.env.FARMA_ADMIN_PASSWORD)) rol = "admin";
  else if (match(pw.toLowerCase(), process.env.FARMA_USER_PASSWORD?.toLowerCase())) rol = "user";
  if (!rol) {
    return Response.json({ error: "Clave incorrecta" }, { status: 401 });
  }

  await clearRateLimit(ip, RATE_PREFIX);
  const { valor, expira } = signSession(rol);
  const cookie =
    `farma_session=${valor}; Path=/farma; Expires=${expira.toUTCString()}; ` +
    `HttpOnly; SameSite=Lax${PROD ? "; Secure" : ""}`;

  const res = Response.json({ destino: rol === "admin" ? "/farma/maria" : "/farma" });
  res.headers.set("Set-Cookie", cookie);
  return res;
}
