"use client";

// El botón redondo del borde: 44 px de papel con una línea alrededor. Lo llevan los tres
// que están puestos siempre —buscar, lo que se celebra y qué se ve—, y **ninguno lleva
// rótulo**: tres etiquetas fijas son tres cosas que leer cada vez que se mira el árbol, y
// lo que dicen no cambia nunca. El nombre va en el título y en la etiqueta accesible, que
// es donde se busca cuando hace falta.

export default function Redondo({
  etiqueta,
  onPulsar,
  className,
  style,
  children,
}: {
  etiqueta: string;
  onPulsar: () => void;
  className?: string;
  /** Lo que la clase no sabe decir: el `top` de quien cuelga de la regla. La sombra es suya. */
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onPulsar}
      title={etiqueta}
      aria-label={etiqueta}
      style={{ ...style, boxShadow: "var(--sh)" }}
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--paper)] leading-none text-[var(--mut)] ${className ?? ""}`}
    >
      {children}
    </button>
  );
}

/**
 * Los filtros: tres controles con el mando en un sitio distinto cada uno. El mando va
 * relleno de papel para comerse su trozo de línea —si no, la línea lo atraviesa y deja de
 * leerse como un control—, y ese relleno va por `style`: en SVG un atributo de
 * presentación no resuelve `var()`.
 */
export function IconoFiltros() {
  return (
    <svg width={19} height={19} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round">
      {[
        [5, 13],
        [10, 7],
        [15, 13],
      ].map(([y, cx]) => (
        <g key={y}>
          <line x1={2.5} y1={y} x2={17.5} y2={y} />
          <circle cx={cx} cy={y} r={2.4} style={{ fill: "var(--paper)" }} />
        </g>
      ))}
    </svg>
  );
}
