"use client";

// El riel de la derecha: con qué unidad se dibuja el árbol —una persona, un grupo de
// hermanos o una rama entera—. Cambiar de unidad no mueve la cámara; eso lo decide
// `alCambiarDeUnidad`, que solo interviene si a esa altura la nueva no se leería.

import type { Parada } from "@/lib/arbol/camara";

const PARADAS: { parada: Parada; glifo: string; nombre: string }[] = [
  { parada: "ramas", glifo: "▣", nombre: "Ramas" },
  { parada: "bloques", glifo: "▤", nombre: "Familias" },
  { parada: "personas", glifo: "▥", nombre: "Personas" },
];

export default function Riel({ parada, onIr, apartado }: { parada: Parada; onIr: (p: Parada) => void; apartado: string }) {
  return (
    <div
      style={{ boxShadow: "var(--sh)" }}
      className={`absolute top-1/2 right-3 flex -translate-y-1/2 flex-col overflow-hidden rounded-full border border-[var(--line)] bg-[var(--paper)] ${apartado}`}
    >
      {PARADAS.map(({ parada: suya, glifo, nombre }) => (
        <button
          key={suya}
          type="button"
          onClick={() => onIr(suya)}
          title={nombre}
          aria-label={nombre}
          aria-current={suya === parada}
          className={`h-11 w-11 text-[15px] ${suya === parada ? "bg-[var(--acch)] text-[var(--acc)]" : "text-[var(--mut)]"}`}
        >
          {glifo}
        </button>
      ))}
    </div>
  );
}
