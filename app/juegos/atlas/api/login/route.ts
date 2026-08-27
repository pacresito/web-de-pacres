// La puerta de Atlas: una clave, rate limit por IP (el mismo de registros) y cookie firmada.
// Acertar resetea el contador. El DELETE la cierra.
//
// Sin clave el juego funciona igual y el progreso se queda en el navegador: eso es deliberado,
// sirve para prestarle el móvil a alguien sin ensuciar el mazo.
import { checkRateLimit, clearRateLimit, clientIp } from "@/lib/registro";
import { passwordOk, signSession } from "@/lib/atlas/session";

const RATE = "login:atlas";
const PROD = process.env.NODE_ENV === "production";

// La cookie solo viaja a las rutas del juego: fuera de aquí no hay nada que autorizar.
const cookie = (valor: string, expira: Date) =>
  `atlas_session=${valor}; Path=/juegos/atlas; Expires=${expira.toUTCString()}; ` +
  `HttpOnly; SameSite=Lax${PROD ? "; Secure" : ""}`;

export async function POST(request: Request): Promise<Response> {
  const ip = clientIp(request);
  if (!(await checkRateLimit(ip, RATE))) {
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

  await clearRateLimit(ip, RATE);
  const { valor, expira } = signSession();
  const res = Response.json({ ok: true });
  res.headers.set("Set-Cookie", cookie(valor, expira));
  return res;
}

export async function DELETE(): Promise<Response> {
  const res = Response.json({ ok: true });
  res.headers.set("Set-Cookie", cookie("", new Date(0)));
  return res;
}
