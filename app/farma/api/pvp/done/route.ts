// Marca PVP como reetiquetado (admin): apaga el flag `pending` en farma:pvp, de
// todas las líneas pendientes o de una sola (body {codigo} opcional). El newPrice
// ya es la línea base del próximo diff, así que basta con apagar pending. Cuenta la
// acción solo si limpió algo (no infla el contador con no-ops). Solo admin.
import { getRol } from "../../../auth";
import redis from "@/lib/redis";
import { KEYS } from "@/lib/farma/keys";
import { incrStat } from "@/lib/farma/stats";
import type { RegistroPvp } from "@/lib/farma/pvp";

export async function POST(request: Request): Promise<Response> {
  if ((await getRol()) !== "admin") {
    return Response.json({ error: "No autorizado" }, { status: 403 });
  }

  let body: { codigo?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 });
  }

  const pvp = await redis.hgetall(KEYS.pvp());
  // Uno solo (si se pasa código) o todos los pendientes.
  const codigos = typeof body.codigo === "string" ? [body.codigo] : Object.keys(pvp);

  const pipe = redis.pipeline();
  let limpiados = 0;
  for (const codigo of codigos) {
    const raw = pvp[codigo];
    if (!raw) continue;
    const reg = JSON.parse(raw) as RegistroPvp;
    if (!reg.pending) continue;
    pipe.hset(KEYS.pvp(), codigo, JSON.stringify({ ...reg, pending: false }));
    limpiados++;
  }

  if (limpiados > 0) {
    await pipe.exec();
    await incrStat("pvp-actualizado");
  }
  return Response.json({ ok: true, limpiados });
}
