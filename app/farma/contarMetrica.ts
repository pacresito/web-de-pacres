// Cuenta una métrica disparada en el cliente (fire-and-forget: nunca bloquea la UI ni
// la rompe si falla). El servidor valida el evento contra su lista blanca.
import type { MetricaCliente } from "@/lib/farma/metricas";

export function contarMetrica(evento: MetricaCliente): void {
  fetch("/farma/api/metrica", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ evento }),
  }).catch(() => {});
}
