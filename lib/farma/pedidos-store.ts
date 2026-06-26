// Carga el estado de Pedidos desde Redis y lo recalcula. Lo comparten la página
// /farma/maria (lo pinta) y la ruta de descarga xls (saca la bolsa de un lab):
// ambas parten del mismo snapshot, así que el read-and-compute vive en un sitio.
import redis from "@/lib/redis";
import { KEYS } from "./keys";
import {
  bolsaDeLab,
  calcularPedidos,
  listarLabs,
  type BolsaLab,
  type RefPedidos,
  type ResultadoPedidos,
} from "./pedidos";

export interface MetaInventario {
  fechaInforme: string;
  loadedAt: number;
  totalArticulos: number;
  unidades: number; // suma de existencias del último inventario (guarda de carga + panel)
}

export interface EstadoPedidos {
  resultado: ResultadoPedidos;
  meta: MetaInventario | null; // null hasta la primera subida de inventario
  pvpCambiados: number; // artículos con cambio de PVP pendiente de reetiquetar
  labs: string[]; // todos los pedidos del universo (buscador del pedido manual, B5)
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
  const stMin = numHash(stmin);
  const resultado = calcularPedidos(numHash(stock), refPedidos, stMin, numHash(hechos), now);
  const pvpCambiados = Object.values(pvp).filter((v) => JSON.parse(v).pending).length;

  return {
    resultado,
    meta: metaRaw ? JSON.parse(metaRaw) : null,
    pvpCambiados,
    labs: listarLabs(refPedidos, stMin),
  };
}

// Bolsa de un pedido concreto recalculada desde el snapshot, sin exigir la condición
// #1 (la usa el pedido manual de B5 y, como fallback, la descarga del .xls). Devuelve
// null si en ese lab no hay nada que pedir.
export async function cargarBolsaManual(lab: string): Promise<BolsaLab | null> {
  const [refRaw, stock, stmin] = await Promise.all([
    redis.get(KEYS.refPedidos()),
    redis.hgetall(KEYS.stock()),
    redis.hgetall(KEYS.stmin()),
  ]);
  const refPedidos: RefPedidos = refRaw ? JSON.parse(refRaw) : {};
  return bolsaDeLab(lab, numHash(stock), refPedidos, numHash(stmin));
}
