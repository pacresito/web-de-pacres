// Borra una entrada de descuento del blob mutable farma:descuentos. Solo entradas CON
// dosis: son las que da de alta María a mano, así que también las puede deshacer. Las
// genéricas vienen del pipeline y el seed las repondría —para bajar un lab de un principio,
// la tarifa nueva—. Única admin = María, sin concurrencia → read-modify-write. Solo admin.
import { getRol } from "../../../auth";
import { cargarDescuentos, guardarDescuentos } from "@/lib/farma/descuentos-store";
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
  if (!dosis) {
    return Response.json({ error: "Solo se borran los descuentos con dosis" }, { status: 400 });
  }

  const data = await cargarDescuentos();
  const labs = data[principio];
  const i = labs?.findIndex((l) => mismaEntrada(l, lab, dosis)) ?? -1;
  if (i === -1) {
    return Response.json({ error: "Principio o lab desconocido" }, { status: 404 });
  }

  labs.splice(i, 1);
  await guardarDescuentos(data);
  return Response.json({ ok: true });
}
