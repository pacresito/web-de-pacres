// Panel de métricas de uso de /farma, solo para Pablo (NO para María, NO dentro de
// /farma). Server component que lee Redis directo vía leerMetricas. Vive bajo /webs/*
// pero con estilo de página de experimento (TerminalShell: maximizado, con atrás→/lab
// y recargar). Acceso por puerta oculta: clic en el item "Farmacia" de /lab. Sin auth:
// obscuridad + noindex (datos = contadores de uso).
import TerminalShell from "../../components/TerminalShell";
import { leerMetricas } from "@/lib/farma/metricas";

// Contadores en Redis: nunca cachear, leer en cada visita.
export const dynamic = "force-dynamic";

const DIAS = 14;
const ACCENT = "#00b87a";

// Nombres legibles de los segmentos de los campos (visitas:prioridades → "Visitas · Prioridades").
const NOMBRES: Record<string, string> = {
  visitas: "Visitas", inventario: "Inventario", pedidos: "Pedidos",
  stmin: "StMín", pvp: "PVP", busquedas: "Búsquedas",
  prioridades: "Prioridades", recomendados: "Recomendados",
  descuentos: "Descuentos", recomendaciones: "Recomendaciones",
  "subida-ok": "Subida OK", "subida-error": "Subida error",
  descargas: "Descargas", ediciones: "Ediciones", etiquetas: "Etiquetas",
};
const etiqueta = (campo: string): string =>
  campo.split(":").map((s) => NOMBRES[s] ?? s).join(" · ");

const mono = "var(--t-mono)";

export default async function FarmaStats() {
  const { fechas, campos, conteos, totales, errorInventario } = await leerMetricas(DIAS);
  const porTotal = [...campos].sort((a, b) => totales[b] - totales[a]);
  const maxTotal = Math.max(1, ...campos.map((c) => totales[c]));
  const granTotal = campos.reduce((s, c) => s + totales[c], 0);

  return (
    <TerminalShell title="farma-stats" prompt={{ host: "farma", path: "~/webs", command: `./stats --days=${DIAS}` }}>
      {/* Contenido centrado con tope de ancho: margen a los lados en pantallas anchas. */}
      <div style={{ width: "100%", maxWidth: 820, margin: "0 auto", padding: "24px 28px 40px", fontFamily: mono, color: "var(--t-ink)" }}>
        <div style={{ fontSize: 12, color: "var(--t-ink3)", marginBottom: 24 }}>
          ↳ status:{" "}
          <span style={{ color: ACCENT }}>{DIAS}</span>
          <span style={{ color: "var(--t-ink2)" }}> días · {fechas[0]} → {fechas[fechas.length - 1]}</span>
          {" · Σ "}
          <span style={{ color: ACCENT }}>{granTotal}</span> eventos
        </div>

        {campos.length === 0 ? (
          <div style={{ fontSize: 13, color: "var(--t-ink3)" }}>Sin métricas en el rango.</div>
        ) : (
          <>
            {/* Totales por métrica (desc), con barra proporcional. */}
            <div style={{ fontSize: 10, color: "var(--t-ink3)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>
              Totales
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 32 }}>
              {porTotal.map((campo) => (
                <div key={campo} style={{ display: "grid", gridTemplateColumns: "minmax(140px, 200px) 1fr auto", gap: 12, alignItems: "center" }}>
                  <span style={{ fontSize: 12.5, color: "var(--t-ink2)" }}>{etiqueta(campo)}</span>
                  <span style={{ height: 8, borderRadius: 4, background: "var(--t-paper2)", overflow: "hidden" }}>
                    <span style={{ display: "block", height: "100%", width: `${(totales[campo] / maxTotal) * 100}%`, background: ACCENT, borderRadius: 4 }} />
                  </span>
                  <span style={{ fontSize: 12.5, color: "var(--t-ink)", fontVariantNumeric: "tabular-nums", minWidth: 36, textAlign: "right" }}>{totales[campo]}</span>
                </div>
              ))}
            </div>

            {/* Matriz día × métrica (como el script ASCII, aquí en HTML). */}
            <div style={{ fontSize: 10, color: "var(--t-ink3)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>
              Por día
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ borderCollapse: "collapse", fontSize: 12, fontVariantNumeric: "tabular-nums" }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: "4px 12px 8px 0", fontWeight: 500, color: "var(--t-ink3)", position: "sticky", left: 0, background: "var(--t-paper)" }}></th>
                    {fechas.map((f) => (
                      <th key={f} style={{ textAlign: "right", padding: "4px 6px 8px", fontWeight: 400, color: "var(--t-ink3)" }} title={f}>{f.slice(8)}</th>
                    ))}
                    <th style={{ textAlign: "right", padding: "4px 0 8px 14px", fontWeight: 500, color: "var(--t-ink2)", borderLeft: "1px solid var(--t-rule)" }}>Σ</th>
                  </tr>
                </thead>
                <tbody>
                  {porTotal.map((campo) => (
                    <tr key={campo}>
                      <td style={{ padding: "4px 12px 4px 0", whiteSpace: "nowrap", color: "var(--t-ink2)", position: "sticky", left: 0, background: "var(--t-paper)" }}>{etiqueta(campo)}</td>
                      {conteos[campo].map((n, i) => (
                        <td key={i} style={{ textAlign: "right", padding: "4px 6px", color: n === 0 ? "var(--t-ink4)" : "var(--t-ink)" }}>{n === 0 ? "·" : n}</td>
                      ))}
                      <td style={{ textAlign: "right", padding: "4px 0 4px 14px", color: ACCENT, borderLeft: "1px solid var(--t-rule)" }}>{totales[campo]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {errorInventario && (
          <div style={{ marginTop: 30, fontSize: 12, color: "var(--t-ink3)" }}>
            <span style={{ color: "#e5484d" }}>último inventario rechazado:</span> {errorInventario}
          </div>
        )}
      </div>
    </TerminalShell>
  );
}
