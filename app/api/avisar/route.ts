import { avisarUnaVez, cuerpoFirmado } from "@/lib/avisar";

// La entrega de un aviso: recibe el texto ya redactado y lo manda al móvil. No calcula nada
// ni sabe de qué avisa —eso lo decide quien lo programó en QStash horas antes—, así que un
// aviso nuevo se suma escribiendo su programador y sin tocar esta ruta.

export async function POST(request: Request) {
  const cuerpo = await cuerpoFirmado(request);
  if (cuerpo === null) {
    return new Response("Firma inválida", { status: 401 });
  }

  let texto: unknown;
  let id: unknown;
  try {
    ({ texto, id } = JSON.parse(cuerpo));
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 });
  }
  if (typeof texto !== "string" || texto.length === 0) {
    return Response.json({ error: "Aviso sin texto" }, { status: 400 });
  }
  // El id lo pone quien programa, y es lo que distingue un aviso de su propio reintento.
  if (typeof id !== "string" || id.length === 0) {
    return Response.json({ error: "Aviso sin id" }, { status: 400 });
  }

  return Response.json({ ok: true, repetido: !(await avisarUnaVez(id, texto)) });
}
