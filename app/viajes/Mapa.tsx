"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Destino, Restaurante } from "@/lib/viajes/tipos";

// Mapa del Explorador (Río pop): Leaflet a pelo, autohospedado vía npm, cargado
// con dynamic({ssr:false}) porque toca `window`. Pins propios con divIcon — el
// pin N es la tarjeta N (misma lista filtrada, mismo orden). El estado activo se
// pinta alternando una clase en el elemento del marker (no con setIcon: reemplazar
// el nodo bajo el cursor dispara mouseout y el resaltado parpadea). El encuadre se
// fija UNA vez con los destinos iniciales y no se toca al filtrar ni con 0
// resultados (spec S3: "el mapa no borra tu encuadre").

const CENTRO_NAVARRA: [number, number] = [42.75, -1.65];

const iconoDestino = (num: number, nombre: string) =>
  L.divIcon({
    className: "fr-pin-wrap",
    html: `<span class="fr-pin">${num}</span><span class="fr-pin-globo">${nombre}</span>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });

const iconoResto = () =>
  L.divIcon({ className: "fr-pin-wrap", html: '<span class="fr-pin-r">R</span>', iconSize: [26, 26], iconAnchor: [13, 13] });

export default function Mapa({ destinos, restaurantes, activo, onActivo, onPin }: {
  destinos: Destino[];           // lista filtrada, en el orden del grid
  restaurantes: Restaurante[];   // con gps y ya filtrados por zona; [] = capa oculta
  activo: string | null;         // slug resaltado (enlace pin↔tarjeta)
  onActivo: (slug: string | null) => void;
  onPin: (slug: string) => void; // click en un pin → llevar a su tarjeta
}) {
  const contenedor = useRef<HTMLDivElement>(null);
  const mapa = useRef<L.Map | null>(null);
  const capaPins = useRef<L.LayerGroup | null>(null);
  const capaRestos = useRef<L.LayerGroup | null>(null);
  const marcadores = useRef(new Map<string, L.Marker>());
  const encuadrado = useRef(false);
  // Los markers se crean una vez por filtrado: los handlers leen los callbacks de
  // refs para no capturar closures viejos del render.
  const onActivoRef = useRef(onActivo);
  const onPinRef = useRef(onPin);
  const activoRef = useRef(activo);
  useEffect(() => {
    onActivoRef.current = onActivo;
    onPinRef.current = onPin;
  });

  // Inicializa el mapa una vez. La atribución va antes del tile layer para que
  // recoja su texto; controles propios (zoom arriba-dcha) restilizados en CSS.
  useEffect(() => {
    if (!contenedor.current || mapa.current) return;
    const m = L.map(contenedor.current, { zoomControl: false, attributionControl: false }).setView(CENTRO_NAVARRA, 8);
    L.control.attribution({ position: "bottomleft", prefix: false }).addTo(m);
    L.control.zoom({ position: "topright" }).addTo(m);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
      maxZoom: 18,
    }).addTo(m);
    capaPins.current = L.layerGroup().addTo(m);
    capaRestos.current = L.layerGroup().addTo(m);
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
      capaRestos.current = null;
    };
  }, []);

  // Repinta los pins con la lista filtrada.
  useEffect(() => {
    const m = mapa.current;
    const capa = capaPins.current;
    if (!m || !capa) return;
    capa.clearLayers();
    marcadores.current.clear();

    destinos.forEach((d, i) => {
      if (!d.gps) return;
      const marker = L.marker(d.gps, { icon: iconoDestino(i + 1, d.nombre) });
      marker.on("mouseover", () => onActivoRef.current(d.slug));
      marker.on("mouseout", () => onActivoRef.current(null));
      marker.on("click", () => onPinRef.current(d.slug));
      marker.addTo(capa);
      if (activoRef.current === d.slug) resaltar(marker, true);
      marcadores.current.set(d.slug, marker);
    });

    // Encuadre inicial, una sola vez; filtrar o quedarse a 0 no lo mueve.
    if (!encuadrado.current) {
      const conGps = destinos.filter((d) => d.gps);
      if (conGps.length) {
        m.fitBounds(L.latLngBounds(conGps.map((d) => d.gps!)), { padding: [30, 30], maxZoom: 12 });
        encuadrado.current = true;
      }
    }
  }, [destinos]);

  // Resalta el pin activo (hover/tap en pin o en tarjeta).
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

  // Capa de restaurantes (pin R): sigue el toggle y las zonas filtradas.
  useEffect(() => {
    const capa = capaRestos.current;
    if (!capa) return;
    capa.clearLayers();
    for (const r of restaurantes) {
      L.marker(r.gps!, { icon: iconoResto() })
        .bindTooltip(r.nombre, { direction: "top", offset: [0, -12] })
        .addTo(capa);
    }
  }, [restaurantes]);

  return <div ref={contenedor} className="fr-s3-mapa" />;
}

function resaltar(marker: L.Marker, on: boolean) {
  marker.getElement()?.classList.toggle("fr-pin--on", on);
  marker.setZIndexOffset(on ? 1000 : 0);
}
