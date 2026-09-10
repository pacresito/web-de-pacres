import { sendEmail } from "@/lib/notify";
import { emailTerminal } from "@/lib/email-terminal";
import { addEntry, listVisible, NAME_MAX, MESSAGE_MAX } from "@/lib/guestbook";
import { checkRateLimit } from "@/lib/registro";

const SITE = "https://pacr.es";

/** Rechaza mensajes con pinta de spam con enlaces (el caso más común en un input público). */
function looksLikeUrl(text: string): boolean {
  return /https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|io|ru|info|xyz|top|link|shop|click)\b/i.test(text);
}

export async function GET() {
  return Response.json(await listVisible());
}

export async function POST(request: Request) {
  if (!(await checkRateLimit(request, "guestbook"))) {
    return Response.json({ error: "Demasiados envíos. Espera 30 minutos." }, { status: 429 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { name, message, website } = body;

  // Honeypot: un bot rellena el campo oculto «website». Respondemos ok sin guardar.
  if (typeof website === "string" && website.length > 0) {
    return Response.json({ ok: true });
  }

  if (typeof name !== "string" || typeof message !== "string") {
    return Response.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const cleanName = name.trim().slice(0, NAME_MAX);
  const cleanMessage = message.trim().slice(0, MESSAGE_MAX);
  if (cleanName.length === 0 || cleanMessage.length === 0) {
    return Response.json({ error: "Escribe tu nombre y un mensaje." }, { status: 400 });
  }
  if (looksLikeUrl(cleanName) || looksLikeUrl(cleanMessage)) {
    return Response.json({ error: "No se permiten enlaces." }, { status: 400 });
  }

  const entry = await addEntry(cleanName, cleanMessage);

  await sendEmail(
    emailTerminal(`Nueva firma en el guestbook — ${entry.name}`, {
      titulo: "guestbook",
      comando: `guestbook --nueva ${entry.id.slice(0, 8)}`,
      entrada: "Alguien ha firmado el guestbook. Se ha publicado automáticamente.",
      filas: [
        ["Quién", entry.name],
        ["Cuándo", new Date(entry.ts).toLocaleString("es-ES", { timeZone: "Europe/Madrid", dateStyle: "full", timeStyle: "short" })],
      ],
      nota: "Ha escrito:",
      bloque: entry.message,
      enlaces: [
        ["Ocultar esta firma", `${SITE}/guestbook?ocultar=${entry.id}`],
        ["Moderar todas", `${SITE}/guestbook?moderar`],
      ],
    }),
  );

  return Response.json({ ok: true });
}
