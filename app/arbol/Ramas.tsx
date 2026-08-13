"use client";

// La escala más lejana: la familia entera en ocho rectángulos, uno por rama, de altura
// proporcional a su gente. No es el árbol encogido —a esa altura no quedaría nada legible—
// sino un mapa aparte, y por eso se pinta en HTML sobre el lienzo y no dentro de él.
//
// **El mapa suma más que el árbol y lo dice.** Doce personas están en dos ramas y salen en
// las dos, así que los rectángulos suman 445 donde la familia son 428. Cada uno escribe
// cuántos de los suyos comparte y el pie explica por qué no cierra: contar dos veces y
// decirlo es más honesto que elegir una rama por ellos.

import type { Reparto } from "@/lib/arbol/ramas";
import { ALTO_REGLA } from "./Regla";

export default function Ramas({ reparto, onRama }: { reparto: Reparto[]; onRama: (rama: Reparto) => void }) {
  // Quien está en tres ramas suma dos pertenencias de más y sigue siendo una persona: lo
  // que sobra en el reparto no es el número de gente que se cuenta dos veces.
  const veces = new Map<string, number>();
  for (const rama of reparto) for (const id of rama.gente) veces.set(id, (veces.get(id) ?? 0) + 1);
  const total = [...veces.values()].reduce((n, v) => n + v, 0);
  const enVarias = [...veces.values()].filter((v) => v > 1).length;
  return (
    // Aquí la regla no se pinta, pero la búsqueda y el aviso siguen bajados por ella: el
    // hueco que reserva el mapa es el que ocupan ellos, no el que ocupa la franja.
    <div
      style={{ paddingTop: ALTO_REGLA + 68 }}
      className="absolute inset-0 flex flex-col gap-1.5 bg-[var(--paper)] pr-[68px] pb-[92px] pl-3"
    >
      {reparto.map((rama) => (
        <button
          key={rama.nombre}
          type="button"
          onClick={() => onRama(rama)}
          // La altura es el tamaño de la rama, y el mínimo evita que la más pequeña quede
          // en un filete que no se puede ni tocar ni leer.
          style={{ flexGrow: rama.gente.length, flexBasis: 0 }}
          className={`flex min-h-11 flex-col justify-center gap-0.5 rounded-xl px-4 text-left ${
            rama.tuya ? "border-[1.5px] border-[var(--ink)] bg-[var(--soft)]" : "border border-[var(--line)]"
          }`}
        >
          <span className="flex items-center gap-2">
            {rama.tuya && <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--acc)]" />}
            <span className="font-[family-name:var(--serif)] text-[22px] leading-none">{rama.nombre}</span>
          </span>
          <span className="font-[family-name:var(--mono)] text-[11px] text-[var(--mut)]">
            {rama.gente.length} personas
            {rama.compartidos > 0 && ` · ${rama.compartidos} también en otra`}
            {rama.tuya && " · es la tuya"}
          </span>
        </button>
      ))}
      <p className="px-1 text-center text-[11px] leading-[1.4] text-[var(--mut)]">
        Suman {total} y la familia son {veces.size}: {enVarias} personas descienden de más de una rama y salen en todas
        las suyas.
      </p>
    </div>
  );
}
