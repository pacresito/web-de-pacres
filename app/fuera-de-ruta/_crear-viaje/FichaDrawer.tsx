"use client";

import Link from "next/link";
import Image from "next/image";
import type { Destino } from "@/lib/fuera-de-ruta/tipos";
import Overlay from "./Overlay";

// Drawer superpuesto de «Ver más» (§4.10): una vista breve de la ficha sobre la propia
// pantalla, sin navegar. Muestra lo esencial —foto, qué es, datos, lo mejor y avisos— y
// deja añadir/quitar sin cerrar; el enlace a la ficha completa sí abre pestaña (acción
// deliberada de profundizar). Pinta solo lo que hay: todos los campos son opcionales.
export default function FichaDrawer({ destino: d, zona, provincia, elegida, onAlternar, onCerrar }: {
  destino: Destino;
  zona: string;
  provincia: string;
  elegida: boolean;
  onAlternar: () => void;
  onCerrar: () => void;
}) {
  const datos: string[] = [];
  if (d.duracion) datos.push(`🕒 ${d.duracion}`);
  if (d.dificultad) datos.push(`🥾 ${d.dificultad}`);
  if (d.distanciaKm) datos.push(`📏 ${d.distanciaKm[0]}–${d.distanciaKm[1]} km`);
  if (d.desnivelM) datos.push(`⛰ ${d.desnivelM[0]}–${d.desnivelM[1]} m`);
  if (d.bano) datos.push("💧 baño");
  if (d.ninos === false) datos.push("👶 no apto");
  if (d.perros === false) datos.push("🐕 no apto");

  return (
    <Overlay etiqueta={d.nombre} onCerrar={onCerrar}>
      <div className="fr-fd-scroll">
        <div className="fr-fd-foto">
          {d.imagen ? (
            <Image src={d.imagen} alt={d.nombre} fill sizes="(max-width: 720px) 100vw, 480px" />
          ) : (
            <div className="fr-d-card-fallback"><i className="fr-s3-foto-pronto">foto en camino</i></div>
          )}
          {d.favoritoDeCris && <span className="fr-d-card-fav">★ favorito de Cris</span>}
        </div>

        <div className="fr-fd-body">
          <span className="fr-d-card-meta">{zona} · {d.tipo}</span>
          <h2 className="fr-fd-nombre">{d.nombre}</h2>
          {d.queEs && <p className="fr-fd-lead">{d.queEs}</p>}

          {datos.length > 0 && (
            <div className="fr-fd-datos">
              {datos.map((t) => <span key={t} className="fr-d-dato">{t}</span>)}
            </div>
          )}
          {d.precio && <p className="fr-fd-precio">💶 {d.precio}</p>}

          {d.loMejor && d.loMejor.length > 0 && (
            <div className="fr-fd-lista">
              <span className="fr-fd-lista-t">Lo mejor</span>
              <ul>{d.loMejor.map((l) => <li key={l}>✅ {l}</li>)}</ul>
            </div>
          )}
          {d.antesDeIr && d.antesDeIr.length > 0 && (
            <div className="fr-fd-lista">
              <span className="fr-fd-lista-t">Antes de ir</span>
              <ul>{d.antesDeIr.map((l) => <li key={l}>⚠ {l}</li>)}</ul>
            </div>
          )}
        </div>
      </div>

      <div className="fr-fd-cta">
        <button
          className={`fr-btn fr-fd-anadir${elegida ? " fr-d-anadir--on" : " fr-btn--primario"}`}
          aria-pressed={elegida}
          onClick={onAlternar}
        >
          {elegida ? "✔ En tu viaje" : "+ Añadir a mi viaje"}
        </button>
        <Link href={`/fuera-de-ruta/${provincia}/${d.slug}`} target="_blank" rel="noopener" className="fr-s5-link fr-fd-completa">
          Ver ficha completa ↗
        </Link>
      </div>
    </Overlay>
  );
}
