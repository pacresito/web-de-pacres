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

// Cuántos estados anteriores se guardan. El blob son ~50 KB: diez caben de sobra y
// cubren una tarde de edición, que es el plazo en el que se detecta un error.
const HISTORIAL = 10;

/** Guarda el blob apilando el anterior en el historial: toda escritura es deshacible
 *  (restaurar = `LINDEX` + `SET`). Pasa por aquí todo lo que muta descuentos. */
export async function guardarDescuentos(data: Descuentos): Promise<void> {
  const previo = await redis.get(KEYS.descuentos());
  if (previo) {
    await redis.lpush(KEYS.descuentosHistorial(), previo);
    await redis.ltrim(KEYS.descuentosHistorial(), 0, HISTORIAL - 1);
  }
  await redis.set(KEYS.descuentos(), JSON.stringify(data));
}
