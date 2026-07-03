// Da por bueno un descuento inferido sin cambiar su valor: apaga `inferido` en el
// blob farma:descuentos. Mismo read-modify-write que /descuento. Solo admin.
import { getRol } from "../../../auth";
import { cargarDescuentos, guardarDescuentos } from "@/lib/farma/descuentos-store";

export async function POST(request: Request): Promise<Response> {
  if ((await getRol()) !== "admin") {
    return Response.json({ error: "No autorizado" }, { status: 403 });
  }

  let body: { principio?: unknown; lab?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 });
  }
  const { principio, lab } = body;
  if (typeof principio !== "string" || typeof lab !== "string") {
    return Response.json({ error: "principio y lab requeridos" }, { status: 400 });
  }

  const data = await cargarDescuentos();
  const fila = data[principio]?.find((l) => l.lab === lab);
  if (!fila) {
    return Response.json({ error: "Principio o lab desconocido" }, { status: 404 });
  }

  fila.inferido = false;
  await guardarDescuentos(data);
  return Response.json({ ok: true });
}
