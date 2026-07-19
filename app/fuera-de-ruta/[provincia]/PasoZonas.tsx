"use client";

import Link from "next/link";
import { Fragment, useState } from "react";
import type { ProvinciaMapa } from "@/data/fuera-de-ruta/zonas-mapa";
import type { Destino } from "@/lib/fuera-de-ruta/tipos";
import { filtrosAQuery } from "@/lib/fuera-de-ruta/url-filtros";
import MapaZonas from "../MapaZonas";

// S2 · Elegir zonas sobre el mapa de la provincia. Común a las 4: las que no tienen
// destinos (`destinos === null`) enseñan las mismas pantallas y copys sin recuentos y
// con el CTA desactivado — se leen como producto real aunque no haya nada que ver.
//
// La selección es estado local y se confirma al pulsar «Ver sitios»: es entonces
// cuando se vuelca a la URL del explorador (`?zona=…`). Marcar zonas no es navegar.

// El CTA es enlace cuando lleva a algún sitio y botón muerto cuando no: un <a>
// deshabilitado no existe, y un enlace a ninguna parte confunde al teclado.
function BotonVer({ href, texto, activo, className }: {
  href: string;
  texto: string;
  activo: boolean;
  className: string;
}) {
  const clase = `fr-btn fr-btn--primario ${className}`;
  return activo
    ? <Link href={href} className={clase}>{texto}</Link>
    : <button className={clase} disabled>{texto}</button>;
}

// Provincia de escaparate (sin datos): explica que Cris aún la prepara y enlaza a las
// que sí se pueden visitar. Se pinta bajo el CTA «Ver sitios» (desactivado en esos casos).
function MensajeEscaparate({ nombre, otras, className }: {
  nombre: string;
  otras: { slug: string; nombre: string }[];
  className?: string;
}) {
  if (!otras.length) return null;
  return (
    <p className={`fr-s2-esc${className ? ` ${className}` : ""}`}>
      Cris todavía está preparando {nombre}. Mientras tanto puedes visitar{" "}
      {otras.map((p, i) => (
        <Fragment key={p.slug}>
          {i > 0 && (i === otras.length - 1 ? " y " : ", ")}
          <Link href={`/fuera-de-ruta/${p.slug}`} className="fr-s2-esc-link">{p.nombre}</Link>
        </Fragment>
      ))}
      .
    </p>
  );
}

export default function PasoZonas({ provincia, nombre, mapa, destinos, otrasConDatos }: {
  provincia: string;              // slug de URL ("navarra")
  nombre: string;                 // nombre para mostrar ("Navarra")
  mapa: ProvinciaMapa;
  destinos: Destino[] | null;     // null = provincia de escaparate (sin datos)
  otrasConDatos: { slug: string; nombre: string }[]; // adonde redirigir si es escaparate
}) {
  const [seleccion, setSeleccion] = useState<string[]>([]);

  const tieneDatos = destinos !== null;
  const conteoZona = (id: string) => destinos?.filter((d) => d.zona === id).length ?? 0;
  const total = !destinos
    ? 0
    : seleccion.length
      ? destinos.filter((d) => seleccion.includes(d.zona)).length
      : destinos.length;

  const toggle = (id: string) =>
    setSeleccion((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const query = filtrosAQuery({ zona: seleccion.length ? seleccion : undefined });
  const hrefSitios = `/fuera-de-ruta/${provincia}/sitios${query ? `?${query}` : ""}`;
  const textoVer = !tieneDatos
    ? "Ver sitios →"
    : seleccion.length
      ? `Ver ${total} ${total === 1 ? "sitio" : "sitios"} →`
      : `Ver los ${total} sitios →`;

  return (
    <div className="fr-s2">
      <div className="fr-s2-crumbs">
        <Link href="/fuera-de-ruta" className="fr-crumb">‹ España</Link>
        <span className="fr-crumb fr-crumb--on">{nombre}</span>
      </div>

      <div className="fr-s2-grid">
        <div className="fr-s2-col-mapa">
          <h1 className="fr-s2-h1">¿Por dónde te apetece?</h1>
          <p className="fr-s2-lead">Marca una o varias zonas — o ninguna, y verás {nombre} entera.</p>
          <MapaZonas region={nombre} viewBox={mapa.viewBox} zonas={mapa.zonas}
            seleccion={seleccion} onToggle={toggle} />
          <div className="fr-s2-chips">
            {mapa.zonas.map((z) => {
              const sel = seleccion.includes(z.id);
              return (
                <button key={z.id} className={`fr-chip${sel ? " fr-chip--activo" : ""}`} onClick={() => toggle(z.id)}>
                  {z.nombre}{sel ? " ×" : ""}
                </button>
              );
            })}
          </div>
          {!tieneDatos && (
            <MensajeEscaparate nombre={nombre} otras={otrasConDatos} className="fr-s2-esc--movil" />
          )}
        </div>

        <div className="fr-s2-lista">
          <span className="fr-mono">las mismas zonas, en lista</span>
          {mapa.zonas.map((z) => {
            const sel = seleccion.includes(z.id);
            return (
              <button key={z.id} className={`fr-s2-fila${sel ? " fr-s2-fila--on" : ""}`} onClick={() => toggle(z.id)}>
                <span className="fr-s2-radio">{sel && <span className="fr-s2-radio-check" />}</span>
                <span className="fr-s2-fila-n">{z.nombre}</span>
                {tieneDatos && <span className="fr-s2-fila-c">{conteoZona(z.id)} {conteoZona(z.id) === 1 ? "sitio" : "sitios"}</span>}
              </button>
            );
          })}
          <BotonVer href={hrefSitios} texto={textoVer} activo={tieneDatos} className="fr-s2-ver" />
          {!tieneDatos && <MensajeEscaparate nombre={nombre} otras={otrasConDatos} />}
          <Link href="/fuera-de-ruta" className="fr-btn fr-btn--terciario fr-s2-volver">‹ Volver a España</Link>
        </div>
      </div>

      <div className="fr-s2-barra">
        <Link href="/fuera-de-ruta" className="fr-btn fr-btn--terciario">‹ España</Link>
        <BotonVer href={hrefSitios} texto={textoVer} activo={tieneDatos} className="fr-s2-barra-ver" />
      </div>
    </div>
  );
}
