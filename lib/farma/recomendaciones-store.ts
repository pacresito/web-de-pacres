// Lee y escribe el blob de ventas cruzadas (farma:recomendaciones): codigo → [códigos
// recomendados], el dato MUTABLE que edita María. Lo leen la vista de mostrador y el
// panel; lo muta la ruta de recomendaciones. Mismo patrón que descuentos-store.
import redis from "@/lib/redis";
import { KEYS } from "./keys";

export type Recomendaciones = Record<string, string[]>; // codigo → códigos recomendados

export async function cargarRecomendaciones(): Promise<Recomendaciones> {
  const raw = await redis.get(KEYS.recomendaciones());
  return raw ? JSON.parse(raw) : {};
}

export async function guardarRecomendaciones(data: Recomendaciones): Promise<void> {
  await redis.set(KEYS.recomendaciones(), JSON.stringify(data));
}
