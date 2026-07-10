// Marca un pedido como descargado (admin): lo dispara la descarga del .xls, no un check
// manual. Pasa a "Pedidos descargados" hasta que un inventario lo reponga del todo o
// pasen 5 días (lógica en calcularPedidos). Solo guarda el epoch de la descarga.
import { getRol } from "../../../auth";
import redis from "@/lib/redis";
import { KEYS } from "@/lib/farma/keys";
import { registrarMetrica } from "@/lib/farma/metricas";

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
  await registrarMetrica("pedidos:descargas");
  return Response.json({ ok: true });
}
