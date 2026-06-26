// Descarga la bolsa de un pedido (admin) en el .xls que importa UnycopWin. Recalcula
// los pedidos desde el snapshot actual y saca la bolsa del pedido (pendiente o ya
// hecho); el nombre es `AAAA-MM-DD Pedido.xls`.
import { getRol } from "../../../auth";
import { cargarBolsaManual, cargarEstadoPedidos } from "@/lib/farma/pedidos-store";
import { generarBolsa } from "@/lib/farma/xls";

export async function GET(request: Request): Promise<Response> {
  if ((await getRol()) !== "admin") {
    return Response.json({ error: "No autorizado" }, { status: 403 });
  }

  const pedido = new URL(request.url).searchParams.get("pedido");
  if (!pedido) {
    return Response.json({ error: "pedido requerido" }, { status: 400 });
  }

  const { resultado, meta } = await cargarEstadoPedidos();
  // Pendiente/hecho lo da el estado; si no, es un pedido manual (no cumple #1) y se
  // recalcula su bolsa desde el snapshot. Mismas líneas en ambos casos.
  const bolsa =
    [...resultado.pendientes, ...resultado.hechos].find((b) => b.pedido === pedido) ??
    (await cargarBolsaManual(pedido));
  if (!bolsa) {
    return Response.json({ error: "El pedido no tiene líneas" }, { status: 404 });
  }

  const fecha = meta?.fechaInforme || new Date().toISOString().slice(0, 10);
  const xls = generarBolsa(bolsa.lineas);
  return new Response(new Uint8Array(xls), {
    headers: {
      "Content-Type": "application/vnd.ms-excel",
      "Content-Disposition": `attachment; filename="${fecha} ${pedido}.xls"`,
    },
  });
}
