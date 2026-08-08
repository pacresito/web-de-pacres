"use client";

// El bloque de identidad, en HTML: las dos líneas con las que una persona aparece en
// cualquier hoja. Qué dicen lo decide lib/arbol/identidad; aquí solo se pintan. El lienzo
// tiene su propia copia en SVG, donde el color entra por clase y no por `color`.

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
export function Bloque({ identidad, cola }: { identidad: Identidad; cola?: string | null }) {
  return (
    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
      <Titulo trozos={identidad.titulo} className="text-[13px] leading-[1.2] font-semibold" />
      <span className="text-[11.5px] leading-[1.35] whitespace-nowrap text-[var(--mut)]">
        {identidad.contexto}
        {cola ? ` · ${cola}` : ""}
      </span>
    </span>
  );
}
