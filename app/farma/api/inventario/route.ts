// Subida de inventario (admin). Una sola subida alimenta Pedidos y PVP:
//   1. parsea el .xls (firma de fila, cubre los formatos de UnycopWin),
//   2. exige el desglose por familia (para el IVA): si no viene, responde
//      `estado: "formato"` SIN escribir nada,
//   3. guarda de carga (#7): si los artículos/unidades quedan fuera de rango,
//      responde `estado: "aviso"` (confirmable) o `"bloqueo"` (duro) SIN escribir,
//   4. reescribe el snapshot de stock (farma:stock) y los metadatos (farma:meta),
//   5. diff de PVP contra el histórico (farma:pvp): marca `pending` lo que cambió
//      (excepto medicamentos, ver `diffPvp`),
//   6. cuenta la acción,
// y responde `estado: "ok"` con el delta de confirmación (±artículos vs la subida
// anterior + total + unidades), un chequeo rápido de que el parseo fue bien. El
// recálculo de pedidos lo hace la página al refrescar, no hace falta devolverlo.
import { getRol } from "../../auth";
import redis from "@/lib/redis";
import { KEYS } from "@/lib/farma/keys";
import { parseInventario, evaluarCarga, totalUnidades, esEspecialidad, RANGO_BLOQUEO, type ArticuloInventario } from "@/lib/farma/inventario";
import { registrarMetrica, registrarErrorInventario } from "@/lib/farma/metricas";
import { diffPvp, type RegistroPvp } from "@/lib/farma/pvp";

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
  let formato: "familia" | "otro";
  try {
    const inv = parseInventario(Buffer.from(await file.arrayBuffer()));
    items = inv.items;
    fechaInforme = inv.fechaInforme;
    formato = inv.formato;
  } catch (err) {
    console.error("parseInventario falló:", err);
    await registrarErrorInventario("no se pudo leer");
    return Response.json({ error: "No se pudo leer el inventario" }, { status: 422 });
  }
  if (items.length === 0) {
    await registrarErrorInventario("sin artículos");
    return Response.json({ error: "El inventario no tiene artículos: ¿formato correcto?" }, { status: 422 });
  }

  // El diff de PVP necesita la familia fiscal (para excluir medicamentos, 4%). El
  // inventario detallado normal ya la trae; un listado sin ella o el "por categoría"
  // (categorías comerciales, sin medicamentos → incompleto) no. Sin familia no se toca
  // NADA (ni stock): se rechaza y se pide el informe por familia.
  if (formato !== "familia") {
    await registrarErrorInventario("formato sin familia");
    return Response.json({ estado: "formato" });
  }

  // Guarda de carga (#7): rangos esperados de un inventario completo.
  const articulos = items.length;
  const unidades = totalUnidades(items);
  const veredicto = evaluarCarga(articulos, unidades);
  const confirmar = form?.get("confirmar") === "true"; // el aviso lo confirma María; el bloqueo es duro
  if (veredicto === "bloqueo" || (veredicto === "aviso" && !confirmar)) {
    // Solo el bloqueo es un rechazo duro; el aviso es un checkpoint que María reenvía
    // confirmado, así que no se cuenta como error (si no, contaría dos veces).
    if (veredicto === "bloqueo") await registrarErrorInventario("carga fuera de rango");
    return Response.json({ estado: veredicto, articulos, unidades, limites: RANGO_BLOQUEO });
  }

  // Delta de confirmación contra la subida anterior (artículos y unidades).
  const metaRaw = await redis.get(KEYS.meta());
  const metaPrevio = metaRaw ? JSON.parse(metaRaw) : null;
  const totalPrevio: number | null = metaPrevio?.totalArticulos ?? null;
  const unidadesPrevio: number | null = metaPrevio?.unidades ?? null;

  // Snapshot de stock: se reescribe entero (DEL + HSET en pipeline).
  const stockFlat = Object.fromEntries(items.map((a) => [a.codigo, a.stock]));

  // Diff de PVP contra el histórico.
  const pvpPrevio = await redis.hgetall(KEYS.pvp());
  const pvpFlat: Record<string, string> = {};
  for (const art of items) {
    const previo = pvpPrevio[art.codigo] ? (JSON.parse(pvpPrevio[art.codigo]) as RegistroPvp) : null;
    pvpFlat[art.codigo] = JSON.stringify(diffPvp(art.denominacion, art.pvp, fechaInforme, previo, !esEspecialidad(art)));
  }

  const pipe = redis.pipeline();
  pipe.del(KEYS.stock());
  pipe.hset(KEYS.stock(), stockFlat);
  pipe.hset(KEYS.pvp(), pvpFlat);
  pipe.set(KEYS.meta(), JSON.stringify({ fechaInforme, loadedAt: Date.now(), totalArticulos: articulos, unidades }));
  await pipe.exec();

  await registrarMetrica("inventario:subida-ok");

  return Response.json({
    estado: "ok",
    fechaInforme,
    totalArticulos: articulos,
    unidades,
    delta: totalPrevio === null ? null : articulos - totalPrevio,
    deltaUnidades: unidadesPrevio === null ? null : unidades - unidadesPrevio,
  });
}
