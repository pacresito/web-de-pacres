// Fija la lista de recomendados (ventas cruzadas) de un artículo en el blob mutable
// farma:recomendaciones (lo edita María en la pantalla Recomendaciones). Semántica de
// conjunto: el cuerpo trae la lista COMPLETA del artículo origen; lista vacía = se borra
// la entrada. Se valida que origen y recomendados existan en el universo de Ventas (ref)
// para rechazar códigos inventados; se quitan duplicados y la autorreferencia. Única
// admin = María, sin concurrencia → set directo. Solo admin. Calcado de stmin/route.
import { getRol } from "../../auth";
import { cargarRecomendaciones, guardarRecomendaciones } from "@/lib/farma/recomendaciones-store";
import redis from "@/lib/redis";
import { KEYS } from "@/lib/farma/keys";
import type { RefPedidos } from "@/lib/farma/pedidos";

export async function POST(request: Request): Promise<Response> {
  if ((await getRol()) !== "admin") {
    return Response.json({ error: "No autorizado" }, { status: 403 });
  }

  let body: { codigo?: unknown; recomendados?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 });
  }
  const { codigo, recomendados } = body;
  if (typeof codigo !== "string" || codigo.trim() === "") {
    return Response.json({ error: "codigo requerido" }, { status: 400 });
  }
  if (!Array.isArray(recomendados) || recomendados.some((c) => typeof c !== "string")) {
    return Response.json({ error: "recomendados debe ser lista de códigos" }, { status: 400 });
  }

  const refRaw = await redis.get(KEYS.refPedidos());
  const ref: RefPedidos = refRaw ? JSON.parse(refRaw) : {};
  if (!(codigo in ref)) {
    return Response.json({ error: "Artículo desconocido" }, { status: 404 });
  }
  const lista = [...new Set(recomendados as string[])].filter((c) => c !== codigo);
  if (lista.some((c) => !(c in ref))) {
    return Response.json({ error: "Recomendado desconocido" }, { status: 404 });
  }

  const data = await cargarRecomendaciones();
  if (lista.length === 0) delete data[codigo];
  else data[codigo] = lista;
  await guardarRecomendaciones(data);
  return Response.json({ ok: true });
}
