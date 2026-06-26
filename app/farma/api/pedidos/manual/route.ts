// Pedido manual (B5, admin): devuelve la bolsa de un pedido recalculada desde el
// snapshot aunque no cumpla la condición #1 (rotura + ≥6 líneas). El buscador de
// Pedidos la pide al elegir un pedido; null si no hay nada que pedir.
import { getRol } from "../../../auth";
import { cargarBolsaManual } from "@/lib/farma/pedidos-store";

export async function GET(request: Request): Promise<Response> {
  if ((await getRol()) !== "admin") {
    return Response.json({ error: "No autorizado" }, { status: 403 });
  }

  const pedido = new URL(request.url).searchParams.get("pedido");
  if (!pedido) {
    return Response.json({ error: "pedido requerido" }, { status: 400 });
  }

  return Response.json({ bolsa: await cargarBolsaManual(pedido) });
}
