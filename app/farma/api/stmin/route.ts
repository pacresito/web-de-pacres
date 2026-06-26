// Edita el stock mínimo de un artículo en el hash mutable farma:stmin (lo ajusta
// María en la pantalla Mínimos). Única admin = María, sin concurrencia → hset
// directo. El universo editable son los artículos que ya tienen stock mínimo > 0
// (los sembrados): se valida que el código exista en el hash. Solo admin.
import { getRol } from "../../auth";
import redis from "@/lib/redis";
import { KEYS } from "@/lib/farma/keys";

export async function POST(request: Request): Promise<Response> {
  if ((await getRol()) !== "admin") {
    return Response.json({ error: "No autorizado" }, { status: 403 });
  }

  let body: { codigo?: unknown; valor?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 });
  }
  const { codigo, valor } = body;
  if (typeof codigo !== "string" || codigo.trim() === "") {
    return Response.json({ error: "codigo requerido" }, { status: 400 });
  }
  if (typeof valor !== "number" || !Number.isInteger(valor) || valor < 0) {
    return Response.json({ error: "Stock mínimo entero ≥ 0" }, { status: 400 });
  }

  if (!(await redis.hexists(KEYS.stmin(), codigo))) {
    return Response.json({ error: "Artículo desconocido" }, { status: 404 });
  }

  await redis.hset(KEYS.stmin(), codigo, valor);
  return Response.json({ ok: true });
}
