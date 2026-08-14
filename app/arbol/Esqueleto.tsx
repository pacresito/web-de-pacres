// Lo que ocupa el lienzo hasta que hay lienzo. **No es una carga fingida:** el árbol
// necesita medir su hueco para colocar nada, y medirlo exige el navegador, así que entre el
// HTML —que ya trae el cromo entero: el riel, la búsqueda, «Qué se ve»— y el primer pintado hay
// un hueco en blanco tan largo como tarde el bundle en llegar y arrancar. Una vez medido, el
// árbol de entrada se pinta de golpe en 28 ms: no hay nada que escalonar, y por eso esto son
// bloques del tamaño del nodo puestos en columnas y no el árbol de verdad a medias.
//
// Se pinta en el servidor y muere en cuanto el hueco se mide. Por eso las medidas salen de
// las del lienzo y no de números sueltos: el esqueleto miente sobre quién hay, nunca sobre
// cuánto ocupa.

import { ALTO_NODO, ANCHO_COLUMNA, ANCHO_NODO } from "@/lib/arbol/layout";
import { ALTO_REGLA } from "./Regla";

/** Cuántos bloques lleva cada columna, del borde al Centro y de vuelta: la silueta del árbol. */
const COLUMNAS = [3, 5, 7, 5, 3];
/** Lo lejos que queda cada columna del Centro, que es lo que apaga a las de fuera. */
const DESVAIDO = [0.3, 0.6, 1, 0.6, 0.3];

export default function Esqueleto({ escala }: { escala: number }) {
  const ancho = ANCHO_NODO * escala;
  const alto = ALTO_NODO * escala;
  const paso = ANCHO_COLUMNA * escala;
  const centro = (COLUMNAS.length - 1) / 2;
  return (
    <div aria-hidden className="absolute inset-0 flex animate-pulse items-center justify-center overflow-hidden">
      {/* La franja de la regla, sin rotular: las etiquetas dicen a cuántas generaciones
          queda cada columna y aquí todavía no hay columnas de nadie. */}
      <div
        style={{ height: ALTO_REGLA }}
        className="absolute inset-x-0 top-0 flex items-center justify-center gap-16 border-b border-[var(--line)] bg-[var(--soft)]"
      >
        {[0, 1, 2].map((i) => (
          <span key={i} className="h-2.5 w-12 rounded-full bg-[var(--soft2)]" />
        ))}
      </div>

      <div className="flex" style={{ gap: paso - ancho, marginTop: ALTO_REGLA }}>
        {COLUMNAS.map((cuantos, columna) => (
          <div key={columna} className="flex flex-col justify-center" style={{ gap: alto * 0.34, opacity: DESVAIDO[columna] }}>
            {Array.from({ length: cuantos }, (_, fila) => (
              <span
                key={fila}
                style={{ width: ancho, height: alto, borderRadius: 6 }}
                // El único bloque que no es un hueco cualquiera: donde va a caer el Centro.
                // Sin él, cinco columnas de gris no dicen que esto sea un árbol de alguien.
                className={
                  columna === centro && fila === (cuantos - 1) / 2
                    ? "border-2 border-[var(--accb)] bg-[var(--acch)]"
                    : "bg-[var(--soft2)]"
                }
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
