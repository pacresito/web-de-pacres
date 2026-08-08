"use client";

// La superficie donde se lee a alguien o lo que celebra la familia. Solo cabe una a la vez
// y **cerrarla no cambia nada** —el centro solo se muda desde el botón de la ficha—, así
// que se cierra por donde se toque: el fondo, la manija o Escape.
//
// En un móvil es una hoja que sube y tapa el árbol. **Con sitio deja de tapar**: pasa a
// columna fija a la derecha y el lienzo se queda entero y vivo detrás, que es la mitad de
// la gracia de leer a alguien —ver dónde está mientras lo lees—.

import { useEffect } from "react";

export default function Hoja({ onCerrar, children }: { onCerrar: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => e.key === "Escape" && onCerrar();
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [onCerrar]);

  return (
    <>
      {/* El fondo solo existe donde la hoja tapa: en columna, el árbol se sigue tocando. */}
      <div className="absolute inset-0 md:hidden" onClick={onCerrar} />
      <div className="hoja absolute inset-x-0 bottom-0 max-h-[85%] overflow-y-auto rounded-t-[20px] border-t border-[var(--line)] bg-[var(--paper)] px-4 pt-2.5 pb-[18px] md:inset-y-0 md:left-auto md:max-h-none md:w-[376px] md:rounded-none md:border-t-0 md:border-l md:px-5 md:pt-4">
        {/* La manija se ve de 38 × 4, pero se toca en toda la banda: cuatro píxeles no son
            un botón en ningún dedo. En columna no hay nada que arrastrar, y cierra una equis. */}
        <button type="button" onClick={onCerrar} aria-label="Cerrar" className="mb-2 flex h-6 w-full items-center justify-center md:hidden">
          <span className="block h-1 w-[38px] rounded-full bg-[var(--line)]" />
        </button>
        <button
          type="button"
          onClick={onCerrar}
          aria-label="Cerrar"
          className="mb-2 hidden h-8 w-8 items-center justify-center self-end rounded-full text-[16px] text-[var(--mut)] hover:bg-[var(--soft)] hover:text-[var(--ink)] md:ml-auto md:flex"
        >
          ✕
        </button>
        {children}
      </div>
    </>
  );
}
