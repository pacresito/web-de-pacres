import type { ZonaMapa } from "@/data/viajes/zonas-mapa";

// S2 · Mapa de zonas «hoja de pegatinas» (Río pop, F2).
// Las zonas de una provincia como polígonos pegatina en SVG puro (antes Leaflet):
// seleccionada = Lima + trazo Tinta + sombra path-desplazada + badge check;
// no seleccionada = papel + trazo Tinta + badge "+". Mapa y lista comparten estado
// (Viajes.tsx). La geometría (contorno real muy poligonal, partido en zonas) es dato
// GENERADO en `data/viajes/zonas-mapa.ts`, no curado. Las etiquetas van dentro del
// SVG (<text>) para que escalen con el mapa; el nombre va siempre a dos líneas. El
// recuento de sitios no se pinta aquí: era una tercera línea que obligaba a encoger
// la tipografía hasta lo ilegible por culpa de la zona más estrecha, y la lista de al
// lado ya lo da.

const LINEA = 15;   // alto de línea del nombre, en unidades del viewBox

// Parte el nombre en dos líneas equilibradas por palabras. Siempre dos: el hueco de
// cada zona se busca para una etiqueta de dos líneas (ALTO en build-zonas-mapa.mjs),
// así que dejar un nombre corto en una sola línea lo haría demasiado ancho para su sitio.
function dosLineas(nombre: string): string[] {
  const palabras = nombre.split(" ");
  if (palabras.length === 1) return [nombre];
  let corte = 1, mejor = Infinity;
  for (let i = 1; i < palabras.length; i++) {
    const dif = Math.abs(palabras.slice(0, i).join(" ").length - palabras.slice(i).join(" ").length);
    if (dif < mejor) { mejor = dif; corte = i; }
  }
  return [palabras.slice(0, corte).join(" "), palabras.slice(corte).join(" ")];
}

export default function MapaZonas({ region, viewBox, zonas, seleccion, onToggle }: {
  region: string;
  viewBox: string;
  zonas: ZonaMapa[];
  seleccion: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="fr-s2-mapa">
      <svg viewBox={viewBox} role="group" aria-label={`Zonas de ${region}`}>
        {zonas.map((z) => {
          const sel = seleccion.includes(z.id);
          const [lx, ly] = z.label;
          const [bx, by] = z.badge;                       // esquina superior-derecha (sobresale)
          const lineas = dosLineas(z.nombre);
          return (
            <g key={z.id} className="fr-zona" role="button" tabIndex={0}
              aria-pressed={sel} aria-label={z.nombre}
              onClick={() => onToggle(z.id)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onToggle(z.id))}>
              {sel && <path d={z.path} transform="translate(5,6)" className="fr-zona-sombra" />}
              <path d={z.path} className={sel ? "fr-zona-on" : "fr-zona-off"} />
              {/* dominantBaseline central + el desplazamiento simétrico centran el bloque
                  entero en `label`: cuadrar las líneas base lo deja alto. */}
              <text className="fr-zona-nombre" textAnchor="middle" dominantBaseline="central">
                {lineas.map((linea, i) => (
                  <tspan key={i} x={lx} y={ly + (i - (lineas.length - 1) / 2) * LINEA}>{linea}</tspan>
                ))}
              </text>
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
