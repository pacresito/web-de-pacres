"use client";

import { useState } from "react";
import Link from "next/link";
import type { Destino } from "@/lib/fuera-de-ruta/tipos";
import { duracion, mapsHref } from "@/lib/fuera-de-ruta/formato";
import { fmtHora, type ComidaItin, type DiaItin } from "@/lib/fuera-de-ruta/itinerario/itinerario";
import { consejosDelDia, type Alternativa } from "@/lib/fuera-de-ruta/guia/guia";

// ------------------------------------------------------------ Guía A: el día a día
// §5.4: cada día con su resumen (luz, coche, estancia, alojamiento) y su cronología —hora de
// llegada, inicio, estancia, salida y conducción a la siguiente, con la comida intercalada y
// el regreso—, más los consejos del día y la alternativa de lluvia por actividad. La hora de
// salida es editable y todo se recalcula. Enlace a Maps por parada (el parking).
export default function DiaItinerario({ dia, porSlug, provincia, alternativas, onHoraSalida }: {
  dia: DiaItin;
  porSlug: Map<string, Destino>;
  provincia: string;
  alternativas: Map<string, Alternativa>;
  onHoraSalida: (dia: number, min: number) => void;
}) {
  const consejos = consejosDelDia(dia, porSlug);
  // Índice de la parada ante la que se intercala la comida, o -1 si no cae entre dos
  // paradas (día de una sola, o comida que se va al final): entonces se pinta tras la
  // última. Se calcula **una vez**: el mismo predicado escrito en dos sitios se
  // desincroniza al tocarlo y la comida acaba duplicada o desaparecida.
  const idxComida = dia.comida
    ? dia.paradas.findIndex((p, i) => {
        const finAnterior = i > 0 ? dia.paradas[i - 1].horaSalida : dia.horaSalida;
        return dia.comida!.horaInicio >= finAnterior && dia.comida!.horaInicio <= p.horaLlegada;
      })
    : -1;

  if (dia.paradas.length === 0) {
    return (
      <section className="fr-it-dia fr-tarjeta fr-it-dia--libre">
        <h2 className="fr-it-dia-t">Día {dia.numero}</h2>
        <p className="fr-it-libre">Día libre. Descansa o improvisa: este día no lo hemos planificado.</p>
      </section>
    );
  }
  return (
    <section className="fr-it-dia fr-tarjeta">
      <div className="fr-it-dia-cab">
        <h2 className="fr-it-dia-t">Día {dia.numero}</h2>
        {dia.alojamiento && <span className="fr-it-aloj">🏨 Noche en {dia.alojamiento.pueblo}</span>}
      </div>

      <ul className="fr-it-resumen">
        <li>🌅 <b>{fmtHora(dia.amanecer)}</b> · 🌇 <b>{fmtHora(dia.atardecer)}</b></li>
        <li>🚗 <b>{duracion(dia.conduccionMin)}</b>{dia.km > 0 ? ` · ${dia.km} km` : ""}</li>
        <li>👀 estancia <b>{duracion(dia.estanciaTotalMin)}</b></li>
      </ul>

      <label className="fr-it-salida">
        <span>🕗 Hora de salida</span>
        <input
          type="time"
          value={fmtHora(dia.horaSalida)}
          onChange={(e) => {
            const [h, m] = e.target.value.split(":").map(Number);
            if (!Number.isNaN(h)) onHoraSalida(dia.numero, h * 60 + (m || 0));
          }}
        />
      </label>

      <ol className="fr-it-timeline">
        <li className="fr-it-hito">
          <span className="fr-it-hora">{fmtHora(dia.horaSalida)}</span>
          <span className="fr-it-txt">
            {dia.salidaDesde
              ? <>Salida desde <b>{dia.salidaDesde.pueblo}</b> con el equipaje: hoy cambias de base.</>
              : <>Salida desde {dia.alojamiento ? dia.alojamiento.pueblo : "el inicio del día"}.</>}
          </span>
        </li>

        {dia.paradas.map((p, i) => {
          const gps = porSlug.get(p.slug)?.gps;
          return (
            <li key={p.slug} className="fr-it-parada-wrap">
              {i === idxComida && <BloqueComida comida={dia.comida!} />}
              <div className="fr-it-parada">
                <span className="fr-it-hora">{fmtHora(p.horaLlegada)}</span>
                <div className="fr-it-txt">
                  <span className="fr-it-parada-n">
                    Llegada a <b>{p.nombre}</b>{p.nocturna && <span className="fr-it-luna"> 🌙</span>}
                    {p.cocheDesdeAnteriorMin > 0 && <span className="fr-mono fr-it-coche"> · {duracion(p.cocheDesdeAnteriorMin)} en coche{p.kmDesdeAnterior > 0 ? ` (${p.kmDesdeAnterior} km)` : ""}</span>}
                  </span>
                  {p.pausaComida ? (
                    <>
                      <span className="fr-it-detalle">
                        {p.prepMin > 0 && `Aparcar y prepararse ${p.prepMin} min. `}
                        Empieza a las <b>{fmtHora(p.horaInicio)}</b> · estancia total recomendada <b>{duracion(p.estanciaMin)}</b>.
                      </span>
                      <span className="fr-it-detalle fr-it-pausa">
                        🍴 {fmtHora(p.pausaComida.horaInicio)} — {p.pausaComida.restaurante ? <>pausa para comer en <b>{p.pausaComida.restaurante}</b></> : "pausa para comer"} ({duracion(p.pausaComida.min)}) y sigues hasta las <b>{fmtHora(p.horaSalida)}</b>.
                      </span>
                    </>
                  ) : (
                    <span className="fr-it-detalle">
                      {p.prepMin > 0 && `Aparcar y prepararse ${p.prepMin} min. `}
                      Empieza a las <b>{fmtHora(p.horaInicio)}</b>, estancia recomendada <b>{duracion(p.estanciaMin)}</b> → salida <b>{fmtHora(p.horaSalida)}</b>.
                    </span>
                  )}
                  <span className="fr-it-enlaces">
                    {gps && (
                      <a className="fr-s5-link" href={mapsHref(gps)} target="_blank" rel="noopener">📍 Cómo llegar</a>
                    )}
                    {p.tipo !== "alojamiento" && (
                      <Link className="fr-s5-link" href={`/fuera-de-ruta/${provincia}/${p.slug}`} target="_blank" rel="noopener">Ver ficha</Link>
                    )}
                  </span>
                  {alternativas.get(p.slug) && (
                    <BloqueLluvia alternativa={alternativas.get(p.slug)!} porSlug={porSlug} provincia={provincia} />
                  )}
                </div>
              </div>
            </li>
          );
        })}

        {/* Comida que no partió el recorrido (día de una sola parada): va tras la última. */}
        {dia.comida && idxComida < 0 && (
          <li className="fr-it-parada-wrap"><BloqueComida comida={dia.comida} /></li>
        )}

        {dia.regreso && (
          <li className="fr-it-hito">
            <span className="fr-it-hora">{fmtHora(dia.regreso.horaLlegada)}</span>
            <span className="fr-it-txt">
              {dia.salidaDesde ? "🧳 Traslado a" : "🏨 Regreso a"} {dia.alojamiento?.pueblo}
              <span className="fr-mono fr-it-coche"> · {duracion(dia.regreso.cocheMin)} en coche{dia.regreso.km > 0 ? ` (${dia.regreso.km} km)` : ""}</span>
            </span>
          </li>
        )}
      </ol>

      {consejos.length > 0 && (
        <div className="fr-g-consejos">
          <h3 className="fr-g-consejos-t">Consejos del día</h3>
          <ul>{consejos.map((c) => <li key={c}>{c}</li>)}</ul>
        </div>
      )}

      {dia.avisos.length > 0 && (
        <ul className="fr-it-avisos">
          {dia.avisos.map((a) => <li key={a}>⚠ {a}</li>)}
        </ul>
      )}
    </section>
  );
}

function BloqueComida({ comida }: { comida: ComidaItin }) {
  return (
    <div className="fr-it-comida">
      <span className="fr-it-hora">{fmtHora(comida.horaInicio)}</span>
      <span className="fr-it-txt">
        🍴 {comida.restaurante ? <>Comida en <b>{comida.restaurante}</b></> : "Parada para comer"} · {duracion(comida.min)}
      </span>
    </div>
  );
}

// ------------------------------------------------------------ Guía B: la lluvia
// §5.5: la alternativa ya está calculada; el botón solo la enseña. No reorganiza el viaje ni
// consulta la previsión —decide el usuario, y solo si llueve—. En el PDF sale desplegada
// (`@media print`): en papel no hay botón que pulsar.
function BloqueLluvia({ alternativa: a, porSlug, provincia }: {
  alternativa: Alternativa;
  porSlug: Map<string, Destino>;
  provincia: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const gpsAlternativa = porSlug.get(a.slug)?.gps;
  return (
    <div className="fr-g-lluvia">
      <button className="fr-g-lluvia-b fr-g-no-print" onClick={() => setAbierto((v) => !v)} aria-expanded={abierto}>
        🌧️ Ver alternativa en caso de lluvia
      </button>
      <div className="fr-g-lluvia-cuerpo" hidden={!abierto}>
        <b>{a.nombre}</b> — {a.queEs}
        <span className="fr-it-detalle">
          🚗 {duracion(a.cocheMin)} desde aquí{a.km > 0 ? ` (${a.km} km)` : ""} · ⏱️ {duracion(a.estanciaMin)} · {a.motivo}
        </span>
        <span className="fr-it-enlaces">
          {gpsAlternativa && (
            <a className="fr-s5-link" href={mapsHref(gpsAlternativa)} target="_blank" rel="noopener">📍 Cómo llegar</a>
          )}
          <Link className="fr-s5-link" href={`/fuera-de-ruta/${provincia}/${a.slug}`} target="_blank" rel="noopener">Ver ficha</Link>
        </span>
      </div>
    </div>
  );
}
