// Alta de un descuento (principio, lab, valor) en el blob mutable farma:descuentos:
// añade un laboratorio a un principio que ya existe. Tres reglas, validadas contra el
// blob (no se fía del cliente): el principio debe existir, el lab debe existir (en algún
// principio) y la combinación (principio, lab) NO debe existir todavía. No crea principios
// ni laboratorios nuevos —eso es tarea de Pablo por el pipeline—. Única admin = María, sin
// concurrencia → read-modify-write directo. Solo admin.
import { getRol } from "../../../auth";
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
  const labsDelPrincipio = data[principio];
  if (!labsDelPrincipio) {
    return Response.json({ error: "El principio activo no existe" }, { status: 404 });
  }
  const labExiste = Object.values(data).some((labs) => labs.some((l) => l.lab === lab));
  if (!labExiste) {
    return Response.json({ error: "El laboratorio no existe" }, { status: 404 });
  }
  if (labsDelPrincipio.some((l) => l.lab === lab)) {
    return Response.json({ error: "Ese laboratorio ya tiene este principio" }, { status: 409 });
  }

  labsDelPrincipio.push({ lab, descuento: valor, inferido: false });
  await guardarDescuentos(data);
  return Response.json({ ok: true });
}
