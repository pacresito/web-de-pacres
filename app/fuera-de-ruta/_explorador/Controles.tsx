"use client";

// Los controles de filtro del explorador, sin estado propio: el dropdown-chip de
// escritorio, la opción multi-selección que comparten panel y hoja móvil, y los
// interruptores y segmentados. Quién guarda los filtros es el Explorador.

// Dropdown-chip de la fila 1 (escritorio): chip (Lima con valor cuando filtra) +
// panel flotante con opciones, "Limpiar <dimensión>" y "Listo". Cierra al clicar fuera.
export function Desplegable({ etiqueta, valor, titulo, abierto, onToggle, onCerrar, onLimpiar, alinear, children }: {
  etiqueta: string;
  valor?: string;            // resumen en el chip ("2", "‹ 5 km"); presente = activo
  titulo: string;
  abierto: boolean;
  onToggle: () => void;
  onCerrar: () => void;
  onLimpiar: () => void;
  alinear?: "der";           // panel alineado a la derecha (chips junto al borde)
  children: React.ReactNode;
}) {
  return (
    <div className="fr-s3-desp">
      <button className={`fr-s3-chip${valor ? " fr-s3-chip--on" : ""}`} aria-expanded={abierto} onClick={onToggle}>
        {etiqueta}{valor ? ` · ${valor}` : ""} {abierto ? "▴" : "▾"}
      </button>
      {abierto && (
        <>
          <div className="fr-s3-velo" onClick={onCerrar} />
          <div className={`fr-s3-panel${alinear ? " fr-s3-panel--der" : ""}`}>
            <span className="fr-mono">{titulo}</span>
            <div className="fr-s3-panel-chips">{children}</div>
            <div className="fr-s3-panel-pie">
              <button className="fr-s3-panel-limpiar" onClick={onLimpiar}>Limpiar {etiqueta.toLowerCase()}</button>
              <button className="fr-s3-listo" onClick={onCerrar}>Listo</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Opción multi-selección (panel escritorio y hoja móvil). Sin resultados (y sin
// marcar) = deshabilitada con "· 0".
export function Opcion({ texto, on, n, onClick }: { texto: string; on: boolean; n: number; onClick: () => void }) {
  const off = !on && n === 0;
  return (
    <button
      className={`fr-s3-opcion${on ? " fr-s3-opcion--on" : ""}${off ? " fr-s3-opcion--off" : ""}`}
      disabled={off}
      onClick={onClick}
    >
      {texto}{on ? " ×" : off ? " · 0" : ""}
    </button>
  );
}

// Toggle de la fila 2 escritorio (track 38×22, knob Tinta; on = track Lima, knob a la derecha).
export function Interruptor({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" className="fr-s3-toggle" data-on={on} aria-pressed={on} onClick={onClick}>
      <span className="fr-s3-track"><span className="fr-s3-knob" /></span>
      {children}
    </button>
  );
}

// Grupo de la hoja de filtros: micro-etiqueta mono + contenido (chips o segmentado).
export function Grupo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="fr-m3-grupo">
      <span className="fr-m3-grupo-lab">{label}</span>
      {children}
    </div>
  );
}

// Umbral como segmentado de valor único: cada opción alterna, "da igual" = sin filtro.
export function Segmentado<T extends string | number>({ opciones, valor, onElegir }: {
  opciones: { v: T; etq: string }[];
  valor: T | undefined;
  onElegir: (v: T | undefined) => void;
}) {
  return (
    <div className="fr-m3-seg">
      {opciones.map((o) => (
        <button key={o.v} type="button" aria-pressed={valor === o.v} onClick={() => onElegir(valor === o.v ? undefined : o.v)}>{o.etq}</button>
      ))}
      <button type="button" className="fr-m3-seg-igual" aria-pressed={valor === undefined} onClick={() => onElegir(undefined)}>da igual</button>
    </div>
  );
}

// Fila de extra en la hoja: etiqueta + toggle grande (44×26).
export function ExtraSwitch({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <div className="fr-m3-extra">
      <span>{label}</span>
      <button type="button" className="fr-m3-sw" aria-pressed={on} aria-label={label} onClick={onClick} />
    </div>
  );
}
