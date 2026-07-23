"use client";

import { useState } from "react";
import type { Destino } from "@/lib/fuera-de-ruta/tipos";
import type { Respuestas } from "@/lib/fuera-de-ruta/cuestionario/preguntas";
import type { ResumenViaje } from "@/lib/fuera-de-ruta/viaje/mi-viaje";
import type { Hallazgo } from "@/lib/fuera-de-ruta/auditoria/auditoria";
import type { Oportunidad } from "@/lib/fuera-de-ruta/oportunidades/oportunidades";
import type { ZonaAlojamiento } from "@/lib/fuera-de-ruta/alojamiento/alojamiento";
import { guardarViaje } from "@/lib/fuera-de-ruta/viaje/guardados";
import { duracion } from "@/lib/fuera-de-ruta/formato";

// Panel «Mi viaje» (§4.12-4.13): lo seleccionado, tiempo total, km y reparto por días,
// recalculado en vivo. Nunca descarta: si un día no cabe en el ritmo, lo marca y avisa.
// Guarda perfil + selección (el viaje se replanifica al abrir, no se congela).

// Rango de días de una zona de alojamiento: "Día 2" o "Días 1-3" (el tramo es contiguo).
const fmtDias = (dias: number[]) =>
  dias.length === 1 ? `Día ${dias[0]}` : `Días ${dias[0]}-${dias[dias.length - 1]}`;

const ICONO_AUD: Record<Hallazgo["nivel"], string> = { ok: "✅", aviso: "⚠️", idea: "💡" };

export default function PanelViaje({ resumen, auditoria, oportunidades, zonas, porSlug, provincia, respuestas, seleccion, onQuitar, onAnadir, onQueDecidaLaIA, onVerItinerario, onComparar }: {
  resumen: ResumenViaje;
  auditoria: Hallazgo[];
  oportunidades: Oportunidad[];
  zonas: ZonaAlojamiento[];
  porSlug: Map<string, Destino>;
  provincia: string;
  respuestas: Respuestas;
  seleccion: Set<string>;
  onQuitar: (slug: string) => void;
  onAnadir: (slug: string) => void;
  onQueDecidaLaIA: () => void;
  onVerItinerario: () => void;
  onComparar: () => void;
}) {
  const vacio = seleccion.size === 0;

  // «Guardado» se deriva, no se almacena: guardo la firma de la selección guardada y la
  // comparo con la actual. Así al cambiar la selección el botón se reactiva solo —cada
  // selección distinta es una entrada nueva en «Mis viajes»— sin un efecto que resetee.
  const [firmaGuardada, setFirmaGuardada] = useState<string | null>(null);
  const firma = [...seleccion].sort().join(",");
  const guardado = !vacio && firmaGuardada === firma;

  const guardar = () => {
    try {
      guardarViaje(provincia, respuestas, [...seleccion]);
      setFirmaGuardada(firma);
    } catch { /* navegador sin localStorage: no se guarda, no se rompe */ }
  };

  return (
    <aside className="fr-d-panel fr-tarjeta">
      <h2 className="fr-d-panel-t">Mi viaje</h2>

      {vacio ? (
        <p className="fr-d-panel-vacio">
          Aún no has añadido nada. Añade actividades desde las tarjetas, o deja que te propongamos un viaje equilibrado para empezar.
        </p>
      ) : (
        <>
          <div className="fr-d-totales">
            <span><b>{resumen.totalParadas}</b> {resumen.totalParadas === 1 ? "sitio" : "sitios"}</span>
            <span><b>{duracion(resumen.totalMin)}</b> en total</span>
            {resumen.totalKm > 0 && <span><b>{resumen.totalKm}</b> km en coche</span>}
          </div>

          {auditoria.length > 0 && (
            <ul className="fr-d-aud">
              {auditoria.map((h, i) => (
                <li key={i} className={h.nivel === "aviso" ? "fr-d-aviso" : "fr-d-aud-linea"}>
                  <span aria-hidden>{ICONO_AUD[h.nivel]}</span>
                  <span>{h.texto}</span>
                </li>
              ))}
            </ul>
          )}

          <ol className="fr-d-dias">
            {resumen.dias.map((d) => (
              <li key={d.numero} className={`fr-d-dia${d.apretado ? " fr-d-dia--apretado" : ""}`}>
                <div className="fr-d-dia-cab">
                  <span className="fr-d-dia-n">Día {d.numero}</span>
                  {d.slugs.length > 0
                    ? <span className="fr-mono">{duracion(d.min)}{d.km > 0 ? ` · ${d.km} km` : ""}</span>
                    : <span className="fr-mono fr-d-dia-libre">libre</span>}
                </div>
                {d.slugs.map((s) => (
                  <div key={s} className="fr-d-dia-parada">
                    <span>{porSlug.get(s)?.nombre ?? s}</span>
                    <button className="fr-d-quitar" aria-label="Quitar" onClick={() => onQuitar(s)}>×</button>
                  </div>
                ))}
              </li>
            ))}
          </ol>

          {oportunidades.length > 0 && (
            <div className="fr-d-oport">
              <h3 className="fr-d-oport-t">Ya que pasáis cerca…</h3>
              <ul className="fr-d-oport-lista">
                {oportunidades.map((o) => (
                  <li key={o.destino.slug} className="fr-d-oport-item">
                    <div className="fr-d-oport-info">
                      <span className="fr-d-oport-nombre">{o.destino.nombre}</span>
                      <span className="fr-d-oport-meta fr-mono">{o.destino.tipo} · +{o.desvioMin} min de coche</span>
                    </div>
                    <button
                      className="fr-btn fr-btn--primario fr-d-oport-add"
                      onClick={() => onAnadir(o.destino.slug)}
                    >
                      + Añadir
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {zonas.length > 0 && (
            <div className="fr-d-aloj">
              <h3 className="fr-d-aloj-t">🛏 Dónde dormir</h3>
              <ul className="fr-d-aloj-lista">
                {zonas.map((z) => (
                  <li key={z.pueblo + z.dias[0]} className="fr-d-aloj-item">
                    <div className="fr-d-aloj-cab">
                      <span className="fr-d-aloj-pueblo">{z.pueblo}</span>
                      <span className="fr-mono fr-d-aloj-dias">{fmtDias(z.dias)}</span>
                    </div>
                    <span className="fr-d-aloj-paradas">Cerca de {z.paradas.join(", ")}.</span>
                    {z.ahorroMin != null && (
                      <span className="fr-d-aloj-ahorro">Cambiar de base aquí ahorra ~{z.ahorroMin} min de coche.</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      <div className="fr-d-panel-cta">
        {!vacio && (
          <button className="fr-btn fr-btn--primario fr-d-itinerario" onClick={onVerItinerario}>
            🗓 Ver mi itinerario día a día
          </button>
        )}
        {seleccion.size >= 2 && (
          <button className="fr-btn fr-d-comparar" onClick={onComparar}>
            ⚖️ Comparar actividades
          </button>
        )}
        <button className="fr-btn fr-d-ia" onClick={onQueDecidaLaIA}>
          ✨ Que elija Cris por mí
        </button>
        {!vacio && (
          <button className="fr-btn fr-d-guardar" onClick={guardar} disabled={guardado}>
            {guardado ? "✔ Guardado en «Mis viajes»" : "Guardar mi viaje"}
          </button>
        )}
      </div>
      <span className="sr-only" aria-live="polite">{guardado ? "Viaje guardado" : ""}</span>
    </aside>
  );
}
