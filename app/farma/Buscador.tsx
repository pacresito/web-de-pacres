"use client";

import { useState } from "react";
import { coincide, contiene, filtrarFallback, sinAcentos } from "@/lib/farma/buscar";
import { XIcon } from "./icons";

// Buscador con autocompletar genérico (reutilizable: lo usan Prioridades y Pedidos).
// Filtra sin acentos, tolera pequeños typos (lib/farma/buscar), y emite onSelect. Aspa a
// la derecha para borrar.

export default function Buscador({
  items,
  onSelect,
  onClear,
  placeholder,
  autoFocus,
  inputClassName,
  buscarExtra,
}: {
  items: string[];
  onSelect: (item: string) => void;
  onClear?: () => void; // se llama al vaciar el campo con el aspa (para resetear el filtro del padre)
  placeholder?: string;
  autoFocus?: boolean;
  inputClassName?: string; // sobreescribe el estilo del campo (p. ej. skin UnycopWin en Prioridades)
  buscarExtra?: (item: string) => string; // texto extra buscable por ítem (p. ej. el código)
}) {
  const [q, setQ] = useState("");
  const [abierto, setAbierto] = useState(false);

  const consulta = sinAcentos(q.trim());
  const extra = (i: string) => (buscarExtra ? sinAcentos(buscarExtra(i)).includes(consulta) : false);
  const coincidencias = consulta
    ? filtrarFallback(items, (i) => contiene(i, consulta) || extra(i), (i) => coincide(i, consulta) || extra(i)).slice(0, 8)
    : [];

  function elegir(item: string) {
    setQ(item);
    setAbierto(false);
    onSelect(item);
  }

  return (
    <div className="relative">
      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setAbierto(true);
        }}
        onFocus={() => setAbierto(true)}
        onBlur={() => setTimeout(() => setAbierto(false), 120)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && coincidencias[0]) {
            e.preventDefault();
            elegir(coincidencias[0]);
          } else if (e.key === "Escape") {
            setAbierto(false);
          }
        }}
        placeholder={placeholder}
        autoFocus={autoFocus}
        style={{ paddingRight: "2rem" }} // hueco para el aspa (gana al padding del className)
        className={
          inputClassName ??
          "w-full rounded border border-neutral-300 px-3 py-2 outline-none focus:border-neutral-500"
        }
      />
      {q && (
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            setQ("");
            setAbierto(false);
            onClear?.();
          }}
          title="Borrar"
          aria-label="Borrar"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
        >
          <XIcon />
        </button>
      )}
      {abierto && coincidencias.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-72 w-full overflow-auto rounded border border-neutral-200 bg-white shadow">
          {coincidencias.map((item) => (
            <li key={item}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => elegir(item)}
                className="block w-full px-3 py-2 text-left hover:bg-neutral-100"
              >
                {item}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
