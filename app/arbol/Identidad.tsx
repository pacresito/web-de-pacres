"use client";

// El bloque de identidad, en HTML: las dos líneas con las que una persona aparece en
// cualquier hoja. Qué dicen lo decide lib/arbol/identidad; aquí solo se pintan. El lienzo
// tiene su propia copia en SVG, donde el color entra por clase y no por `color`.
//
// Y con él, las dos piezas que lo rodean en cualquier lista: la cabecera que parte un tramo
// del siguiente y el botón de una acción.

import type { Identidad, Pinta, Trozo } from "@/lib/arbol/identidad";

/** El nombre en tinta, lo que se deduce del árbol apagado, y en cursiva lo que no consta. */
const PINTAS: Record<Pinta, string> = {
  nombre: "text-[var(--ink)]",
  dudoso: "text-[var(--ink)] italic",
  heredado: "text-[var(--mut)]",
  año: "font-normal text-[var(--mut)]",
  sinNombre: "text-[var(--mut)] italic",
};

export function Titulo({ trozos, className }: { trozos: Trozo[]; className?: string }) {
  return (
    <span className={className}>
      {trozos.map((trozo, i) => (
        <span key={i} className={PINTAS[trozo.pinta]}>
          {trozo.texto}
        </span>
      ))}
    </span>
  );
}

/**
 * Las dos líneas juntas, como van en una fila. La segunda no se rompe nunca en dos: ya
 * llega degradada a lo que cabe, y `cola` es lo que la fila añade de su cosecha —desde
 * dónde se mira— y para lo que ha hecho sitio al pedirla.
 */
export function BloqueIdentidad({
  identidad,
  cola,
  marcas,
}: {
  identidad: Identidad;
  cola?: string | null;
  /**
   * Las etiquetas detrás del nombre. Solo las pide quien reúne a gente que puede repetirse:
   * a dos hermanos sin nombre, sin fechas y con los mismos padres no los separa nada más que
   * decir que son dos.
   */
  marcas?: boolean;
}) {
  return (
    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
      <span className="flex flex-wrap items-baseline gap-x-1.5 gap-y-1 text-[13px] leading-[1.2] font-semibold">
        <Titulo trozos={identidad.titulo} />
        {marcas && identidad.marcas.map((marca) => <Marca key={marca}>{marca}</Marca>)}
      </span>
      <span className="text-[11.5px] leading-[1.35] whitespace-nowrap text-[var(--mut)]">
        {identidad.contexto}
        {cola ? ` · ${cola}` : ""}
      </span>
    </span>
  );
}

/** Lo que hay que saber del dato antes de creérselo, en una etiqueta detrás del nombre. */
export const Marca = ({ children }: { children: React.ReactNode }) => (
  <span className="rounded-[5px] border border-[var(--line)] px-[5px] py-[2px] font-[family-name:var(--mono)] text-[9px] leading-[1.4] font-medium tracking-[0.05em] whitespace-nowrap text-[var(--mut)] uppercase">
    {children}
  </span>
);

/**
 * La cabecera de un tramo de lista. Va a sangre —el margen lateral lo ponen las filas, no la
 * lista— porque es lo que separa un tramo del siguiente sin gastar una línea en blanco.
 */
export const Cabecera = ({ children }: { children: React.ReactNode }) => (
  <p className="border-y border-[var(--line)] bg-[var(--soft)] px-3 py-2 font-[family-name:var(--mono)] text-[9.5px] leading-[1.4] font-medium tracking-[0.12em] text-[var(--mut)] uppercase">
    {children}
  </p>
);

/** Lo que se puede hacer desde una hoja, siempre con la nota de qué pasa al pulsarlo. */
export function Accion({
  texto,
  nota,
  primaria,
  onPulsar,
}: {
  texto: string;
  nota: string;
  primaria?: boolean;
  onPulsar: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPulsar}
      // Sobre el acento, la tinta es el papel: en oscuro el morado se aclara y un blanco
      // fijo se quedaría sin contraste justo en el único botón que hay que ver.
      className={`flex min-h-12 items-center gap-2.5 rounded-[11px] border px-3.5 text-left text-[13.5px] ${
        primaria ? "border-[var(--acc)] bg-[var(--acc)] text-[var(--paper)]" : "border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
      }`}
    >
      {texto}
      <span className={`ml-auto font-[family-name:var(--mono)] text-[11px] ${primaria ? "opacity-70" : "text-[var(--mut)]"}`}>
        {nota}
      </span>
    </button>
  );
}
