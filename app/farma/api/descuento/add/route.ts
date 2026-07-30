// Alta de un descuento (principio, lab, dosis, valor) en el blob mutable farma:descuentos:
// añade un laboratorio a un principio que ya existe. Tres reglas, validadas contra el
// blob (no se fía del cliente): el principio debe existir, el lab debe existir (en algún
// principio) y la combinación (principio, lab, dosis) NO debe existir todavía —un lab
// puede repetirse en el principio si la dosis es distinta: ese es el caso que la dosis
// viene a cubrir—. No crea principios ni laboratorios nuevos —eso es tarea de Pablo por el
// pipeline—. Única admin = María, sin concurrencia → read-modify-write directo. Solo admin.
import { getRol } from "../../../auth";
import { cargarDescuentos, guardarDescuentos } from "@/lib/farma/descuentos-store";
import { mismaEntrada } from "@/lib/farma/prioridades";
import { leerDosis } from "../../dosis";

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
  const labsDelPrincipio = data[principio];
  if (!labsDelPrincipio) {
    return Response.json({ error: "El principio activo no existe" }, { status: 404 });
  }
  const labExiste = Object.values(data).some((labs) => labs.some((l) => l.lab === lab));
  if (!labExiste) {
    return Response.json({ error: "El laboratorio no existe" }, { status: 404 });
  }
  if (labsDelPrincipio.some((l) => mismaEntrada(l, lab, dosis))) {
    return Response.json(
      { error: dosis ? "Ese laboratorio ya tiene esa dosis" : "Ese laboratorio ya tiene este principio" },
      { status: 409 },
    );
  }

  labsDelPrincipio.push({ lab, dosis, descuento: valor, inferido: false });
  await guardarDescuentos(data);
  return Response.json({ ok: true });
}
