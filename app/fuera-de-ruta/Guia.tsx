"use client";

import { useEffect, useMemo, useState } from "react";
import type { DatosViajes, Destino, Ritmo } from "@/lib/fuera-de-ruta/tipos";
import type { MatrizViajes } from "@/lib/fuera-de-ruta/geo";
import { duracion } from "@/lib/fuera-de-ruta/formato";
import type { Itinerario } from "@/lib/fuera-de-ruta/itinerario/itinerario";
import { CIERRE, totalesViaje, alternativasLluvia } from "@/lib/fuera-de-ruta/guia/guia";
import DiaItinerario from "./_guia/DiaItinerario";
import VistaBolsillo from "./_guia/VistaBolsillo";
import VistaMapa from "./_guia/VistaMapa";

type Vista = "itinerario" | "bolsillo" | "mapa";

const VISTAS: { id: Vista; texto: string }[] = [
  { id: "itinerario", texto: "Día a día" },
  { id: "bolsillo", texto: "De bolsillo" },
  { id: "mapa", texto: "Mapa" },
];

// Vistas del mismo itinerario, nada que sincronizar. El PDF es el día a día impreso.

export default function Guia({ itinerario, datos, porSlug, matriz, ritmo, provincia, onAtras, onHoraSalida }: {
  itinerario: Itinerario;
  datos: DatosViajes;
  porSlug: Map<string, Destino>;
  matriz: MatrizViajes;
  ritmo: Ritmo;
  provincia: string;
  onAtras: () => void;
  onHoraSalida: (dia: number, min: number) => void;
}) {
  const [vista, setVista] = useState<Vista>("itinerario");
  // Sustituye a la pantalla anterior sin navegar y heredaría su scroll.
  useEffect(() => { window.scrollTo(0, 0); }, []);
  const totales = useMemo(() => totalesViaje(itinerario), [itinerario]);
  const alternativas = useMemo(
    () => alternativasLluvia(itinerario, datos.destinos, matriz, ritmo),
    [itinerario, datos.destinos, matriz, ritmo],
  );
  const zonaNombre = useMemo(() => new Map(datos.zonas.map((z) => [z.id, z.nombre])), [datos.zonas]);

  return (
    <div className="fr-g-wrap">
      <div className="fr-s5-form-head fr-g-head">
        <button className="fr-s5-atras fr-g-no-print" onClick={onAtras} aria-label="Volver a mi viaje">‹</button>
        <h1 className="fr-s5-titulo">Tu guía de viaje</h1>
        <button className="fr-s5-link fr-g-no-print" onClick={() => window.print()}>⬇ Descargar en PDF</button>
      </div>

      {/* Ocultos por clase en la de bolsillo, para que el PDF los lleve. */}
      <ul className={`fr-g-totales${vista === "bolsillo" ? " fr-g-oculto" : ""}`}>
        <li>🗓️ <b>{totales.diasConPlan}</b> {totales.diasConPlan === 1 ? "día" : "días"} con plan{totales.dias > totales.diasConPlan ? ` de ${totales.dias}` : ""}</li>
        <li>📷 <b>{totales.actividades}</b> actividades</li>
        <li>🚗 <b>{duracion(totales.conduccionMin)}</b>{totales.km > 0 ? ` · ${totales.km} km` : ""}</li>
        <li>📍 {totales.zonas.map((z) => zonaNombre.get(z) ?? z).join(" · ")}</li>
      </ul>

      <nav className="fr-g-tabs fr-g-no-print" aria-label="Vistas de la guía">
        {VISTAS.map((v) => (
          <button
            key={v.id}
            className={`fr-g-tab${vista === v.id ? " fr-g-tab--on" : ""}`}
            aria-current={vista === v.id}
            onClick={() => setVista(v.id)}
          >
            {v.texto}
          </button>
        ))}
      </nav>

      {/* Siempre montada: es la que se imprime. */}
      <div className={vista === "itinerario" ? undefined : "fr-g-oculto"}>
        <p className="fr-d-sub fr-it-nota">
          Horarios orientativos, calculados con las horas de luz reales y los tiempos de coche.
          No pretende llenar cada minuto: si sobra tiempo, es tuyo.
        </p>
        {itinerario.dias.map((d) => (
          <DiaItinerario
            key={d.numero}
            dia={d}
            porSlug={porSlug}
            provincia={provincia}
            alternativas={alternativas}
            onHoraSalida={onHoraSalida}
          />
        ))}
      </div>

      {vista === "bolsillo" && <VistaBolsillo itinerario={itinerario} porSlug={porSlug} />}
      {vista === "mapa" && <VistaMapa itinerario={itinerario} datos={datos} porSlug={porSlug} />}

      <p className="fr-g-cierre">{CIERRE}</p>
    </div>
  );
}
