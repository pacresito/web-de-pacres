// Ficha un pedido como hecho (admin): María marca un pedido que ya cursó. Pasa a
// "Pedidos ya hechos" hasta que un inventario lo resuelva o pasen 5 días con rotura
// (lógica en calcularPedidos). Solo guarda el epoch del check.
import { getRol } from "../../../auth";
import redis from "@/lib/redis";
import { KEYS } from "@/lib/farma/keys";
import { incrStat } from "@/lib/farma/stats";

export async function POST(request: Request): Promise<Response> {
  if ((await getRol()) !== "admin") {
    return Response.json({ error: "No autorizado" }, { status: 403 });
  }

  let body: { pedido?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 });
  }
  if (typeof body.pedido !== "string" || body.pedido.trim() === "") {
    return Response.json({ error: "pedido requerido" }, { status: 400 });
  }

  await redis.hset(KEYS.pedidosHechos(), body.pedido, Date.now());
  await incrStat("pedido-hecho");
  return Response.json({ ok: true });
}
