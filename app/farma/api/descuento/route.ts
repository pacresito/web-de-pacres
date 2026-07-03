// Edita un descuento (principio, lab) en el blob mutable farma:descuentos y apaga
// el flag `inferido` (pasa a validado por María). Única admin = María, sin
// concurrencia → read-modify-write directo del blob. Solo admin.
import { getRol } from "../../auth";
import { cargarDescuentos, guardarDescuentos } from "@/lib/farma/descuentos-store";

export async function POST(request: Request): Promise<Response> {
  if ((await getRol()) !== "admin") {
    return Response.json({ error: "No autorizado" }, { status: 403 });
  }

  let body: { principio?: unknown; lab?: unknown; valor?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 });
  }
  const { principio, lab, valor } = body;
  if (typeof principio !== "string" || typeof lab !== "string") {
    return Response.json({ error: "principio y lab requeridos" }, { status: 400 });
  }
  if (typeof valor !== "number" || !Number.isFinite(valor) || valor < 0 || valor > 100) {
    return Response.json({ error: "Descuento entre 0 y 100" }, { status: 400 });
  }

  const data = await cargarDescuentos();
  const fila = data[principio]?.find((l) => l.lab === lab);
  if (!fila) {
    return Response.json({ error: "Principio o lab desconocido" }, { status: 404 });
  }

  fila.descuento = valor;
  fila.inferido = false;
  await guardarDescuentos(data);
  return Response.json({ ok: true });
}
