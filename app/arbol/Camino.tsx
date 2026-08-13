"use client";

// El camino del Centro a alguien: la cadena de eslabones que hay entre los dos. Es lo que
// contesta a «¿y esta quién es?» cuando la lengua no tiene palabra para la relación, que le
// pasa a 271 de las 416. Cualquier eslabón se toca y abre su ficha; ninguno muda el Centro.

import type { Camino as Datos } from "@/lib/arbol/camino";
import type { Paso } from "@/lib/arbol/grafo";
import { LARGOS_LISTA, type Identidad } from "@/lib/arbol/identidad";
import type { Relacion } from "@/lib/arbol/parentesco";
import { BloqueIdentidad } from "./Identidad";

/** Hacia dónde va el eslabón. Los dos que no suben ni bajan se quedan en la misma fila. */
const FLECHAS: Record<Paso, string> = { progenitor: "↑", hijo: "↓", hermano: "→", pareja: "→" };

/** Lo que el primer eslabón añade a su segunda línea, y el hueco que le quita. */
const CENTRO = "tú";

/**
 * El eslabón se lleva la fila entera, que aquí no comparte con ninguna columna de pasos: son
 * ocho caracteres más que en una lista de resultados, medidos sobre los 343 px de la hoja.
 */
const LARGO_CONTEXTO = LARGOS_LISTA.contexto + 8;

export default function Camino({
  datos,
  relacion,
  identidad,
  onPersona,
  onVolver,
}: {
  datos: Datos;
  relacion: Relacion;
  identidad: (id: string, largoContexto: number) => Identidad;
  onPersona: (id: string) => void;
  onVolver: () => void;
}) {
  const ultimo = datos.eslabones.length - 1;
  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={onVolver}
        className="-ml-1 flex h-8 w-fit items-center rounded-md px-1 font-[family-name:var(--mono)] text-[12px] text-[var(--mut)] hover:text-[var(--ink)]"
      >
        ‹ su ficha
      </button>
      {/* El título no repite el nombre: lo dice entero el último eslabón, dos dedos más abajo,
          y aquí solo cabía recortado —«Maximina González C… (1863 – 1949)»—. */}
      <h2 className="mt-1 font-[family-name:var(--serif)] text-[24px] leading-[1.15]">El camino</h2>
      <p className="mt-1 text-[12.5px] leading-[1.45] text-[var(--mut)]">
        {relacion.frase} · {datos.pasos} {datos.pasos === 1 ? "paso" : "pasos"}
        {datos.porParte ? ` · por parte ${datos.porParte}` : ""}
      </p>

      <div className="mt-3.5 flex flex-col">
        {datos.eslabones.map((eslabon, i) => (
          <div key={eslabon.id} className="flex flex-col">
            {eslabon.paso && (
              // El filete cuelga del nodo de arriba y muere en el de abajo: es lo que hace de
              // la lista una cadena, y sin él dos eslabones seguidos son dos filas cualquiera.
              <p className="ml-[26px] border-l-2 border-[var(--line)] py-2.5 pl-4 font-[family-name:var(--mono)] text-[11px] text-[var(--mut)]">
                {FLECHAS[eslabon.paso]} {eslabon.frase}
              </p>
            )}
            <button
              type="button"
              onClick={() => onPersona(eslabon.id)}
              // El primero eres tú y el último es a quien ibas: los de en medio llevan el
              // trazo de la línea directa, que es lo que el lienzo usa para «esto te toca».
              className={`flex min-h-12 items-center rounded-[9px] px-2.5 py-2 text-left ${
                i === 0
                  ? "border-2 border-[var(--acc)] bg-[var(--acch)]"
                  : i === ultimo
                    ? "border-2 border-[var(--ink)]"
                    : "border-[1.5px] border-[var(--ink)]"
              }`}
            >
              <BloqueIdentidad
                identidad={identidad(eslabon.id, LARGO_CONTEXTO - (i === 0 ? CENTRO.length + 3 : 0))}
                cola={i === 0 ? CENTRO : null}
              />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
