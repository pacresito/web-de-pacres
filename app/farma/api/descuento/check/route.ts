// Da por bueno un descuento inferido sin cambiar su valor: apaga `inferido` en el
// blob farma:descuentos. Mismo read-modify-write que /descuento. Solo admin.
import { getRol } from "../../../auth";
import { cargarDescuentos, guardarDescuentos, labsDe } from "@/lib/farma/descuentos-store";
import { mismaEntrada } from "@/lib/farma/prioridades";
import { leerDosis } from "../../dosis";

export async function POST(request: Request): Promise<Response> {
  if ((await getRol()) !== "admin") {
    return Response.json({ error: "No autorizado" }, { status: 403 });
  }

  let body: { principio?: unknown; lab?: unknown; dosis?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 });
  }
  const { principio, lab } = body;
  if (typeof principio !== "string" || typeof lab !== "string") {
    return Response.json({ error: "principio y lab requeridos" }, { status: 400 });
  }
  const dosis = leerDosis(body.dosis);
  if (dosis instanceof Error) {
    return Response.json({ error: dosis.message }, { status: 400 });
  }

  const data = await cargarDescuentos();
  const fila = labsDe(data, principio)?.find((l) => mismaEntrada(l, lab, dosis));
  if (!fila) {
    return Response.json({ error: "Principio o lab desconocido" }, { status: 404 });
  }

  fila.inferido = false;
  await guardarDescuentos(data);
  return Response.json({ ok: true });
}
