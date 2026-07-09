"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Destino } from "@/lib/viajes/tipos";

// Mapa de /viajes: Leaflet a pelo (sin react-leaflet), autohospedado vía npm.
// Se carga con dynamic({ssr:false}) desde Explorador porque Leaflet toca `window`.
// Recibe la lista YA filtrada y repinta los pins cuando cambia — mismo origen de
// datos que el grid, así filtrar mueve grid y mapa a la vez.

// Iconos servidos desde /public (el gotcha clásico: con bundler las rutas por
// defecto de Leaflet rompen; se apuntan a mano).
const icono = L.icon({
  iconUrl: "/viajes/leaflet/marker-icon.png",
  iconRetinaUrl: "/viajes/leaflet/marker-icon-2x.png",
  shadowUrl: "/viajes/leaflet/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const CENTRO_NAVARRA: [number, number] = [42.75, -1.65];

export default function Mapa({ destinos }: { destinos: Destino[] }) {
  const contenedor = useRef<HTMLDivElement>(null);
  const mapa = useRef<L.Map | null>(null);
  const capaPins = useRef<L.LayerGroup | null>(null);

  // Inicializa el mapa una vez.
  useEffect(() => {
    if (!contenedor.current || mapa.current) return;
    const m = L.map(contenedor.current).setView(CENTRO_NAVARRA, 8);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
      maxZoom: 18,
    }).addTo(m);
    capaPins.current = L.layerGroup().addTo(m);
    mapa.current = m;

    // Leaflet no recalcula su tamaño si el contenedor cambia de ancho (cruzar el
    // breakpoint móvil/escritorio, rotar el móvil): lo forzamos.
    const ro = new ResizeObserver(() => m.invalidateSize());
    ro.observe(contenedor.current);

    return () => {
      ro.disconnect();
      m.remove();
      mapa.current = null;
      capaPins.current = null;
    };
  }, []);

  // Repinta los pins con la lista filtrada.
  useEffect(() => {
    const m = mapa.current;
    const capa = capaPins.current;
    if (!m || !capa) return;
    capa.clearLayers();

    const conGps = destinos.filter((d) => d.gps);
    for (const d of conGps) {
      L.marker(d.gps!, { icon: icono })
        .bindPopup(
          `<strong>${d.nombre}</strong><br><a href="/viajes/${d.slug}">Ver ficha →</a>`,
        )
        .addTo(capa);
    }

    if (conGps.length > 0) {
      const bounds = L.latLngBounds(conGps.map((d) => d.gps!));
      m.fitBounds(bounds, { padding: [30, 30], maxZoom: 12 });
    } else {
      m.setView(CENTRO_NAVARRA, 8);
    }
  }, [destinos]);

  return <div ref={contenedor} className="v-mapa" />;
}
