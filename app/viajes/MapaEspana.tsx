import { MAPA_ESPANA } from "@/data/viajes/espana-mapa";

// S1 · Portada «España como hoja de pegatinas» (Río pop, F2).
// El SVG real de provincias con tratamiento pegatina: Navarra despegada (Lima,
// trazo Tinta 3px, sombra dura con el mismo path desplazado +6,+7), el resto en
// papel con trazo discontinuo y tooltip "próximamente". Un solo tap posible.
// Geometría en data/viajes/espana-mapa.ts (generada, no a mano).

const ACTIVA = "Navarra";

export default function MapaEspana({ comunidad, total, zonas, onEntrar }: {
  comunidad: string;   // nombre de la comunidad activa
  total: number;       // nº de destinos (para la etiqueta)
  zonas: number;       // nº de zonas (para la etiqueta)
  onEntrar: () => void;
}) {
  const { viewBox, inset, provincias } = MAPA_ESPANA;
  const activa = provincias.find((p) => p.name === ACTIVA)!;
  // El callout se ancla como overlay sobre el polígono (posición en % del viewBox).
  const [vbW, vbH] = viewBox.split(" ").slice(2).map(Number);
  const navX = (activa.cx / vbW) * 100;
  const navY = (activa.cy / vbH) * 100;

  return (
    <>
      <div className="fr-s1">
        <div className="fr-s1-panel">
          <span className="fr-sticker">hecho a mano por Cris — sin algoritmos</span>
          <h1 className="fr-s1-h1">Elige tu<br />des<span>tino</span></h1>
          <p className="fr-s1-lead">
            Nada de listas infinitas: cada sitio está elegido uno a uno. Empezamos por{" "}
            <strong>{comunidad}</strong> — el resto de España se irá despegando poco a poco.
          </p>
          <div className="fr-s1-cta">
            <button className="fr-btn fr-btn--primario" onClick={onEntrar}>Explorar {comunidad} →</button>
            <span className="fr-s1-cta-meta">{total} sitios · {zonas} zonas</span>
          </div>
        </div>

        <div className="fr-s1-mapa">
          <svg viewBox={viewBox} role="img" aria-label={`Mapa de España; ${comunidad} disponible`}>
            <rect className="fr-inset" x={inset.x} y={inset.y} width={inset.w} height={inset.h} rx="12" />

            <g className="fr-prov-grupo">
              {provincias.filter((p) => p.name !== ACTIVA).map((p) => (
                <path key={p.name} d={p.d} className="fr-prov">
                  <title>Próximamente</title>
                </path>
              ))}
            </g>

            <path d={activa.d} className="fr-prov-sombra" transform="translate(6,7)" />
            <path d={activa.d} className="fr-prov-on" role="button" tabIndex={0}
              aria-label={`Explorar ${comunidad}`}
              onClick={onEntrar}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onEntrar())}
            />
          </svg>

          <button className="fr-s1-callout" onClick={onEntrar}
            style={{ left: `${navX + 4}%`, top: `${Math.max(navY - 14, 0)}%` }}>
            <span className="fr-s1-callout-t1">{comunidad}</span>
            <span className="fr-s1-callout-t2">{total} sitios · toca para entrar</span>
          </button>
          <span className="fr-s1-flecha" style={{ left: `${navX}%`, top: `${navY - 3}%` }} />
        </div>

        <button className="fr-s1-navcard" onClick={onEntrar} aria-label={`Explorar ${comunidad}`}>
          <span className="fr-s1-navcard-badge">{total}</span>
          <span className="fr-s1-navcard-txt">
            <span className="fr-s1-navcard-nombre">{comunidad}</span>
            <span className="fr-s1-navcard-sub">{total} sitios en {zonas} zonas</span>
          </span>
          <span className="fr-s1-navcard-flecha">→</span>
        </button>

        <div className="fr-s1-leyenda">
          <span className="fr-s1-ley fr-s1-ley--on"><i />disponible</span>
          <span className="fr-s1-ley fr-s1-ley--off"><i />próximamente</span>
        </div>
      </div>

      <div className="fr-s1-pie">
        <span className="fr-mono">una sección de pacr.es</span>
        <span className="fr-s1-pie-cta">
          ¿Conoces un sitio que debería estar aquí?{" "}
          <a href="mailto:hola@pacr.es">Escríbele a Cris</a>
        </span>
      </div>
    </>
  );
}
