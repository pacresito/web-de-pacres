"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import { mapsHref } from "@/lib/fuera-de-ruta/formato";
import { crearMapa, escapar, iconoPin } from "./leaflet";

// Mapa de la guía: el recorrido de cada día en el orden del plan. No comparte componente
// con el del explorador, que enlaza pins con tarjetas: fusionarlos costaría más props de
// las que ahorra.

export type PuntoViaje = {
  slug: string;
  nombre: string;
  gps: [number, number];
  etiqueta: string;              // dentro del pin: "1", "2"… o un emoji
  dia: number;
  base?: boolean;                // alojamiento del día
  detalle?: string;              // línea del popup bajo el nombre
};

export default function MapaViaje({ puntos }: { puntos: PuntoViaje[] }) {
  const contenedor = useRef<HTMLDivElement>(null);
  const mapa = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!contenedor.current || mapa.current) return;
    const { mapa: m, soltar } = crearMapa(contenedor.current);
    mapa.current = m;
    return () => {
      soltar();
      mapa.current = null;
    };
  }, []);

  useEffect(() => {
    const m = mapa.current;
    if (!m || puntos.length === 0) return;
    const capa = L.layerGroup().addTo(m);

    // Un trazo por día, cerrado en la base. El día que se cambia de base, la nueva ya es el
    // último punto: el trazo no se cierra, se encadena con el día siguiente.
    const dias = [...new Set(puntos.map((p) => p.dia))];
    for (const dia of dias) {
      const delDia = puntos.filter((p) => p.dia === dia);
      const ruta = delDia.map((p) => p.gps);
      if (delDia[0]?.base && !delDia[delDia.length - 1]?.base && ruta.length > 1) ruta.push(delDia[0].gps);
      if (ruta.length > 1) {
        // --fr-rio: Leaflet dibuja en SVG y no lee variables CSS.
        L.polyline(ruta, { color: "#2e5be6", weight: 2, dashArray: "6 6", opacity: 0.8 }).addTo(capa);
      }
    }

    for (const p of puntos) {
      L.marker(p.gps, { icon: iconoPin(p.etiqueta, p.nombre) })
        .bindPopup(
          `<b>${escapar(p.nombre)}</b>${p.detalle ? `<br>${escapar(p.detalle)}` : ""}` +
            `<br><a href="${mapsHref(p.gps)}" target="_blank" rel="noopener">📍 Abrir en Google Maps</a>`,
        )
        .addTo(capa);
    }

    m.fitBounds(L.latLngBounds(puntos.map((p) => p.gps)), { padding: [40, 40], maxZoom: 12 });
    return () => { capa.remove(); };
  }, [puntos]);

  return <div ref={contenedor} className="fr-g-mapa" />;
}
