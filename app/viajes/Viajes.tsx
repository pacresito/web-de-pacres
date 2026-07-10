"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { DatosViajes } from "@/lib/viajes/tipos";
import Explorador from "./Explorador";
import MapaEspana from "./MapaEspana";

// Asistente de /viajes: España (elegir comunidad) → zonas (elegir zonas sobre el
// mapa) → resultados. La selección de zonas alimenta el filtro `zona` del
// Explorador, que no cambia su lógica — solo recibe el valor inicial.
// Leaflet toca `window`: el mapa de zonas solo en cliente, sin SSR. El de España
// es SVG puro, se renderiza sin más.
const MapaZonas = dynamic(() => import("./MapaZonas"), { ssr: false });

export default function Viajes({ datos }: { datos: DatosViajes }) {
  // España → zonas → resultados. `seleccion` (zonas) se conserva al volver.
  const [paso, setPaso] = useState<"espana" | "zonas" | "resultados">("espana");
  const [seleccion, setSeleccion] = useState<string[]>([]);

  const conteo = useMemo(
    () => (seleccion.length ? datos.destinos.filter((d) => seleccion.includes(d.zona)).length : datos.destinos.length),
    [datos.destinos, seleccion],
  );

  if (paso === "espana") {
    return <MapaEspana comunidad={datos.comunidad} total={datos.destinos.length} onEntrar={() => setPaso("zonas")} />;
  }

  if (paso === "resultados") {
    return <Explorador datos={datos} zonaInicial={seleccion} onCambiarZonas={() => setPaso("zonas")} />;
  }

  const toggle = (id: string) =>
    setSeleccion((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <div className="v-entrada">
      <div className="v-entrada-head">
        <button className="v-volver-zonas" onClick={() => setPaso("espana")}>← España</button>
        <h1>¿Por dónde te apetece?</h1>
        <p>Toca una o varias zonas de {datos.comunidad}. O entra directamente a verlas todas.</p>
      </div>
      <MapaZonas zonas={datos.zonas} destinos={datos.destinos} seleccion={seleccion} onToggle={toggle} />
      <div className="v-entrada-acciones">
        <button className="v-ver" onClick={() => setPaso("resultados")}>
          Ver {conteo} {conteo === 1 ? "sitio" : "sitios"}
          {seleccion.length ? ` en ${seleccion.length} ${seleccion.length === 1 ? "zona" : "zonas"}` : ""} →
        </button>
      </div>
    </div>
  );
}
