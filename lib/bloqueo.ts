// El aviso por email de que el rate limit ha dejado fuera a una IP. Lo dispara
// `checkRateLimit` y no cada ruta: bloquear es cosa suya, así que una funcionalidad nueva
// que lo use avisa sin saber que esto existe — y no hay forma de bloquear en silencio.
import { sendEmail, type SendEmailOptions } from "./notify";
import { emailTerminal } from "./email-terminal";

export interface Bloqueo {
  /** Nombre del contador (`login:arbol`, `guestbook`…): es lo que dice qué se ha bloqueado. */
  nombre: string;
  ip: string;
  /** La clave de Redis tal cual: borrarla es lo único que desbloquea antes de tiempo. */
  key: string;
  intentos: number;
  max: number;
  /** Segundos que dura el bloqueo desde el primer intento. */
  ttl: number;
  cuando: Date;
}

/** Un header de geolocalización de Vercel. Los manda percent-encodeados —la ciudad llega
 *  como `Palma%20de%20Mallorca`—, y en local no llega ninguno. */
function geo(request: Request, campo: string): string | null {
  const valor = request.headers.get(`x-vercel-ip-${campo}`)?.trim();
  if (!valor) return null;
  try {
    return decodeURIComponent(valor);
  } catch {
    return valor;
  }
}

/** Lugar legible, o nada: en local no llega ninguna cabecera de geolocalización. */
function lugarDe(request: Request): string | null {
  return [geo(request, "city"), geo(request, "country-region"), geo(request, "country")]
    .filter(Boolean)
    .join(", ") || null;
}

/** Redacta el aviso. Separado del envío para poder leerlo sin mandar nada. */
export function redactarAviso(request: Request, b: Bloqueo): SendEmailOptions {
  const lugar = lugarDe(request);
  const minutos = Math.round(b.ttl / 60);

  return emailTerminal(`Bloqueo en ${b.nombre} — ${b.ip}${lugar ? ` (${lugar})` : ""}`, {
    titulo: "rate limit",
    comando: `bloqueo ${b.nombre} --ip ${b.ip}`,
    entrada: "Una IP ha superado el límite de intentos y está bloqueada.",
    filas: [
      ["Qué", `${b.nombre} — ${request.method} ${new URL(request.url).pathname}`],
      ["IP", b.ip],
      ["Dónde", lugar],
      ["Zona", geo(request, "timezone")],
      ["Cuándo", `${b.cuando.toLocaleString("es-ES", { timeZone: "Europe/Madrid", dateStyle: "full", timeStyle: "medium" })} (Madrid)`],
      ["Intentos", `${b.intentos} (el límite son ${b.max} cada ${minutos} min)`],
      ["Bloqueada", `${minutos} min desde el primer intento; luego se abre sola`],
      ["Navegador", request.headers.get("user-agent")],
      ["Idioma", request.headers.get("accept-language")],
      ["Viene de", request.headers.get("referer")],
    ],
    nota: "Para abrirla ya, borra su contador en Redis:",
    bloque: `DEL ${b.key}`,
  });
}

export async function avisarBloqueo(request: Request, b: Bloqueo): Promise<void> {
  await sendEmail(redactarAviso(request, b));
}
