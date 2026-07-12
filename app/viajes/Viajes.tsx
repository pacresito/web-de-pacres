"use client";

import { useState } from "react";
import type { DatosViajes } from "@/lib/viajes/tipos";
import type { Filtros } from "@/lib/viajes/filtrar";
import { parsearEncargo, type Encargo } from "@/lib/viajes/planificador/encargo";
import { ZONAS_MAPA } from "@/data/viajes/zonas-mapa";
import CrearViaje from "./CrearViaje";
import Explorador from "./Explorador";
import MapaEspana from "./MapaEspana";
import MapaZonas from "./MapaZonas";

// Asistente de /viajes: España (elegir provincia) → zonas (elegir zonas sobre el
// mapa) → resultados. Las 4 provincias del mapa se eligen con el mismo peso; solo
// Navarra tiene datos (`datos.comunidad`), el resto son escaparate: mismas pantallas
// y copys, pero sin recuentos y con el CTA «Ver sitios» desactivado. La selección de
// zonas alimenta el filtro `zona` del Explorador (solo Navarra llega ahí). Los mapas
// son SVG puro (Río pop, F2): sin Leaflet, se renderizan sin más.

// Encargo llegado por URL (Compartir): se lee una vez al montar (solo cliente).
const encargoDeUrl = (): Encargo | null =>
  typeof window === "undefined" ? null : parsearEncargo(new URLSearchParams(window.location.search).get("plan"));

export default function Viajes({ datos }: { datos: DatosViajes }) {
  // España → zonas → resultados. `seleccion` (zonas) se conserva al volver.
  const [compartido, setCompartido] = useState<Encargo | null>(encargoDeUrl);
  const [filtrosCompartidos, setFiltrosCompartidos] = useState<Filtros | undefined>();
  const [paso, setPaso] = useState<"espana" | "zonas" | "resultados">(() => (encargoDeUrl() ? "resultados" : "espana"));
  const [activa, setActiva] = useState(datos.comunidad);   // provincia en el paso de zonas
  const [seleccion, setSeleccion] = useState<string[]>([]);

  const disponibles = Object.keys(ZONAS_MAPA);

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
        disponibles={disponibles}
        onEntrar={(region) => { setActiva(region); setSeleccion([]); setPaso("zonas"); }}
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

  // Paso de zonas (común a las 4 provincias). Solo Navarra tiene datos.
  const prov = ZONAS_MAPA[activa];
  const tieneDatos = activa === datos.comunidad;
  const conteoZona = (id: string) => datos.destinos.filter((d) => d.zona === id).length;
  const total = seleccion.length ? datos.destinos.filter((d) => seleccion.includes(d.zona)).length : datos.destinos.length;

  const toggle = (id: string) =>
    setSeleccion((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const irResultados = () => tieneDatos && setPaso("resultados");
  const textoVer = !tieneDatos
    ? "Ver sitios →"
    : seleccion.length
      ? `Ver ${total} ${total === 1 ? "sitio" : "sitios"} →`
      : `Ver los ${datos.destinos.length} sitios →`;

  return (
    <div className="fr-s2">
      <div className="fr-s2-crumbs">
        <button className="fr-crumb" onClick={() => setPaso("espana")}>‹ España</button>
        <span className="fr-crumb fr-crumb--on">{activa}</span>
      </div>

      <div className="fr-s2-grid">
        <div className="fr-s2-col-mapa">
          <h1 className="fr-s2-h1">¿Por dónde te apetece?</h1>
          <p className="fr-s2-lead">Marca una o varias zonas — o ninguna, y verás {activa} entera.</p>
          <MapaZonas region={activa} viewBox={prov.viewBox} zonas={prov.zonas}
            seleccion={seleccion} onToggle={toggle} conteo={tieneDatos ? conteoZona : undefined} />
          <div className="fr-s2-chips">
            {prov.zonas.map((z) => {
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
          {prov.zonas.map((z) => {
            const sel = seleccion.includes(z.id);
            const n = tieneDatos ? conteoZona(z.id) : null;
            return (
              <button key={z.id} className={`fr-s2-fila${sel ? " fr-s2-fila--on" : ""}`} onClick={() => toggle(z.id)}>
                <span className="fr-s2-radio">{sel && <span className="fr-s2-radio-check" />}</span>
                <span className="fr-s2-fila-n">{z.nombre}</span>
                {n !== null && <span className="fr-s2-fila-c">{n} {n === 1 ? "sitio" : "sitios"}</span>}
              </button>
            );
          })}
          <button className="fr-btn fr-btn--primario fr-s2-ver" disabled={!tieneDatos} onClick={irResultados}>{textoVer}</button>
          <button className="fr-btn fr-btn--terciario fr-s2-volver" onClick={() => setPaso("espana")}>‹ Volver a España</button>
        </div>
      </div>

      <div className="fr-s2-barra">
        <button className="fr-btn fr-btn--terciario" onClick={() => setPaso("espana")}>‹ España</button>
        <button className="fr-btn fr-btn--primario fr-s2-barra-ver" disabled={!tieneDatos} onClick={irResultados}>{textoVer}</button>
      </div>
    </div>
  );
}
