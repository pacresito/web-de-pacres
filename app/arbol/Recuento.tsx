"use client";

// El índice de parentescos —el recuento, en el código—: un tramo por generación y dentro una
// fracción por parentesco, cuántos hay puestos en el lienzo de cuántos se pueden llegar a
// poner. Es el estado vacío de la búsqueda porque es la puerta de quien no sabe ningún
// nombre: aquí no se teclea, se pide «tráeme a mis tíos».
//
// Solo pinta y recoge gestos: los números y las uniones que hay que abrir salen de
// lib/arbol/recuento, y quién se atenúa al señalar una fracción lo decide el lienzo.

import { escribirNivel } from "@/lib/arbol/parentesco";
import type { Fraccion, Recuento as Cuentas } from "@/lib/arbol/recuento";
import { Cabecera } from "./Bloque";

export default function Recuento({
  cuentas,
  centro,
  onAbrir,
  onPulsar,
  onResaltar,
}: {
  cuentas: Cuentas;
  /** Cómo se llama el Centro: el índice no dice «tus tíos» sin decir tíos de quién. */
  centro: string;
  /** El parentesco lista a los suyos; es lo que se pide desde un buscador. */
  onAbrir: (f: Fraccion) => void;
  /** La fracción los trae al lienzo, o los repliega si ya están todos. */
  onPulsar: (f: Fraccion) => void;
  onResaltar: (ids: string[] | null) => void;
}) {
  return (
    <>
      <Cabecera>
        Desde tu Centro · {centro} · {cuentas.puestos}/{cuentas.alcanzables}
      </Cabecera>
      {cuentas.filas.map((fila) => (
        <div key={fila.nivel} className="flex flex-col">
          {/* La generación encabeza el tramo porque el parentesco no siempre la dice: la
              lengua se queda sin palabras y «parejas» o «sin parentesco» salen en todas. */}
          <p className="px-3 pt-2.5 pb-1 text-[11.5px] text-[var(--mut)]">{escribirNivel(fila.nivel)}</p>
          {fila.fracciones.map((fraccion) => (
            <Cajon key={fraccion.termino} fraccion={fraccion} onAbrir={onAbrir} onPulsar={onPulsar} onResaltar={onResaltar} />
          ))}
        </div>
      ))}
      <p className="px-3 pt-3 pb-1 text-[11.5px] leading-[1.5] text-[var(--mut)]">
        Pulsa un parentesco para ver quiénes son. La fracción dice cuántos hay ya en el árbol de cuántos hay, y pulsarla trae
        los que falten.
      </p>
    </>
  );
}

/**
 * Un cajón se lee de dos maneras y por eso tiene dos botones: **el parentesco lista a los
 * suyos** —lo que se le pide a un buscador, y la única forma de llegar a alguien sin saber su
 * nombre— y **la fracción los trae al lienzo**, que es una acción sobre el dibujo y no una
 * pregunta. Señalarla atenúa lo que no es suyo; en táctil, el puntero entra al apoyar el dedo
 * y sale al levantarlo, así que el gesto es el mismo.
 */
function Cajon({
  fraccion,
  onAbrir,
  onPulsar,
  onResaltar,
}: {
  fraccion: Fraccion;
  onAbrir: (f: Fraccion) => void;
  onPulsar: (f: Fraccion) => void;
  onResaltar: (ids: string[] | null) => void;
}) {
  const puestos = fraccion.puestos.length;
  const llena = puestos === fraccion.todos.length;
  return (
    <div className="flex items-stretch">
      <button
        type="button"
        onClick={() => onAbrir(fraccion)}
        className="flex min-h-11 flex-1 items-center pr-2 pl-3 text-left text-[13.5px] text-[var(--ink)] hover:bg-[var(--soft)] active:bg-[var(--soft)]"
      >
        {fraccion.termino}
      </button>
      {/* El acento es del punto de vista y de nadie más: una fracción llena se marca con el
          peso, que es como el lienzo dice todo lo que no es «aquí estás tú». */}
      <button
        type="button"
        onClick={() => onPulsar(fraccion)}
        onPointerEnter={() => onResaltar(fraccion.puestos)}
        onPointerLeave={() => onResaltar(null)}
        aria-label={llena ? `Replegar ${fraccion.termino}` : `Traer ${fraccion.termino} al árbol`}
        className={`flex min-h-11 shrink-0 items-center px-3 font-[family-name:var(--mono)] text-[11px] tracking-[0.05em] tabular-nums hover:bg-[var(--soft)] active:bg-[var(--soft)] ${
          llena ? "font-semibold text-[var(--ink)]" : puestos > 0 ? "text-[var(--ink)]" : "text-[var(--mut)] opacity-60"
        }`}
      >
        {puestos}/{fraccion.todos.length}
      </button>
    </div>
  );
}
