import { Client } from "@upstash/qstash";
import { avisosDeLaNoche } from "@/app/apps/observatorio/avisos";
import { cielo } from "@/app/apps/observatorio/engine";
import { cargarSatelites } from "@/app/apps/observatorio/tle";
import { urlDeEntrega, urlDeFallo } from "@/lib/avisar";
import { comparaSecreto } from "@/lib/secreto";

// El cron diario del observatorio: a mediodía calcula la noche que viene y deja programado en
// QStash un aviso por evento.
//
// Quien da la voz es QStash, no este cron: en plan Hobby los cron de Vercel corren una vez al
// día y con una hora de imprecisión, así que sirven para preparar la noche, no para avisar a
// las 21:54. Un solo disparo diario cubre el marco entero (19:00–01:00) porque se lanza mucho
// antes de que abra.
//
// El mensaje viaja redactado desde aquí: a la hora del aviso no debe quedar nada que calcular,
// ni un TLE que descargar, ni una efeméride que resolver.

export async function GET(request: Request) {
  const cabecera = request.headers.get("authorization") ?? "";
  if (!comparaSecreto(cabecera.replace("Bearer ", ""), process.env.CRON_SECRET)) {
    return new Response("No autorizado", { status: 401 });
  }

  const token = process.env.QSTASH_TOKEN;
  if (!token) {
    throw new Error("QSTASH_TOKEN no está definida — revisa las variables de entorno.");
  }

  const ahora = Date.now();
  const avisos = avisosDeLaNoche(cielo(await cargarSatelites(), new Date(ahora)), ahora);

  const qstash = new Client({ token });
  await Promise.all(
    avisos.map((aviso) =>
      qstash.publishJSON({
        url: urlDeEntrega(request),
        failureCallback: urlDeFallo(request),
        body: { texto: aviso.texto },
        notBefore: Math.floor(aviso.sale / 1000),
        // Con el id fijado por el evento, una segunda invocación del cron no duplica avisos.
        deduplicationId: aviso.id,
      }),
    ),
  );

  return Response.json({ programados: avisos.map((aviso) => aviso.id) });
}
