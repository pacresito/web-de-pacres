// Guarda el borrador de etiquetado de PVP (tamaño/cantidad por línea + líneas
// manuales) en farma:pvp-etiquetas para que sobreviva a las recargas. Autosave desde
// <Pvp>; única admin = María, sin concurrencia → set directo del blob saneado. La
// carga inicial la hace la página (server component), no este endpoint. Solo admin.
import { getRol } from "../../../auth";
import { sanearBorrador } from "@/lib/farma/pvp";
import { guardarBorradorEtiquetas } from "@/lib/farma/pvp-store";

export async function POST(request: Request): Promise<Response> {
  if ((await getRol()) !== "admin") {
    return Response.json({ error: "No autorizado" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 });
  }

  await guardarBorradorEtiquetas(sanearBorrador(body));
  return Response.json({ ok: true });
}
