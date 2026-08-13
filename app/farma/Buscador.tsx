"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { coincide, contiene, filtrarFallback, sinAcentos } from "@/lib/farma/buscar";
import { XIcon } from "./icons";

// Buscador con autocompletar genérico (reutilizable: lo usan Prioridades y Pedidos).
// Filtra sin acentos, tolera pequeños typos (lib/farma/buscar), y emite onSelect. Aspa a
// la derecha para borrar.
//
// La lista de sugerencias va en `fixed`, no en `absolute`: los paneles que lo hospedan
// recortan con overflow:hidden (`.fa-panel`, para redondear sus esquinas) y le cortaban
// las últimas opciones. Fixed escapa de ese recorte —ningún ancestro crea contenedor de
// fixed: no hay transform ni filter— a cambio de recolocarla a mano mientras está
// abierta, que es lo que hace `medir`.

export default function Buscador({
  items,
  onSelect,
  onClear,
  placeholder,
  autoFocus,
  inputClassName,
  buscarExtra,
  mostrar = (item) => item,
}: {
  items: string[];
  onSelect: (item: string) => void;
  onClear?: () => void; // se llama al vaciar el campo con el aspa (para resetear el filtro del padre)
  placeholder?: string;
  autoFocus?: boolean;
  inputClassName?: string; // sobreescribe el estilo del campo (p. ej. skin UnycopWin en Prioridades)
  buscarExtra?: (item: string) => string; // texto extra buscable por ítem (p. ej. el código)
  mostrar?: (item: string) => string; // cómo se escribe el ítem en pantalla; se busca y se emite el de `items`
}) {
  const [q, setQ] = useState("");
  const [abierto, setAbierto] = useState(false);
  const campo = useRef<HTMLInputElement>(null);
  const [caja, setCaja] = useState<{ left: number; ancho: number; top: number; alto: number } | null>(null);

  const consulta = sinAcentos(q.trim());
  const extra = (i: string) => (buscarExtra ? sinAcentos(buscarExtra(i)).includes(consulta) : false);
  const coincidencias = consulta
    ? filtrarFallback(items, (i) => contiene(i, consulta) || extra(i), (i) => coincide(i, consulta) || extra(i)).slice(0, 8)
    : [];

  const desplegado = abierto && coincidencias.length > 0;

  // Sitio de la lista: bajo el campo y, de ahí, lo que dé la ventana. Ancho y alto son
  // mínimo y máximo, no medida: nunca más estrecha que el campo (aunque el campo sea el
  // angosto de Prioridades y el principio, largo) ni más alta que lo que queda de pantalla.
  // Se mide al abrirla —el campo no se mueve mientras se teclea— y mientras esté abierta,
  // cada vez que algo la desalinearía del campo.
  const medir = useCallback(() => {
    const r = campo.current?.getBoundingClientRect();
    if (r) {
      setCaja({
        left: r.left,
        ancho: r.width,
        top: r.bottom + 4,
        alto: window.innerHeight - r.bottom - 12,
      });
    }
  }, []);

  useEffect(() => {
    if (!desplegado) return;
    window.addEventListener("scroll", medir, true); // capture: también los ancestros con scroll
    window.addEventListener("resize", medir);
    return () => {
      window.removeEventListener("scroll", medir, true);
      window.removeEventListener("resize", medir);
    };
  }, [desplegado, medir]);

  function elegir(item: string) {
    setQ(mostrar(item));
    setAbierto(false);
    onSelect(item);
  }

  return (
    <div className="relative">
      <input
        ref={campo}
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setAbierto(true);
          medir();
        }}
        onFocus={() => {
          setAbierto(true);
          medir();
        }}
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
      {desplegado && caja && (
        <ul
          style={{
            position: "fixed",
            left: caja.left,
            top: caja.top,
            minWidth: caja.ancho,
            maxWidth: `calc(100vw - ${caja.left}px - 12px)`,
            maxHeight: caja.alto,
          }}
          className="z-10 overflow-auto rounded border border-neutral-200 bg-white shadow"
        >
          {coincidencias.map((item) => (
            <li key={item}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => elegir(item)}
                className="block w-full px-3 py-2 text-left hover:bg-neutral-100"
              >
                {mostrar(item)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
