import { listAll, setHidden, remove } from "@/lib/guestbook";
import { passwordOk, checkRateLimit, clearRateLimit, clientIp } from "@/lib/registro";

const RATE_PREFIX = "ratelimit:guestbook:moderar:";

/**
 * Dos caminos:
 *  - `token` (id de una firma): lo usa el enlace «ocultar» del email. Oculta esa
 *    firma sin contraseña; el id es aleatorio e inadivinable.
 *  - `password` + `action`: el panel ?moderar. Lista todas, oculta/muestra/borra.
 */
export async function POST(request: Request) {
  const ip = clientIp(request);

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { token, password, action, id } = body;

  // Camino 1: enlace del email. Oculta por id/token, sin contraseña.
  if (typeof token === "string" && token.length > 0) {
    if (!(await checkRateLimit(ip, RATE_PREFIX))) {
      return Response.json({ error: "Demasiados intentos. Espera 30 minutos." }, { status: 429 });
    }
    const ok = await setHidden(token, true);
    return Response.json({ ok });
  }

  // Camino 2: panel ?moderar. Rate-limit + contraseña (se limpia al acertar, para
  // que moderar varias firmas seguidas no agote el límite).
  if (!(await checkRateLimit(ip, RATE_PREFIX))) {
    return Response.json({ error: "Demasiados intentos. Espera 30 minutos." }, { status: 429 });
  }
  if (!passwordOk(password)) {
    return Response.json({ error: "Clave incorrecta" }, { status: 401 });
  }
  await clearRateLimit(ip, RATE_PREFIX);

  if (action === "list") {
    return Response.json(await listAll());
  }
  if (typeof id !== "string" || id.length === 0) {
    return Response.json({ error: "Falta el id" }, { status: 400 });
  }
  if (action === "hide") {
    await setHidden(id, true);
    return Response.json({ ok: true });
  }
  if (action === "show") {
    await setHidden(id, false);
    return Response.json({ ok: true });
  }
  if (action === "delete") {
    await remove(id);
    return Response.json({ ok: true });
  }
  return Response.json({ error: "Acción inválida" }, { status: 400 });
}
