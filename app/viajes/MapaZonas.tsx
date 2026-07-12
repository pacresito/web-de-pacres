import type { ZonaMapa } from "@/data/viajes/zonas-mapa";

// S2 · Mapa de zonas «hoja de pegatinas» (Río pop, F2).
// Las zonas de una provincia como polígonos pegatina en SVG puro (antes Leaflet):
// seleccionada = Lima + trazo Tinta + sombra path-desplazada + badge check;
// no seleccionada = papel + trazo Tinta + badge "+". Mapa y lista comparten estado
// (Viajes.tsx). La geometría (contorno real muy poligonal, partido en zonas) es dato
// GENERADO en `data/viajes/zonas-mapa.ts`, no curado. Las etiquetas van dentro del
// SVG (<text>) para que escalen con el mapa; los nombres largos se parten en dos
// líneas. `conteo` es opcional: sin él (provincias de escaparate) no se pinta el
// recuento, para que la ficha se lea como si hubiera datos.

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

export default function MapaZonas({ region, viewBox, zonas, seleccion, onToggle, conteo }: {
  region: string;
  viewBox: string;
  zonas: ZonaMapa[];
  seleccion: string[];
  onToggle: (id: string) => void;
  conteo?: (id: string) => number;   // si se pasa, muestra "N sitios"; si no, se oculta
}) {
  return (
    <div className="fr-s2-mapa">
      <svg viewBox={viewBox} role="group" aria-label={`Zonas de ${region}`}>
        {zonas.map((z) => {
          const sel = seleccion.includes(z.id);
          const [lx, ly] = z.label;
          const [bx, by] = z.badge;                       // esquina superior-derecha (sobresale)
          const lineas = dosLineas(z.nombre);
          const n = conteo?.(z.id);
          const y0 = ly - (lineas.length - 1) * 8;        // primera línea del nombre, centrada en ly
          const ariaN = n === undefined ? "" : `, ${n} ${n === 1 ? "sitio" : "sitios"}`;
          return (
            <g key={z.id} className="fr-zona" role="button" tabIndex={0}
              aria-pressed={sel} aria-label={`${z.nombre}${ariaN}`}
              onClick={() => onToggle(z.id)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onToggle(z.id))}>
              {sel && <path d={z.path} transform="translate(5,6)" className="fr-zona-sombra" />}
              <path d={z.path} className={sel ? "fr-zona-on" : "fr-zona-off"} />
              <text className="fr-zona-nombre" textAnchor="middle">
                {lineas.map((linea, i) => (
                  <tspan key={i} x={lx} y={y0 + i * 16}>{linea}</tspan>
                ))}
              </text>
              {n !== undefined && (
                <text className={`fr-zona-conteo${sel ? " fr-zona-conteo--on" : ""}`}
                  textAnchor="middle" x={lx} y={y0 + lineas.length * 16 + 1}>
                  {n} {n === 1 ? "sitio" : "sitios"}
                </text>
              )}
              {/* Badge al final para que sobresalga por encima del borde */}
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
            </g>
          );
        })}
      </svg>
    </div>
  );
}
