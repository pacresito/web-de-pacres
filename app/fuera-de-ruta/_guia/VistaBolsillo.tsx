"use client";

import { useState } from "react";
import type { Destino } from "@/lib/fuera-de-ruta/tipos";
import { duracion, mapsHref } from "@/lib/fuera-de-ruta/formato";
import { fmtHora, type DiaItin, type Itinerario } from "@/lib/fuera-de-ruta/itinerario/itinerario";
import { consejosDelDia } from "@/lib/fuera-de-ruta/guia/guia";

// Icono por tipo de destino, solo para la guía de bolsillo: ahí el icono sustituye a la
// palabra («🥾 Ruta de los hórreos»), que es lo que la hace legible de un vistazo.
const ICONO_TIPO: Record<string, string> = {
  ruta: "🥾", cascada: "💧", pueblo: "🏘️", mirador: "🌅", cueva: "🕳️",
  parque: "🌲", monumento: "🏛️", alojamiento: "🏨", actividad: "✨",
};
const icono = (tipo: string) => ICONO_TIPO[tipo] ?? "📍";

// ------------------------------------------------------------ Guía de bolsillo
// §5.7: el día en una pantalla de móvil, para consultarlo en menos de un minuto durante el
// viaje. Un día cada vez —si hubiera que hacer scroll entre días ya no cabe en la pantalla—.
export default function VistaBolsillo({ itinerario, porSlug }: { itinerario: Itinerario; porSlug: Map<string, Destino> }) {
  const conPlan = itinerario.dias.filter((d) => d.paradas.length > 0);
  const [numero, setNumero] = useState(conPlan[0]?.numero ?? 1);
  const dia = conPlan.find((d) => d.numero === numero) ?? conPlan[0];

  if (!dia) return <p className="fr-d-sub">Aún no hay ningún día planificado.</p>;

  const consejos = consejosDelDia(dia, porSlug);
  return (
    <div className="fr-g-bolsillo">
      <nav className="fr-g-dias" aria-label="Día">
        {conPlan.map((d) => (
          <button
            key={d.numero}
            className={`fr-g-dia-b${d.numero === dia.numero ? " fr-g-dia-b--on" : ""}`}
            aria-current={d.numero === dia.numero}
            onClick={() => setNumero(d.numero)}
          >
            Día {d.numero}
          </button>
        ))}
      </nav>

      <section className="fr-tarjeta fr-g-tarjeta-b">
        <p className="fr-g-b-linea">🕗 Salida <b>{fmtHora(dia.horaSalida)}</b> · 🚗 {duracion(dia.conduccionMin)}</p>
        <ul className="fr-g-b-lista">
          {filasBolsillo(dia, porSlug).map((f) => (
            <li key={f.clave}>
              <span className="fr-mono fr-g-b-hora">{fmtHora(f.hora)}</span>
              <span>
                {f.icono} <b>{f.nombre}</b>{f.cola}
                {f.gps && <> · <a className="fr-s5-link" href={mapsHref(f.gps)} target="_blank" rel="noopener">📍</a></>}
              </span>
            </li>
          ))}
        </ul>
        {consejos.length > 0 && <p className="fr-g-b-consejo">⚠️ {consejos[0]}</p>}
      </section>
    </div>
  );
}

// Las líneas del día en **orden de reloj**: actividades, comida y regreso mezclados. En la
// guía A la comida va intercalada en su sitio del recorrido; aquí, donde solo se leen horas,
// lo único que se entiende es el orden cronológico puro.
type FilaBolsillo = { clave: string; hora: number; icono: string; nombre: string; cola: string; gps?: [number, number] };

function filasBolsillo(dia: DiaItin, porSlug: Map<string, Destino>): FilaBolsillo[] {
  const filas: FilaBolsillo[] = dia.paradas.map((p) => ({
    clave: p.slug,
    hora: p.horaInicio,
    icono: icono(p.tipo),
    nombre: p.nombre,
    cola: ` · ${duracion(p.estanciaMin)}`,
    gps: porSlug.get(p.slug)?.gps,
  }));
  const comidas = [dia.comida, ...dia.paradas.map((p) => p.pausaComida)].filter((c) => c !== undefined);
  for (const [i, c] of comidas.entries()) {
    filas.push({ clave: `comida-${i}`, hora: c.horaInicio, icono: "🍴", nombre: c.restaurante ?? "Parada para comer", cola: "" });
  }
  if (dia.regreso && dia.alojamiento) {
    filas.push({
      clave: "regreso", hora: dia.regreso.horaLlegada,
      icono: dia.salidaDesde ? "🧳" : "🏨",
      nombre: dia.alojamiento.pueblo, cola: "",
    });
  }
  return filas.sort((a, b) => a.hora - b.hora);
}
