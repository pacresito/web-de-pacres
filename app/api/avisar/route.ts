import { Receiver } from "@upstash/qstash";
import { enviarTelegram } from "@/lib/telegram";

// La entrega de un aviso: recibe el texto ya redactado y lo manda al móvil. No calcula nada
// ni sabe de qué avisa —eso lo decide quien lo programó en QStash horas antes—, así que un
// aviso nuevo se suma escribiendo su programador y sin tocar esta ruta.
//
// La firma de QStash no es opcional: sin ella esta URL es un megáfono a mi móvil para
// cualquiera que la descubra.

export async function POST(request: Request) {
  const { QSTASH_CURRENT_SIGNING_KEY, QSTASH_NEXT_SIGNING_KEY } = process.env;
  if (!QSTASH_CURRENT_SIGNING_KEY || !QSTASH_NEXT_SIGNING_KEY) {
    throw new Error("Las claves de firma de QStash no están definidas — revisa las variables de entorno.");
  }

  const firma = request.headers.get("upstash-signature");
  if (!firma) {
    return new Response("Falta la firma", { status: 401 });
  }

  // El cuerpo se lee crudo: la firma cubre los bytes tal cual llegaron, no el objeto parseado.
  const cuerpo = await request.text();
  const receptor = new Receiver({
    currentSigningKey: QSTASH_CURRENT_SIGNING_KEY,
    nextSigningKey: QSTASH_NEXT_SIGNING_KEY,
  });
  try {
    await receptor.verify({ signature: firma, body: cuerpo });
  } catch {
    return new Response("Firma inválida", { status: 401 });
  }

  const { texto } = JSON.parse(cuerpo);
  if (typeof texto !== "string" || texto.length === 0) {
    return Response.json({ error: "Aviso sin texto" }, { status: 400 });
  }

  await enviarTelegram(texto);
  return Response.json({ ok: true });
}
