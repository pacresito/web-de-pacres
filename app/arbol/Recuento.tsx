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
        style={{ boxShadow: "var(--sh)" }}
        className="flex h-11 items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--paper)] px-4 text-[13px] font-medium text-[var(--ink)]"
      >
        {cuentas.puestos} de {cuentas.alcanzables} familiares
        <span className={`text-[10px] text-[var(--mut)] ${abierto ? "" : "rotate-180"}`}>▲</span>
      </button>
      {abierto && (
        <div
          style={{ boxShadow: "var(--sh)" }}
          className="flex max-w-full flex-col gap-1 overflow-x-auto rounded-xl border border-[var(--line)] bg-[var(--paper)] p-2"
        >
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
      className="flex shrink-0 items-baseline gap-1.5 rounded-md px-1.5 py-1 text-[12px] whitespace-nowrap hover:bg-[var(--soft)] active:bg-[var(--soft)]"
    >
      <span className="text-[var(--mut)]">{fraccion.termino}</span>
      {/* El acento es del punto de vista y de nadie más: una fracción llena se marca con
          el peso, que es como el lienzo dice todo lo que no es «aquí estás tú». */}
      <span
        className={`font-[family-name:var(--mono)] text-[11px] tracking-[0.05em] tabular-nums ${
          llena ? "font-semibold text-[var(--ink)]" : puestos > 0 ? "text-[var(--ink)]" : "text-[var(--mut)] opacity-60"
        }`}
      >
        {puestos}/{fraccion.alcanzables}
      </span>
    </button>
  );
}
