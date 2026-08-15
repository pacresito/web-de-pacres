import { cuerpoFirmado } from "@/lib/avisar";
import { enviarTelegram } from "@/lib/telegram";

// La entrega de un aviso: recibe el texto ya redactado y lo manda al móvil. No calcula nada
// ni sabe de qué avisa —eso lo decide quien lo programó en QStash horas antes—, así que un
// aviso nuevo se suma escribiendo su programador y sin tocar esta ruta.

export async function POST(request: Request) {
  const cuerpo = await cuerpoFirmado(request);
  if (cuerpo === null) {
    return new Response("Firma inválida", { status: 401 });
  }

  let texto: unknown;
  try {
    ({ texto } = JSON.parse(cuerpo));
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 });
  }
  if (typeof texto !== "string" || texto.length === 0) {
    return Response.json({ error: "Aviso sin texto" }, { status: 400 });
  }

  await enviarTelegram(texto);
  return Response.json({ ok: true });
}
