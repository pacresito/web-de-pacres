import type { Zona, Destino } from "@/lib/viajes/tipos";

// S2 · Mapa de zonas «hoja de pegatinas» (Río pop, F2).
// Las 5 zonas de Navarra como polígonos pegatina en SVG puro (antes Leaflet):
// seleccionada = Lima + trazo Tinta + sombra path-desplazada + badge check;
// no seleccionada = papel + trazo Tinta + badge "+". Mapa y lista comparten
// estado (Viajes.tsx). La geometría es de presentación —no dato curado de Cris—,
// heredada del handoff de diseño; los ids se mapean por posición norte→sur.
// Etiquetas dentro del SVG (<text>) para que escalen con el mapa en cualquier
// ancho; los nombres reales, más largos que los del mock, se parten en dos líneas.

type ZonaSvg = {
  id: string;
  path: string;
  badge: [number, number];   // centro del badge (coords SVG)
  label: [number, number];   // centro de la etiqueta (coords SVG)
};

const ZONAS_SVG: ZonaSvg[] = [
  { id: "baztan-otsondo", path: "M62,22 L198,12 L210,92 L92,112 Z", badge: [196, 34], label: [140, 59] },
  { id: "irati-aezkoa", path: "M222,16 L358,42 L368,142 L232,122 Z", badge: [352, 52], label: [295, 80] },
  { id: "urbasa-andia", path: "M32,124 L152,116 L162,222 L62,242 L20,182 Z", badge: [150, 132], label: [86, 177] },
  { id: "tierra-estella", path: "M172,132 L340,154 L330,262 L172,258 Z", badge: [330, 168], label: [254, 202] },
  { id: "ribera", path: "M104,272 L298,276 L282,392 L142,382 Z", badge: [288, 290], label: [206, 331] },
];

// Parte un nombre largo en dos líneas equilibradas por palabras (cabe en el polígono).
function dosLineas(nombre: string): string[] {
  const palabras = nombre.split(" ");
  if (nombre.length <= 14 || palabras.length === 1) return [nombre];
  let corte = 1, mejor = Infinity;
  for (let i = 1; i < palabras.length; i++) {
    const dif = Math.abs(palabras.slice(0, i).join(" ").length - palabras.slice(i).join(" ").length);
    if (dif < mejor) { mejor = dif; corte = i; }
  }
  return [palabras.slice(0, corte).join(" "), palabras.slice(corte).join(" ")];
}

export default function MapaZonas({ zonas, destinos, seleccion, onToggle }: {
  zonas: Zona[];
  destinos: Destino[];
  seleccion: string[];
  onToggle: (id: string) => void;
}) {
  const nombre = (id: string) => zonas.find((z) => z.id === id)?.nombre ?? id;
  const conteo = (id: string) => destinos.filter((d) => d.zona === id).length;

  return (
    <div className="fr-s2-mapa">
      <svg viewBox="0 0 400 430" role="group" aria-label="Zonas de Navarra">
        {ZONAS_SVG.map((z) => {
          const sel = seleccion.includes(z.id);
          const [bx, by] = z.badge;
          const [lx, ly] = z.label;
          const lineas = dosLineas(nombre(z.id));
          const n = conteo(z.id);
          // Bloque centrado en (lx, ly): líneas del nombre + recuento debajo.
          const y0 = ly - (lineas.length * 16) / 2;
          return (
            <g key={z.id} className="fr-zona" role="button" tabIndex={0}
              aria-pressed={sel} aria-label={`${nombre(z.id)}, ${n} sitios`}
              onClick={() => onToggle(z.id)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onToggle(z.id))}>
              {sel && <path d={z.path} transform="translate(5,6)" className="fr-zona-sombra" />}
              <path d={z.path} className={sel ? "fr-zona-on" : "fr-zona-off"} />
              {sel ? (
                <>
                  <circle cx={bx} cy={by} r="13" className="fr-zona-badge-on" />
                  <path d={`M${bx - 6},${by} L${bx - 1},${by + 5} L${bx + 7},${by - 5}`}
                    className="fr-zona-check" fill="none" />
                </>
              ) : (
                <>
                  <circle cx={bx} cy={by} r="12" className="fr-zona-badge-off" />
                  <path d={`M${bx},${by - 5} L${bx},${by + 5} M${bx - 5},${by} L${bx + 5},${by}`}
                    className="fr-zona-mas" />
                </>
              )}
              <text className="fr-zona-nombre" textAnchor="middle">
                {lineas.map((linea, i) => (
                  <tspan key={i} x={lx} y={y0 + i * 16}>{linea}</tspan>
                ))}
              </text>
              <text className={`fr-zona-conteo${sel ? " fr-zona-conteo--on" : ""}`}
                textAnchor="middle" x={lx} y={y0 + lineas.length * 16 + 2}>
                {n} {n === 1 ? "sitio" : "sitios"}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
