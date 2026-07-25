// Descarga de un pedido (admin) en el .xls que importa UnycopWin. Baja el catálogo
// ENTERO del pedido recalculado desde el snapshot actual —las referencias que no hay
// que reponer van con cantidad 0—, valga el pedido para pendiente, hecho o manual.
// El nombre es `AAAA-MM-DD Pedido.xls`.
import { getRol } from "../../../auth";
import { cargarLineasPedido, cargarMeta } from "@/lib/farma/pedidos-store";
import { generarBolsa } from "@/lib/farma/xls";

export async function GET(request: Request): Promise<Response> {
  if ((await getRol()) !== "admin") {
    return Response.json({ error: "No autorizado" }, { status: 403 });
  }

  const pedido = new URL(request.url).searchParams.get("pedido");
  if (!pedido) {
    return Response.json({ error: "pedido requerido" }, { status: 400 });
  }

  const [lineas, meta] = await Promise.all([cargarLineasPedido(pedido), cargarMeta()]);
  if (lineas.length === 0) {
    return Response.json({ error: "El pedido no tiene líneas" }, { status: 404 });
  }

  const fecha = meta?.fechaInforme || new Date().toISOString().slice(0, 10);
  const xls = generarBolsa(lineas);
  return new Response(new Uint8Array(xls), {
    headers: {
      "Content-Type": "application/vnd.ms-excel",
      "Content-Disposition": `attachment; filename="${fecha} ${pedido}.xls"`,
    },
  });
}
