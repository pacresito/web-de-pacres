// Lee y escribe el blob de descuentos (farma:descuentos): principio → labs, el dato
// MUTABLE que edita María. Lo leen la landing (Prioridades) y el panel; lo mutan las
// rutas de descuento. Mismo patrón que pedidos-store / pvp-store: el acceso a Redis
// vive aquí; el rankeo puro, en prioridades.ts.
import redis from "@/lib/redis";
import { KEYS } from "./keys";
import type { LabDescuento } from "./prioridades";

export type Descuentos = Record<string, LabDescuento[]>;

export async function cargarDescuentos(): Promise<Descuentos> {
  const raw = await redis.get(KEYS.descuentos());
  return raw ? JSON.parse(raw) : {};
}

export async function guardarDescuentos(data: Descuentos): Promise<void> {
  await redis.set(KEYS.descuentos(), JSON.stringify(data));
}
