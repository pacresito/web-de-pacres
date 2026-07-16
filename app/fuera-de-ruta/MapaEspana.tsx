"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { MAPA_ESPANA } from "@/data/fuera-de-ruta/espana-mapa";
import { slugProvincia } from "@/lib/fuera-de-ruta/provincias";

// S1 · Portada «España como hoja de pegatinas» (Río pop, F2).
// El SVG real de provincias con tratamiento pegatina: las disponibles despegadas
// (Lima, trazo Tinta, sombra dura con el mismo path desplazado +6,+7) y clicables
// con el mismo peso; el resto en papel con trazo discontinuo y tooltip "próximamente".
// Geometría en data/fuera-de-ruta/espana-mapa.ts (generada, no a mano). Las tarjetas de
// provincia (fr-s1-provcard) son las que dan nombre y tap; el mapa es el escaparate.
//
// Las tarjetas son enlaces de verdad (crawlables, abribles en pestaña nueva); los
// paths del SVG navegan con el router, que un <path> no es un enlace y el escaparate
// no tiene por qué serlo.

export default function MapaEspana({ disponibles }: {
  disponibles: string[];               // provincias clicables (mismo peso), por name
}) {
  const router = useRouter();
  const { viewBox, inset, provincias } = MAPA_ESPANA;
  const activa = new Set(disponibles);
  const href = (name: string) => `/fuera-de-ruta/${slugProvincia(name)}`;
  const abrir = (name: string) => provincias.find((p) => p.name === name) && router.push(href(name));

  return (
    <>
      <div className="fr-s1">
        <div className="fr-s1-panel">
          <span className="fr-sticker">hecho a mano por Cris — sin algoritmos</span>
          <h1 className="fr-s1-h1">Elige tu<br />des<span>tino</span></h1>
          <p className="fr-s1-lead">
            Nada de listas infinitas: cada sitio está elegido uno a uno. Toca una provincia y descubre sus rincones.
          </p>
          <div className="fr-s1-provs">
            {disponibles.map((name) => (
              <Link key={name} href={href(name)} className="fr-s1-provcard">
                <span className="fr-s1-provcard-nombre">{name}</span>
                <span className="fr-s1-provcard-flecha">→</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="fr-s1-mapa">
          <svg viewBox={viewBox} role="img" aria-label={`Mapa de España; ${disponibles.join(", ")} disponibles`}>
            <rect className="fr-inset" x={inset.x} y={inset.y} width={inset.w} height={inset.h} rx="12" />

            <g className="fr-prov-grupo">
              {provincias.filter((p) => !activa.has(p.name)).map((p) => (
                <path key={p.name} d={p.d} className="fr-prov">
                  <title>Próximamente</title>
                </path>
              ))}
            </g>

            {/* Sombras primero (todas) para que ninguna se cuele sobre una provincia vecina */}
            {provincias.filter((p) => activa.has(p.name)).map((p) => (
              <path key={p.name} d={p.d} className="fr-prov-sombra" transform="translate(6,7)" />
            ))}
            {provincias.filter((p) => activa.has(p.name)).map((p) => (
              <path key={p.name} d={p.d} className="fr-prov-on" role="button" tabIndex={0}
                aria-label={`Explorar ${p.name}`}
                onClick={() => abrir(p.name)}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), abrir(p.name))}>
                <title>{p.name}</title>
              </path>
            ))}
          </svg>

          <div className="fr-s1-leyenda">
            <span className="fr-s1-ley fr-s1-ley--on"><i />disponible</span>
            <span className="fr-s1-ley fr-s1-ley--off"><i />próximamente</span>
          </div>
        </div>
      </div>

      <div className="fr-s1-pie">
        <span className="fr-s1-pie-cta">
          ¿Conoces un sitio que debería estar aquí?{" "}
          <a href="mailto:hola@pacr.es">Escríbele a Cris</a>
        </span>
      </div>
    </>
  );
}
