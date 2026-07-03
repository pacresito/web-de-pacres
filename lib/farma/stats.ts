// Contadores de uso de /farma: un INCR por acción y mes (agregados, internos, NO
// expuestos en la web). Sirven para saber si cada herramienta se usa de verdad.
import redis from "@/lib/redis";
import { KEYS } from "./keys";
import { fechaMadrid } from "./tiempo";

export type Accion = "inventario-subido" | "pedido-hecho" | "pvp-actualizado";

// Mes actual (YYYY-MM) en Europe/Madrid: el servidor (Vercel) corre en UTC, así que
// el mes se calcula en la zona de la farmacia, no en la del servidor.
const mesActualMadrid = (): string => fechaMadrid(Date.now()).slice(0, 7);

/** Cuenta una acción de uso. Best-effort: nunca debe tumbar la operación real. */
export async function incrStat(accion: Accion): Promise<void> {
  try {
    await redis.incr(KEYS.stats(accion, mesActualMadrid()));
  } catch (err) {
    console.error("farma stats incr falló:", err);
  }
}
