// Ficha un pedido como hecho (admin): María marca un laboratorio cuyo pedido ya
// cursó. Pasa a "Pedidos ya hechos" hasta que un inventario lo resuelva o pasen 5
// días con rotura (lógica en calcularPedidos). Solo guarda el epoch del check.
import { getRol } from "../../../auth";
import redis from "@/lib/redis";
import { KEYS } from "@/lib/farma/keys";
import { incrStat } from "@/lib/farma/stats";

export async function POST(request: Request): Promise<Response> {
  if ((await getRol()) !== "admin") {
    return Response.json({ error: "No autorizado" }, { status: 403 });
  }

  let body: { lab?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 });
  }
  if (typeof body.lab !== "string" || body.lab.trim() === "") {
    return Response.json({ error: "lab requerido" }, { status: 400 });
  }

  await redis.hset(KEYS.pedidosHechos(), body.lab, Date.now());
  await incrStat("pedido-hecho");
  return Response.json({ ok: true });
}
