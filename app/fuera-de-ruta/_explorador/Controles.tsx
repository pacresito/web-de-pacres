"use client";

// Controles de filtro sin estado propio; los filtros los guarda el Explorador.

export function Desplegable({ etiqueta, valor, titulo, abierto, onToggle, onCerrar, onLimpiar, alinear, children }: {
  etiqueta: string;
  valor?: string;            // resumen en el chip; presente = activo
  titulo: string;
  abierto: boolean;
  onToggle: () => void;
  onCerrar: () => void;
  onLimpiar: () => void;
  alinear?: "der";           // para los chips junto al borde derecho
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

// Sin resultados y sin marcar, deshabilitada con "· 0".
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

export function Interruptor({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" className="fr-s3-toggle" data-on={on} aria-pressed={on} onClick={onClick}>
      <span className="fr-s3-track"><span className="fr-s3-knob" /></span>
      {children}
    </button>
  );
}

export function Grupo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="fr-m3-grupo">
      <span className="fr-m3-grupo-lab">{label}</span>
      {children}
    </div>
  );
}

// Umbral de valor único: "da igual" = sin filtro.
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

export function ExtraSwitch({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <div className="fr-m3-extra">
      <span>{label}</span>
      <button type="button" className="fr-m3-sw" aria-pressed={on} aria-label={label} onClick={onClick} />
    </div>
  );
}
