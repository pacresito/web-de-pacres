// Carga el estado de Pedidos desde Redis y lo recalcula. Lo comparten la página
// /farma/maria (lo pinta) y la ruta de descarga xls (saca la bolsa de un pedido):
// ambas parten del mismo snapshot, así que el read-and-compute vive en un sitio.
import redis from "@/lib/redis";
import { KEYS } from "./keys";
import {
  bolsaDePedido,
  calcularPedidos,
  lineasDePedido,
  listarPedidos,
  type BolsaPedido,
  type LineaPedido,
  type PedidosDeCodigo,
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
  pedidos: string[]; // todos los pedidos del universo (buscador del pedido manual, B5)
}

// Hash de Redis (valores string) → Record<string, number>.
function numHash(h: Record<string, string>): Record<string, number> {
  return Object.fromEntries(Object.entries(h).map(([k, v]) => [k, Number(v)]));
}

// Metadatos del último inventario subido (null hasta la primera subida).
export async function cargarMeta(): Promise<MetaInventario | null> {
  const raw = await redis.get(KEYS.meta());
  return raw ? JSON.parse(raw) : null;
}

export async function cargarEstadoPedidos(now: number = Date.now()): Promise<EstadoPedidos> {
  const [refRaw, pedCodRaw, meta, stock, stmin, hechos] = await Promise.all([
    redis.get(KEYS.refPedidos()),
    redis.get(KEYS.pedidoCodigos()),
    cargarMeta(),
    redis.hgetall(KEYS.stock()),
    redis.hgetall(KEYS.stmin()),
    redis.hgetall(KEYS.pedidosHechos()),
  ]);

  const refPedidos: RefPedidos = refRaw ? JSON.parse(refRaw) : {};
  const pedidosDeCodigo: PedidosDeCodigo = pedCodRaw ? JSON.parse(pedCodRaw) : {};
  const stMin = numHash(stmin);
  const resultado = calcularPedidos(numHash(stock), refPedidos, stMin, pedidosDeCodigo, numHash(hechos), now);

  return {
    resultado,
    meta,
    pedidos: listarPedidos(pedidosDeCodigo, refPedidos),
  };
}

// Lo que hace falta para recalcular un pedido suelto (sin las listas ni el estado).
async function cargarSnapshot() {
  const [refRaw, pedCodRaw, stock, stmin] = await Promise.all([
    redis.get(KEYS.refPedidos()),
    redis.get(KEYS.pedidoCodigos()),
    redis.hgetall(KEYS.stock()),
    redis.hgetall(KEYS.stmin()),
  ]);
  const refPedidos: RefPedidos = refRaw ? JSON.parse(refRaw) : {};
  const pedidosDeCodigo: PedidosDeCodigo = pedCodRaw ? JSON.parse(pedCodRaw) : {};
  return { refPedidos, pedidosDeCodigo, stock: numHash(stock), stMin: numHash(stmin) };
}

// Bolsa de un pedido concreto recalculada desde el snapshot, sin exigir la condición
// #1 (la usa el pedido manual de B5). Devuelve null si no hay nada que pedir.
export async function cargarBolsaManual(pedido: string): Promise<BolsaPedido | null> {
  const { refPedidos, pedidosDeCodigo, stock, stMin } = await cargarSnapshot();
  return bolsaDePedido(pedido, stock, refPedidos, stMin, pedidosDeCodigo);
}

// Catálogo completo del pedido (con las líneas a 0) para el .xls. Vacío si el pedido
// no tiene ninguna referencia en el universo de Ventas.
export async function cargarLineasPedido(pedido: string): Promise<LineaPedido[]> {
  const { refPedidos, pedidosDeCodigo, stock, stMin } = await cargarSnapshot();
  return lineasDePedido(pedido, stock, refPedidos, stMin, pedidosDeCodigo);
}
