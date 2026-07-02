"use client";

import { XIcon } from "./icons";

// Caja de búsqueda de texto con botón para borrar (aspa a la derecha, al estilo Google):
// aparece solo cuando hay texto. La usan Inventario y Descuentos. (El autocompletar de
// Prioridades es otro componente, Buscador.tsx.)
export default function SearchBox({
  value,
  onChange,
  placeholder,
  autoFocus,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string; // ancho/layout del contenedor (p. ej. "flex-1")
}) {
  return (
    <div className={`relative ${className ?? ""}`}>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="fa-input"
        style={{ paddingRight: "2.25rem" }}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          title="Borrar"
          aria-label="Borrar"
          className="fa-t-muted2 absolute right-2 top-1/2 -translate-y-1/2 hover:text-[color:var(--fa-ink3)]"
        >
          <XIcon />
        </button>
      )}
    </div>
  );
}
