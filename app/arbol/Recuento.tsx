"use client";

// El panel de recuento: una fila por generación —los ancestros arriba— y en cada una,
// cuánta familia hay puesta de cada parentesco y cuánta se puede llegar a poner. Solo
// pinta y recoge gestos: los números y las uniones que hay que abrir salen de
// lib/arbol/recuento, y quién se atenúa al señalar una fracción lo decide el lienzo.

import type { Fraccion, Recuento as Cuentas } from "@/lib/arbol/recuento";

export default function Recuento({
  cuentas,
  abierto,
  setAbierto,
  onPulsar,
  onResaltar,
}: {
  cuentas: Cuentas;
  abierto: boolean;
  setAbierto: (v: boolean) => void;
  onPulsar: (f: Fraccion) => void;
  onResaltar: (ids: string[] | null) => void;
}) {
  return (
    <div className="absolute top-3 left-3 flex max-w-[calc(100%-1.5rem)] flex-col items-start gap-2">
      {/* Plegado dice lo mismo que abierto, sumado: es una brújula, no una preferencia. */}
      <button
        type="button"
        onClick={() => setAbierto(!abierto)}
        className="flex h-11 items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 text-[13px] font-medium text-neutral-700 shadow-lg"
      >
        {cuentas.puestos} de {cuentas.alcanzables} familiares
        <span className={`text-[10px] text-neutral-400 ${abierto ? "" : "rotate-180"}`}>▲</span>
      </button>
      {abierto && (
        <div className="flex max-w-full flex-col gap-1 overflow-x-auto rounded-xl border border-neutral-200 bg-white p-2 shadow-lg">
          {cuentas.filas.map((fila) => (
            <div key={fila.nivel} className="flex flex-nowrap items-center gap-1">
              {fila.fracciones.map((fraccion) => (
                <Boton key={fraccion.termino} fraccion={fraccion} onPulsar={onPulsar} onResaltar={onResaltar} />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Cada fracción es un botón con significado exacto («tráeme a mis tíos»), que es la forma
 * de navegar que el árbol no tiene. Señalarla atenúa lo que no es suyo; en táctil, el
 * puntero entra al apoyar el dedo y sale al levantarlo, así que el gesto es el mismo.
 */
function Boton({
  fraccion,
  onPulsar,
  onResaltar,
}: {
  fraccion: Fraccion;
  onPulsar: (f: Fraccion) => void;
  onResaltar: (ids: string[] | null) => void;
}) {
  const puestos = fraccion.puestos.length;
  const llena = puestos === fraccion.alcanzables;
  return (
    <button
      type="button"
      onClick={() => onPulsar(fraccion)}
      onPointerEnter={() => onResaltar(fraccion.puestos)}
      onPointerLeave={() => onResaltar(null)}
      className="flex shrink-0 items-baseline gap-1.5 rounded-md px-1.5 py-1 text-[12px] whitespace-nowrap hover:bg-neutral-100 active:bg-neutral-100"
    >
      <span className="text-neutral-600">{fraccion.termino}</span>
      <span className={`tabular-nums ${llena ? "text-[#00b87a]" : puestos > 0 ? "text-neutral-900" : "text-neutral-400"}`}>
        {puestos}/{fraccion.alcanzables}
      </span>
    </button>
  );
}
