// Contadores de uso de /farma: un HINCRBY por evento en el hash del día (YYYY-MM-DD,
// Madrid). Agregados, internos, NO expuestos en la web — sirven para saber si cada
// herramienta se usa de verdad (se consultan con scripts/farma-metricas.ts).
// Best-effort: un fallo de Redis en telemetría nunca debe tumbar la operación real.
import redis from "@/lib/redis";
import { KEYS } from "./keys";
import { fechaMadrid } from "./tiempo";

// Superficies que registran visita al renderizarse (mostrador + panel de María).
export type Superficie =
  | "prioridades" | "recomendados"
  | "pedidos" | "inventario" | "descuentos" | "pvp" | "recomendaciones";

// Eventos que se disparan en el cliente (los demás se cuentan en servidor). El
// endpoint /farma/api/metrica valida contra esta misma lista.
export type MetricaCliente =
  | "busquedas:prioridades" | "busquedas:recomendados" | "pvp:etiquetas";

// Campos del hash diario. Enumerarlos evita typos en la decena de puntos de registro.
export type Metrica =
  | `visitas:${Superficie}`
  | "inventario:subida-ok"
  | "inventario:subida-error"
  | "pedidos:descargas"
  | "stmin:ediciones"
  | MetricaCliente;

const hoy = (): string => fechaMadrid(Date.now());

/** Suma 1 al contador del evento en el hash de hoy (Madrid). Nunca lanza. */
export async function registrarMetrica(campo: Metrica): Promise<void> {
  try {
    await redis.hincrby(KEYS.metricas(hoy()), campo, 1);
  } catch (err) {
    console.error("farma métrica falló:", err);
  }
}

/** Inventario rechazado: cuenta el error y guarda el motivo (para diagnóstico). */
export async function registrarErrorInventario(motivo: string): Promise<void> {
  try {
    await Promise.all([
      redis.hincrby(KEYS.metricas(hoy()), "inventario:subida-error", 1),
      redis.set(KEYS.metricasErrorInventario(), `${hoy()} · ${motivo}`),
    ]);
  } catch (err) {
    console.error("farma métrica falló:", err);
  }
}
