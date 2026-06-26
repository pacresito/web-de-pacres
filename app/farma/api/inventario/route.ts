// Subida de inventario (admin). Una sola subida alimenta Pedidos y PVP:
//   1. parsea el .xls (firma de fila, cubre los 3 formatos),
//   2. guarda de carga (#7): si los artículos/unidades quedan fuera de rango,
//      responde `estado: "aviso"` (confirmable) o `"bloqueo"` (duro) SIN escribir,
//   3. reescribe el snapshot de stock (farma:stock) y los metadatos (farma:meta),
//   4. diff de PVP contra el histórico (farma:pvp): marca `pending` lo que cambió,
//   5. cuenta la acción,
// y responde `estado: "ok"` con el delta de confirmación (±artículos vs la subida
// anterior + total + unidades), un chequeo rápido de que el parseo fue bien. El
// recálculo de pedidos lo hace la página al refrescar, no hace falta devolverlo.
import { getRol } from "../../auth";
import redis from "@/lib/redis";
import { KEYS } from "@/lib/farma/keys";
import { parseInventario, evaluarCarga, totalUnidades, type ArticuloInventario } from "@/lib/farma/inventario";
import { incrStat } from "@/lib/farma/stats";
import type { RegistroPvp } from "@/lib/farma/pvp";

// Aplica el diff de PVP de un artículo contra su histórico. Devuelve el registro
// actualizado: primera vez = línea base sin cambio; mismo precio = solo refresca
// lastSeen; precio distinto = el anterior pasa a oldPrice y queda pendiente.
function diffPvp(art: ArticuloInventario, fecha: string, previo: RegistroPvp | null): RegistroPvp {
  if (!previo) {
    return { denominacion: art.denominacion, oldPrice: art.pvp, newPrice: art.pvp, firstSeen: fecha, lastSeen: fecha, pending: false };
  }
  if (art.pvp === previo.newPrice) {
    return { ...previo, denominacion: art.denominacion, lastSeen: fecha };
  }
  return { denominacion: art.denominacion, oldPrice: previo.newPrice, newPrice: art.pvp, firstSeen: fecha, lastSeen: fecha, pending: true };
}

export async function POST(request: Request): Promise<Response> {
  if ((await getRol()) !== "admin") {
    return Response.json({ error: "No autorizado" }, { status: 403 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "Falta el archivo de inventario" }, { status: 400 });
  }

  let items: ArticuloInventario[];
  let fechaInforme: string;
  try {
    const inv = parseInventario(Buffer.from(await file.arrayBuffer()));
    items = inv.items;
    fechaInforme = inv.fechaInforme;
  } catch (err) {
    console.error("parseInventario falló:", err);
    return Response.json({ error: "No se pudo leer el inventario" }, { status: 422 });
  }
  if (items.length === 0) {
    return Response.json({ error: "El inventario no tiene artículos: ¿formato correcto?" }, { status: 422 });
  }

  // Guarda de carga (#7): rangos esperados de un inventario completo.
  const articulos = items.length;
  const unidades = totalUnidades(items);
  const veredicto = evaluarCarga(articulos, unidades);
  const confirmar = form?.get("confirmar") === "true"; // el aviso lo confirma María; el bloqueo es duro
  if (veredicto === "bloqueo" || (veredicto === "aviso" && !confirmar)) {
    return Response.json({ estado: veredicto, articulos, unidades });
  }

  // Delta de confirmación contra la subida anterior.
  const metaRaw = await redis.get(KEYS.meta());
  const totalPrevio: number | null = metaRaw ? JSON.parse(metaRaw).totalArticulos : null;

  // Snapshot de stock: se reescribe entero (DEL + HSET en pipeline).
  const stockFlat = Object.fromEntries(items.map((a) => [a.codigo, a.stock]));

  // Diff de PVP contra el histórico.
  const pvpPrevio = await redis.hgetall(KEYS.pvp());
  const pvpFlat: Record<string, string> = {};
  for (const art of items) {
    const previo = pvpPrevio[art.codigo] ? (JSON.parse(pvpPrevio[art.codigo]) as RegistroPvp) : null;
    pvpFlat[art.codigo] = JSON.stringify(diffPvp(art, fechaInforme, previo));
  }

  const pipe = redis.pipeline();
  pipe.del(KEYS.stock());
  pipe.hset(KEYS.stock(), stockFlat);
  pipe.hset(KEYS.pvp(), pvpFlat);
  pipe.set(KEYS.meta(), JSON.stringify({ fechaInforme, loadedAt: Date.now(), totalArticulos: articulos, unidades }));
  await pipe.exec();

  await incrStat("inventario-subido");

  return Response.json({
    estado: "ok",
    fechaInforme,
    totalArticulos: articulos,
    unidades,
    delta: totalPrevio === null ? null : articulos - totalPrevio,
  });
}
