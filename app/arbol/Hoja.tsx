"use client";

// La superficie donde se lee a alguien o lo que celebra la familia. Solo cabe una a la vez
// y **cerrarla no cambia nada** —el centro solo se muda desde el botón de la ficha—, así
// que se cierra por donde se toque: la manija, Escape o el gesto de volver.
//
// En un móvil es una hoja que sube y tapa el árbol. **Con sitio deja de tapar**: pasa a
// columna fija a la derecha y el lienzo se queda entero y vivo detrás, que es la mitad de
// la gracia de leer a alguien —ver dónde está mientras lo lees—. Y lo que asoma por encima
// de la hoja se sigue arrastrando: un fondo que cerrara al tocarlo dejaba el árbol quieto
// justo mientras se lee a alguien para ver dónde cae.

import { useEffect } from "react";

export default function Hoja({ onCerrar, children }: { onCerrar: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => e.key === "Escape" && onCerrar();
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [onCerrar]);

  return (
    <div className="hoja absolute inset-x-0 bottom-0 max-h-[85%] overflow-y-auto rounded-t-[20px] border-t border-[var(--line)] bg-[var(--paper)] px-4 pt-2.5 pb-[18px] md:inset-y-0 md:left-auto md:max-h-none md:w-[376px] md:rounded-none md:border-t-0 md:border-l md:px-5 md:pt-4">
      {/* Cómo se cierra, en una sola fila y pegada arriba: la hoja tiene su propio scroll y
          lo que se fuera con él dejaría un panel largo sin salida. **El aspa está también
          en el móvil**: la manija es el gesto que la hoja espera, pero una pastilla gris no
          dice «cerrar» a quien no lo tenga aprendido, y la que sí lo dice es barata. La
          manija se toca en toda la banda: cuatro píxeles no son un botón en ningún dedo. */}
      <div className="sticky top-0 z-10 -mx-4 -mt-2.5 mb-2 flex items-center bg-[var(--paper)] px-4 pt-2.5 md:-mx-5 md:px-5">
        <span className="w-8 shrink-0 md:hidden" />
        <button type="button" onClick={onCerrar} aria-label="Cerrar" className="flex h-8 flex-1 items-center justify-center md:hidden">
          <span className="block h-1 w-[38px] rounded-full bg-[var(--line)]" />
        </button>
        <button
          type="button"
          onClick={onCerrar}
          aria-label="Cerrar"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[16px] text-[var(--mut)] hover:bg-[var(--soft)] hover:text-[var(--ink)] md:ml-auto"
        >
          ✕
        </button>
      </div>
      {children}
    </div>
  );
}
