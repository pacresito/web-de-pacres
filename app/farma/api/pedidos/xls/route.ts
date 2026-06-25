// Descarga la bolsa de pedido de un laboratorio (admin) en el .xls que importa
// UnycopWin. Recalcula los pedidos desde el snapshot actual y saca la bolsa del lab
// (pendiente o ya hecho); el nombre es `AAAA-MM-DD Laboratorio.xls`.
import { getRol } from "../../../auth";
import { cargarEstadoPedidos } from "@/lib/farma/pedidos-store";
import { generarBolsa } from "@/lib/farma/xls";

export async function GET(request: Request): Promise<Response> {
  if ((await getRol()) !== "admin") {
    return Response.json({ error: "No autorizado" }, { status: 403 });
  }

  const lab = new URL(request.url).searchParams.get("lab");
  if (!lab) {
    return Response.json({ error: "lab requerido" }, { status: 400 });
  }

  const { resultado, meta } = await cargarEstadoPedidos();
  const bolsa = [...resultado.pendientes, ...resultado.hechos].find((b) => b.lab === lab);
  if (!bolsa) {
    return Response.json({ error: "El laboratorio no tiene pedido" }, { status: 404 });
  }

  const fecha = meta?.fechaInforme || new Date().toISOString().slice(0, 10);
  const xls = generarBolsa(bolsa.lineas);
  return new Response(new Uint8Array(xls), {
    headers: {
      "Content-Type": "application/vnd.ms-excel",
      "Content-Disposition": `attachment; filename="${fecha} ${lab}.xls"`,
    },
  });
}
