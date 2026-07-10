// Registra una métrica disparada en el cliente (búsquedas del mostrador y descarga de
// etiquetas de PVP); el resto de eventos se cuentan en servidor. Solo exige sesión
// válida —sin filtro de rol: cada evento ya es su propio campo—. NO pasa por el rate
// limit global (una jornada normal de mostrador lo agotaría). Lista blanca de eventos.
import { getRol } from "../../auth";
import { registrarMetrica, type MetricaCliente } from "@/lib/farma/metricas";

const PERMITIDAS: MetricaCliente[] = ["busquedas:prioridades", "busquedas:recomendados", "pvp:etiquetas"];

export async function POST(request: Request): Promise<Response> {
  if (!(await getRol())) {
    return Response.json({ error: "No autorizado" }, { status: 403 });
  }

  let body: { evento?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 });
  }
  if (typeof body.evento !== "string" || !PERMITIDAS.includes(body.evento as MetricaCliente)) {
    return Response.json({ error: "Evento no permitido" }, { status: 400 });
  }

  await registrarMetrica(body.evento as MetricaCliente);
  return Response.json({ ok: true });
}
