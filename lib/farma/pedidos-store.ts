// Carga el estado de Pedidos desde Redis y lo recalcula. Lo comparten la página
// /farma/maria (lo pinta) y la ruta de descarga xls (saca la bolsa de un lab):
// ambas parten del mismo snapshot, así que el read-and-compute vive en un sitio.
import redis from "@/lib/redis";
import { KEYS } from "./keys";
import { calcularPedidos, type RefPedidos, type ResultadoPedidos } from "./pedidos";

export interface MetaInventario {
  fechaInforme: string;
  loadedAt: number;
  totalArticulos: number;
}

export interface EstadoPedidos {
  resultado: ResultadoPedidos;
  meta: MetaInventario | null; // null hasta la primera subida de inventario
  pvpCambiados: number; // artículos con cambio de PVP pendiente de reetiquetar
}

// Hash de Redis (valores string) → Record<string, number>.
function numHash(h: Record<string, string>): Record<string, number> {
  return Object.fromEntries(Object.entries(h).map(([k, v]) => [k, Number(v)]));
}

export async function cargarEstadoPedidos(now: number = Date.now()): Promise<EstadoPedidos> {
  const [refRaw, metaRaw, stock, stmin, hechos, pvp] = await Promise.all([
    redis.get(KEYS.refPedidos()),
    redis.get(KEYS.meta()),
    redis.hgetall(KEYS.stock()),
    redis.hgetall(KEYS.stmin()),
    redis.hgetall(KEYS.pedidosHechos()),
    redis.hgetall(KEYS.pvp()),
  ]);

  const refPedidos: RefPedidos = refRaw ? JSON.parse(refRaw) : {};
  const resultado = calcularPedidos(numHash(stock), refPedidos, numHash(stmin), numHash(hechos), now);
  const pvpCambiados = Object.values(pvp).filter((v) => JSON.parse(v).pending).length;

  return { resultado, meta: metaRaw ? JSON.parse(metaRaw) : null, pvpCambiados };
}
