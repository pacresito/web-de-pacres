// Edita el stock mínimo de un artículo en el hash mutable farma:stmin (lo ajusta
// María en la pantalla Inventario). Única admin = María, sin concurrencia → hset
// directo. El universo editable es todo lo que Inventario muestra: artículos de
// Ventas (ref) —tengan o no stMín— y los que están en stock pero fuera de Ventas
// ("sin historial"). Se valida contra ambos para rechazar códigos inventados. Solo admin.
import { getRol } from "../../auth";
import redis from "@/lib/redis";
import { KEYS } from "@/lib/farma/keys";
import { registrarMetrica } from "@/lib/farma/metricas";
import type { RefPedidos } from "@/lib/farma/pedidos";

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

  const refRaw = await redis.get(KEYS.refPedidos());
  const ref: RefPedidos = refRaw ? JSON.parse(refRaw) : {};
  const conocido = codigo in ref || (await redis.hexists(KEYS.stock(), codigo));
  if (!conocido) {
    return Response.json({ error: "Artículo desconocido" }, { status: 404 });
  }

  await redis.hset(KEYS.stmin(), codigo, valor);
  await registrarMetrica("stmin:ediciones");
  return Response.json({ ok: true });
}
