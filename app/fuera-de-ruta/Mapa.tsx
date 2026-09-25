"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import type { Destino, Restaurante } from "@/lib/fuera-de-ruta/tipos";
import { crearMapa, escapar, iconoPin } from "./leaflet";

// Mapa del explorador: el pin N es la tarjeta N. El encuadre se fija una vez y filtrar
// no lo mueve. El pin activo se marca con una clase, no con setIcon: reemplazar el nodo
// bajo el cursor dispara mouseout y el resaltado parpadea.

const iconoResto = () =>
  L.divIcon({ className: "fr-pin-wrap", html: '<span class="fr-pin-r">R</span>', iconSize: [26, 26], iconAnchor: [13, 13] });

export default function Mapa({ destinos, restaurantes, activo, onActivo, onPin }: {
  destinos: Destino[];           // en el orden del grid
  restaurantes: Restaurante[];   // con gps; [] = capa oculta
  activo: string | null;         // slug resaltado
  onActivo: (slug: string | null) => void;
  onPin: (slug: string) => void;
}) {
  const contenedor = useRef<HTMLDivElement>(null);
  const mapa = useRef<L.Map | null>(null);
  const capaPins = useRef<L.LayerGroup | null>(null);
  const capaRestos = useRef<L.LayerGroup | null>(null);
  const marcadores = useRef(new Map<string, L.Marker>());
  const encuadrado = useRef(false);
  // Los markers viven entre renders: sus handlers leen los callbacks de refs.
  const onActivoRef = useRef(onActivo);
  const onPinRef = useRef(onPin);
  const activoRef = useRef(activo);
  useEffect(() => {
    onActivoRef.current = onActivo;
    onPinRef.current = onPin;
  });

  useEffect(() => {
    if (!contenedor.current || mapa.current) return;
    const { mapa: m, soltar } = crearMapa(contenedor.current);
    capaPins.current = L.layerGroup().addTo(m);
    capaRestos.current = L.layerGroup().addTo(m);
    mapa.current = m;

    return () => {
      soltar();
      mapa.current = null;
      capaPins.current = null;
      capaRestos.current = null;
    };
  }, []);

  useEffect(() => {
    const m = mapa.current;
    const capa = capaPins.current;
    if (!m || !capa) return;
    capa.clearLayers();
    marcadores.current.clear();

    destinos.forEach((d, i) => {
      if (!d.gps) return;
      const marker = L.marker(d.gps, { icon: iconoPin(String(i + 1), d.nombre) });
      marker.on("mouseover", () => onActivoRef.current(d.slug));
      marker.on("mouseout", () => onActivoRef.current(null));
      marker.on("click", () => onPinRef.current(d.slug));
      marker.addTo(capa);
      if (activoRef.current === d.slug) resaltar(marker, true);
      marcadores.current.set(d.slug, marker);
    });

    if (!encuadrado.current) {
      const conGps = destinos.filter((d) => d.gps);
      if (conGps.length) {
        m.fitBounds(L.latLngBounds(conGps.map((d) => d.gps!)), { padding: [30, 30], maxZoom: 12 });
        encuadrado.current = true;
      }
    }
  }, [destinos]);

  useEffect(() => {
    const previo = activoRef.current;
    activoRef.current = activo;
    if (previo === activo) return;
    const pinta = (slug: string | null, on: boolean) => {
      const marker = slug ? marcadores.current.get(slug) : undefined;
      if (marker) resaltar(marker, on);
    };
    pinta(previo, false);
    pinta(activo, true);
  }, [activo]);

  useEffect(() => {
    const capa = capaRestos.current;
    if (!capa) return;
    capa.clearLayers();
    for (const r of restaurantes) {
      L.marker(r.gps!, { icon: iconoResto() })
        .bindTooltip(escapar(r.nombre), { direction: "top", offset: [0, -12] })
        .addTo(capa);
    }
  }, [restaurantes]);

  return <div ref={contenedor} className="fr-s3-mapa" />;
}

function resaltar(marker: L.Marker, on: boolean) {
  marker.getElement()?.classList.toggle("fr-pin--on", on);
  marker.setZIndexOffset(on ? 1000 : 0);
}
