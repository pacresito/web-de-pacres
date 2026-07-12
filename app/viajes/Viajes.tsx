"use client";

import { useMemo, useState } from "react";
import type { DatosViajes } from "@/lib/viajes/tipos";
import type { Filtros } from "@/lib/viajes/filtrar";
import { parsearEncargo, type Encargo } from "@/lib/viajes/planificador/encargo";
import CrearViaje from "./CrearViaje";
import Explorador from "./Explorador";
import MapaEspana from "./MapaEspana";
import MapaZonas from "./MapaZonas";

// Asistente de /viajes: España (elegir comunidad) → zonas (elegir zonas sobre el
// mapa) → resultados. La selección de zonas alimenta el filtro `zona` del
// Explorador, que no cambia su lógica — solo recibe el valor inicial. Los mapas de
// España y zonas son SVG puro (Río pop, F2): sin Leaflet, se renderizan sin más.

// Encargo llegado por URL (Compartir): se lee una vez al montar (solo cliente).
const encargoDeUrl = (): Encargo | null =>
  typeof window === "undefined" ? null : parsearEncargo(new URLSearchParams(window.location.search).get("plan"));

export default function Viajes({ datos }: { datos: DatosViajes }) {
  // España → zonas → resultados. `seleccion` (zonas) se conserva al volver.
  const [compartido, setCompartido] = useState<Encargo | null>(encargoDeUrl);
  const [filtrosCompartidos, setFiltrosCompartidos] = useState<Filtros | undefined>();
  const [paso, setPaso] = useState<"espana" | "zonas" | "resultados">(() => (encargoDeUrl() ? "resultados" : "espana"));
  const [seleccion, setSeleccion] = useState<string[]>([]);

  const conteo = useMemo(
    () => (seleccion.length ? datos.destinos.filter((d) => seleccion.includes(d.zona)).length : datos.destinos.length),
    [datos.destinos, seleccion],
  );

  // Enlace compartido: se reproduce el encargo directamente en el paso 2 del
  // planificador. Al editar, se cae al explorador con esos mismos filtros.
  if (compartido) {
    return (
      <CrearViaje
        datos={datos}
        filtros={compartido.filtros}
        inicial={compartido}
        onVolver={() => {
          setFiltrosCompartidos(compartido.filtros);
          setCompartido(null);
          window.history.replaceState(null, "", "/viajes");
        }}
      />
    );
  }

  if (paso === "espana") {
    return (
      <MapaEspana
        comunidad={datos.comunidad}
        total={datos.destinos.length}
        zonas={datos.zonas.length}
        onEntrar={() => setPaso("zonas")}
      />
    );
  }

  if (paso === "resultados") {
    return (
      <Explorador
        datos={datos}
        zonaInicial={seleccion}
        filtrosInicial={filtrosCompartidos}
        onCambiarZonas={() => setPaso("zonas")}
        onVolverEspana={() => setPaso("espana")}
      />
    );
  }

  const toggle = (id: string) =>
    setSeleccion((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const textoVer = seleccion.length
    ? `Ver ${conteo} ${conteo === 1 ? "sitio" : "sitios"} →`
    : `Ver los ${datos.destinos.length} sitios →`;

  return (
    <div className="fr-s2">
      <div className="fr-s2-crumbs">
        <button className="fr-crumb" onClick={() => setPaso("espana")}>‹ España</button>
        <span className="fr-crumb fr-crumb--on">{datos.comunidad}</span>
      </div>

      <div className="fr-s2-grid">
        <div className="fr-s2-col-mapa">
          <h1 className="fr-s2-h1">¿Por dónde te apetece?</h1>
          <p className="fr-s2-lead">Marca una o varias zonas — o ninguna, y verás {datos.comunidad} entera.</p>
          <MapaZonas zonas={datos.zonas} destinos={datos.destinos} seleccion={seleccion} onToggle={toggle} />
          <div className="fr-s2-chips">
            {datos.zonas.map((z) => {
              const sel = seleccion.includes(z.id);
              return (
                <button key={z.id} className={`fr-chip${sel ? " fr-chip--activo" : ""}`} onClick={() => toggle(z.id)}>
                  {z.nombre}{sel ? " ×" : ""}
                </button>
              );
            })}
          </div>
        </div>

        <div className="fr-s2-lista">
          <span className="fr-mono">las mismas zonas, en lista</span>
          {datos.zonas.map((z) => {
            const sel = seleccion.includes(z.id);
            const n = datos.destinos.filter((d) => d.zona === z.id).length;
            return (
              <button key={z.id} className={`fr-s2-fila${sel ? " fr-s2-fila--on" : ""}`} onClick={() => toggle(z.id)}>
                <span className="fr-s2-radio">{sel && <span className="fr-s2-radio-check" />}</span>
                <span className="fr-s2-fila-n">{z.nombre}</span>
                <span className="fr-s2-fila-c">{n} {n === 1 ? "sitio" : "sitios"}</span>
              </button>
            );
          })}
          <button className="fr-btn fr-btn--primario fr-s2-ver" onClick={() => setPaso("resultados")}>{textoVer}</button>
          <button className="fr-btn fr-btn--terciario fr-s2-volver" onClick={() => setPaso("espana")}>‹ Volver a España</button>
        </div>
      </div>

      <div className="fr-s2-barra">
        <button className="fr-btn fr-btn--terciario" onClick={() => setPaso("espana")}>‹ España</button>
        <button className="fr-btn fr-btn--primario fr-s2-barra-ver" onClick={() => setPaso("resultados")}>{textoVer}</button>
      </div>
    </div>
  );
}
