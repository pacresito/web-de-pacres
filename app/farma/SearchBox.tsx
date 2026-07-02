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
        className="w-full rounded border border-neutral-300 px-3 py-2 pr-9 outline-none focus:border-neutral-500"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          title="Borrar"
          aria-label="Borrar"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
        >
          <XIcon />
        </button>
      )}
    </div>
  );
}
