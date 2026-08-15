import { Client } from "@upstash/qstash";
import { urlDeEntrega, urlDeFallo } from "@/lib/avisar";
import { avisoDeVispera } from "@/lib/arbol/aviso";
import { construirGrafo } from "@/lib/arbol/grafo";
import { KEYS } from "@/lib/arbol/keys";
import type { ArbolData } from "@/lib/arbol/tree";
import redis from "@/lib/redis";
import { comparaSecreto } from "@/lib/secreto";

// El cron diario del árbol: por la mañana mira qué celebra mañana la familia y deja programado
// en QStash el aviso de las diez de la noche.
//
// Quien da la voz es QStash, no este cron: en plan Hobby los cron de Vercel corren una vez al
// día y con una hora de imprecisión, así que sirven para dejar la noche preparada, no para
// avisar a las 22:00. El mismo reparto que el observatorio, y la misma entrega.
//
// A quién se felicita y qué se le dice no se decide aquí: esto saca el árbol de Redis y deja el
// mensaje en la cola, nada más.

export async function GET(request: Request) {
  const cabecera = request.headers.get("authorization") ?? "";
  if (!comparaSecreto(cabecera.replace("Bearer ", ""), process.env.CRON_SECRET)) {
    return new Response("No autorizado", { status: 401 });
  }

  const token = process.env.QSTASH_TOKEN;
  if (!token) {
    throw new Error("QSTASH_TOKEN no está definida — revisa las variables de entorno.");
  }

  // El día se lee en Madrid y no en el reloj del servidor, que va en UTC: entre las 00:00 y
  // las 02:00 de allí sigue siendo ayer aquí, y el aviso saldría con un día de retraso.
  const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Madrid" });
  const guardado = await redis.get(KEYS.datos());
  if (!guardado) throw new Error(`Redis no tiene ${KEYS.datos()}: el árbol no está sembrado en este entorno.`);
  const datos: ArbolData = JSON.parse(guardado);

  const aviso = avisoDeVispera(construirGrafo(datos), hoy);
  if (!aviso) return Response.json({ programados: [] });

  await new Client({ token }).publishJSON({
    url: urlDeEntrega(request),
    failureCallback: urlDeFallo(request),
    body: { texto: aviso.texto },
    notBefore: Math.floor(aviso.sale / 1000),
    deduplicationId: aviso.id,
  });

  return Response.json({ programados: [aviso.id] });
}
