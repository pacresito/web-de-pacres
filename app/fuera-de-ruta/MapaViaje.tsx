"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { mapsHref } from "@/lib/fuera-de-ruta/formato";
import { escapar } from "./escapar";

// Mapa del viaje (Fase G, §5.6): las mismas paradas que la guía, **en el mismo orden de la
// planificación** (el pin N es la parada N), unidas día a día por una línea, con el
// alojamiento y los restaurantes del plan y un enlace a Google Maps en cada punto.
//
// No reutiliza el `Mapa` del explorador aunque ambos sean Leaflet: aquel enlaza pin↔tarjeta
// con hover y encuadre congelado, y este numera un recorrido y abre Maps desde el popup.
// Generalizar uno para los dos costaba más props que las 60 líneas que ahorraba.

export type PuntoViaje = {
  slug: string;
  nombre: string;
  gps: [number, number];
  etiqueta: string;              // lo que va dentro del pin: "1", "2"… o un emoji
  dia: number;                   // día del viaje, para unir los puntos de cada jornada
  base?: boolean;                // alojamiento del día: de aquí se sale y aquí se vuelve
  detalle?: string;              // línea bajo el nombre en el popup (hora, tipo…)
};

const icono = (etiqueta: string, nombre: string) =>
  L.divIcon({
    className: "fr-pin-wrap",
    html: `<span class="fr-pin">${etiqueta}</span><span class="fr-pin-globo">${escapar(nombre)}</span>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });

export default function MapaViaje({ puntos }: { puntos: PuntoViaje[] }) {
  const contenedor = useRef<HTMLDivElement>(null);
  const mapa = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!contenedor.current || mapa.current) return;
    const m = L.map(contenedor.current, { zoomControl: false, attributionControl: false });
    L.control.attribution({ position: "bottomleft", prefix: false }).addTo(m);
    L.control.zoom({ position: "topright" }).addTo(m);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
      maxZoom: 18,
    }).addTo(m);
    mapa.current = m;

    // Leaflet no recalcula su tamaño solo si cambia el ancho del contenedor.
    const ro = new ResizeObserver(() => m.invalidateSize());
    ro.observe(contenedor.current);
    return () => {
      ro.disconnect();
      m.remove();
      mapa.current = null;
    };
  }, []);

  useEffect(() => {
    const m = mapa.current;
    if (!m || puntos.length === 0) return;
    const capa = L.layerGroup().addTo(m);

    // Un trazo por día: el recorrido de la jornada tal y como lo cuenta la guía, **cerrado
    // en el alojamiento** — el día empieza y acaba ahí, y la guía cuenta las dos patas. El
    // día que se cambia de base, la vuelta es a otro sitio: viene ya como último punto (y
    // como primero del día siguiente), así que el trazo no se cierra, se encadena.
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
      L.marker(p.gps, { icon: icono(p.etiqueta, p.nombre) })
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
