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

const DIA_MS = 24 * 60 * 60 * 1000;

// Rango de métricas ya agregado (matriz campos×día) listo para pintar. Serializable,
// así lo consume tanto el script (ASCII) como el panel farma-stats (server → HTML).
export type MetricasRango = {
  fechas: string[];                    // YYYY-MM-DD (Madrid), de más antigua a hoy
  campos: string[];                    // campos presentes en el rango, orden alfabético
  conteos: Record<string, number[]>;   // campo → conteo por día (mismo índice que fechas)
  totales: Record<string, number>;     // campo → suma del rango
  errorInventario: string | null;      // motivo del último inventario rechazado
};

/**
 * Lee los contadores de uso de los últimos `dias` (hashes farma:metricas:*) y los
 * agrega en una matriz campos×día. `dev` fuerza el sufijo de clave; omitido, lo
 * decide NODE_ENV (default de KEYS) — la página deja el default; el script lo pasa.
 */
export async function leerMetricas(dias: number, dev?: boolean): Promise<MetricasRango> {
  const ahora = Date.now();
  const fechas = Array.from({ length: dias }, (_, i) => fechaMadrid(ahora - (dias - 1 - i) * DIA_MS));
  const res = await redis.pipeline(fechas.map((f) => ["hgetall", KEYS.metricas(f, dev)])).exec();

  const porDia = (res ?? []).map(([, h]) => (h as Record<string, string>) ?? {});
  const campos = [...new Set(porDia.flatMap((h) => Object.keys(h)))].sort();

  const conteos: Record<string, number[]> = {};
  const totales: Record<string, number> = {};
  for (const campo of campos) {
    const serie = porDia.map((h) => Number(h[campo] ?? 0));
    conteos[campo] = serie;
    totales[campo] = serie.reduce((s, n) => s + n, 0);
  }

  const errorInventario = await redis.get(KEYS.metricasErrorInventario(dev));
  return { fechas, campos, conteos, totales, errorInventario };
}

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
