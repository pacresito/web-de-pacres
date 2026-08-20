"use client";

// La línea de fotos de una persona, que se lee igual en los dos sitios donde aparece: en la
// ficha, donde es el campo que las descubre, y bajo el visor, donde además dice cuál se está
// mirando. Es una sola pieza porque es una sola cosa: sus fotos, en el orden en que se vivieron.

import type { FotoEnFicha } from "@/lib/arbol/fotos";

export default function Fotos({
  fotos,
  /** Cuál se está mirando, si es que se está mirando alguna: esa se lee, no se pulsa. */
  actual,
  onFoto,
}: {
  fotos: FotoEnFicha[];
  actual?: string;
  onFoto: (clave: string) => void;
}) {
  return (
    <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
      {fotos.map((f, i) => (
        <span key={f.clave} className="flex items-baseline gap-x-2">
          {i > 0 && <span className="text-[var(--mut)]">·</span>}
          {f.clave === actual ? (
            <span className="font-semibold text-[var(--ink)]" aria-current="true">
              {f.rotulo}
            </span>
          ) : (
            <button
              type="button"
              onClick={() => onFoto(f.clave)}
              className="text-[var(--mut)] underline decoration-[var(--line)] underline-offset-[3px] hover:text-[var(--ink)] active:text-[var(--ink)]"
            >
              {f.rotulo}
            </button>
          )}
        </span>
      ))}
    </span>
  );
}
