"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Zona, Destino } from "@/lib/viajes/tipos";

// Mapa de entrada de /viajes: las zonas de Navarra como polígonos interactivos
// (Leaflet a pelo, autohospedado). Multi-selección por clic; el estado vive en el
// asistente (Viajes.tsx) y aquí solo se pinta y se restila.

// Polígonos aproximados hechos a mano: teselan Navarra a ojo (norte→sur) para el
// flujo de entrada. Es geometría de presentación provisional, no dato curado de
// Cris; el diseño definitivo es handoff a Claude Design. No mostramos pins aquí,
// así que la contención exacta de cada parking en su rectángulo no importa.
const POLIGONOS: Record<string, [number, number][]> = {
  "baztan-otsondo": [[43.3, -2.0], [43.3, -1.35], [42.85, -1.35], [42.85, -2.0]],
  "irati-aezkoa": [[43.2, -1.35], [43.2, -1.05], [42.85, -1.05], [42.85, -1.35]],
  "urbasa-andia": [[42.85, -2.4], [42.85, -1.75], [42.4, -1.75], [42.4, -2.4]],
  "tierra-estella": [[42.85, -1.75], [42.85, -1.1], [42.4, -1.1], [42.4, -1.75]],
  "ribera": [[42.4, -2.0], [42.4, -1.0], [41.9, -1.0], [41.9, -2.0]],
};

const ESTILO_BASE: L.PathOptions = { color: "#1f5c39", weight: 1.5, fillColor: "#2f7d4f", fillOpacity: 0.18 };
const ESTILO_SEL: L.PathOptions = { color: "#1f5c39", weight: 2, fillColor: "#2f7d4f", fillOpacity: 0.55 };

export default function MapaZonas({ zonas, destinos, seleccion, onToggle }: {
  zonas: Zona[];
  destinos: Destino[];
  seleccion: string[];
  onToggle: (id: string) => void;
}) {
  const contenedor = useRef<HTMLDivElement>(null);
  const mapa = useRef<L.Map | null>(null);
  const capas = useRef<Map<string, L.Polygon>>(new Map());
  // `onToggle` cambia en cada render; lo guardamos en un ref (actualizado en un
  // effect) para que el handler de clic —registrado una sola vez al crear el
  // polígono— llame siempre al actual.
  const toggleRef = useRef(onToggle);
  useEffect(() => { toggleRef.current = onToggle; }, [onToggle]);

  // Inicializa el mapa y los polígonos una vez.
  useEffect(() => {
    if (!contenedor.current || mapa.current) return;
    const capa = capas.current;
    const m = L.map(contenedor.current, { scrollWheelZoom: false });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
      maxZoom: 18,
    }).addTo(m);

    const conteo = (id: string) => destinos.filter((d) => d.zona === id).length;
    for (const z of zonas) {
      const ring = POLIGONOS[z.id];
      if (!ring) continue;
      const poly = L.polygon(ring, ESTILO_BASE)
        .bindTooltip(`${z.nombre} · ${conteo(z.id)}`, { permanent: true, direction: "center", className: "v-zona-label" })
        .on("click", () => toggleRef.current(z.id))
        .addTo(m);
      capa.set(z.id, poly);
    }

    const puntos = Object.values(POLIGONOS).flat();
    m.fitBounds(L.latLngBounds(puntos), { padding: [20, 20] });

    // Leaflet no recalcula su tamaño si el contenedor cambia de ancho: lo forzamos.
    const ro = new ResizeObserver(() => m.invalidateSize());
    ro.observe(contenedor.current);
    mapa.current = m;

    return () => {
      ro.disconnect();
      m.remove();
      mapa.current = null;
      capa.clear();
    };
  }, [zonas, destinos]);

  // Restila los polígonos según la selección actual.
  useEffect(() => {
    for (const [id, poly] of capas.current) {
      poly.setStyle(seleccion.includes(id) ? ESTILO_SEL : ESTILO_BASE);
    }
  }, [seleccion]);

  return <div ref={contenedor} className="v-mapa-zonas" />;
}
