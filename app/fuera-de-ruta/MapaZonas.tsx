import type { ZonaMapa } from "@/data/fuera-de-ruta/zonas-mapa";

// Las etiquetas van en <text> para que escalen con el mapa. Sin recuento: una tercera
// línea no cabe en la zona más estrecha, y la lista de al lado ya lo da.

const LINEA = 15;   // alto de línea del nombre, en unidades del viewBox

// Siempre dos líneas equilibradas: el hueco de cada zona se calcula para dos (ALTO en
// build-zonas-mapa.mjs), y en una sola el nombre saldría demasiado ancho.
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
          const [bx, by] = z.badge;
          const lineas = dosLineas(z.nombre);
          return (
            <g key={z.id} className="fr-zona" role="button" tabIndex={0}
              aria-pressed={sel} aria-label={z.nombre}
              onClick={() => onToggle(z.id)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onToggle(z.id))}>
              {sel && <path d={z.path} transform="translate(5,6)" className="fr-zona-sombra" />}
              <path d={z.path} className={sel ? "fr-zona-on" : "fr-zona-off"} />
              {/* Centrado del bloque entero en `label`: cuadrar las líneas base lo deja alto. */}
              <text className="fr-zona-nombre" textAnchor="middle" dominantBaseline="central">
                {lineas.map((linea, i) => (
                  <tspan key={i} x={lx} y={ly + (i - (lineas.length - 1) / 2) * LINEA}>{linea}</tspan>
                ))}
              </text>
              {/* El badge al final, para que quede encima del borde. */}
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
