import { MAPA_ESPANA } from "@/data/viajes/espana-mapa";

// Pantalla inicial de /viajes (hero): mapa de España en SVG. Solo Navarra está
// activa (verde, con glow y pulso, clicable); el resto de provincias apagadas —
// "próximamente". Canarias en el recuadro insertado. Es un prototipo: se enseña
// el mapa completo aunque solo haya datos de Navarra, para que Cris vea la idea.
// Datos de geometría en data/viajes/espana-mapa.ts (generados, no a mano).

const ACTIVA = "Navarra";

export default function MapaEspana({ comunidad, total, onEntrar }: {
  comunidad: string;   // nombre de la comunidad activa
  total: number;       // nº de destinos (para la etiqueta)
  onEntrar: () => void;
}) {
  const { viewBox, inset, provincias } = MAPA_ESPANA;
  const activa = provincias.find((p) => p.name === ACTIVA)!;
  const bx = activa.cx;
  const by = activa.cy - 78; // globo por encima de la comunidad (zona norte, vacía)

  return (
    <div className="v-espana">
      <div className="v-espana-head">
        <h1>Elige tu destino</h1>
        <p>Empezamos por <strong>{comunidad}</strong>. Pronto, más rincones de España.</p>
      </div>

      <svg className="v-espana-svg" viewBox={viewBox} role="img" aria-label={`Mapa de España; ${comunidad} disponible`}>
        <defs>
          <filter id="v-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feDropShadow dx="0" dy="0" stdDeviation="7" floodColor="#2f7d4f" floodOpacity="0.55" />
          </filter>
        </defs>

        <rect className="v-inset" x={inset.x} y={inset.y} width={inset.w} height={inset.h} rx="8" />

        {provincias.filter((p) => p.name !== ACTIVA).map((p) => (
          <path key={p.name} d={p.d} className="v-prov">
            <title>Próximamente</title>
          </path>
        ))}

        <g
          className="v-activa"
          role="button"
          tabIndex={0}
          aria-label={`Explorar ${comunidad}`}
          onClick={onEntrar}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onEntrar())}
        >
          <path d={activa.d} className="v-prov-on" filter="url(#v-glow)" />
          <circle className="v-pulso" cx={activa.cx} cy={activa.cy} r="7" />
          <circle className="v-punto" cx={activa.cx} cy={activa.cy} r="4.5" />
          <line className="v-callout-linea" x1={activa.cx} y1={activa.cy} x2={bx} y2={by + 22} />
          <rect className="v-callout-caja" x={bx - 78} y={by - 24} width="156" height="48" rx="10" />
          <text className="v-callout-t1" x={bx} y={by - 3} textAnchor="middle">{comunidad}</text>
          <text className="v-callout-t2" x={bx} y={by + 17} textAnchor="middle">{total} sitios · toca aquí</text>
        </g>
      </svg>

      <button className="v-ver" onClick={onEntrar}>Explorar {comunidad} →</button>
    </div>
  );
}
