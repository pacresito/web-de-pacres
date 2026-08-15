import { cuerpoFirmado } from "@/lib/avisar";
import { enviarTelegram } from "@/lib/telegram";

// El aviso que no llegó: QStash llama aquí cuando un mensaje agota sus reintentos, y esta ruta
// lo cuenta por el mismo canal al que iba dirigido.
//
// Existe porque el fallo de entrega es invisible por construcción: quien programa devuelve su OK
// horas antes y a la hora del aviso no hay nadie mirando, así que un aviso que no suena y un
// aviso que nunca existió se parecen demasiado. Va con el texto original dentro: el aviso tarde
// sigue sirviendo, y el error a secas no.

export async function POST(request: Request) {
  const cuerpo = await cuerpoFirmado(request);
  if (cuerpo === null) {
    return new Response("Firma inválida", { status: 401 });
  }

  let fallo: { status?: number; url?: string; sourceBody?: unknown };
  try {
    fallo = JSON.parse(cuerpo);
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 });
  }

  const original = textoDelAviso(fallo.sourceBody);
  const cabecera = `⚠️ <b>Un aviso no se ha entregado</b> (HTTP ${fallo.status})`;
  await enviarTelegram(original ? `${cabecera}. Decía:\n\n${original}` : `${cabecera} — ${fallo.url}`);

  return Response.json({ ok: true });
}

/** El texto del aviso que no salió, que viaja en base64 dentro del fallo. */
function textoDelAviso(sourceBody: unknown): string | null {
  if (typeof sourceBody !== "string") return null;
  try {
    const { texto } = JSON.parse(Buffer.from(sourceBody, "base64").toString());
    return typeof texto === "string" && texto.length > 0 ? texto : null;
  } catch {
    return null;
  }
}
