// Edita un descuento (principio, lab, dosis) en el blob mutable farma:descuentos y apaga
// el flag `inferido` (pasa a validado por María). Única admin = María, sin
// concurrencia → read-modify-write directo del blob. Solo admin.
import { getRol } from "../../auth";
import { cargarDescuentos, guardarDescuentos } from "@/lib/farma/descuentos-store";
import { mismaEntrada } from "@/lib/farma/prioridades";
import { leerDosis } from "../dosis";

export async function POST(request: Request): Promise<Response> {
  if ((await getRol()) !== "admin") {
    return Response.json({ error: "No autorizado" }, { status: 403 });
  }

  let body: { principio?: unknown; lab?: unknown; dosis?: unknown; valor?: unknown };
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
  const dosis = leerDosis(body.dosis);
  if (dosis instanceof Error) {
    return Response.json({ error: dosis.message }, { status: 400 });
  }

  const data = await cargarDescuentos();
  const fila = data[principio]?.find((l) => mismaEntrada(l, lab, dosis));
  if (!fila) {
    return Response.json({ error: "Principio o lab desconocido" }, { status: 404 });
  }

  fila.descuento = valor;
  fila.inferido = false;
  await guardarDescuentos(data);
  return Response.json({ ok: true });
}
