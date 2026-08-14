"use client";

// La búsqueda: el único sitio del árbol al que se llega sin saber dónde está nadie, y por eso
// **vacía no está vacía** —enseña el índice de parentescos, que es la puerta de quien no sabe
// ningún nombre—. Cuando no encuentra a nadie tampoco se queda en blanco: dice por qué y da
// salidas. Y tocar un resultado abre su ficha, igual que tocar un nodo: no muda el Centro.

import { VIAS, type Resultado, type Via } from "@/lib/arbol/busqueda";
import { LARGOS_LISTA, type Identidad } from "@/lib/arbol/identidad";
import type { Relacion } from "@/lib/arbol/parentesco";
import { Accion, BloqueIdentidad, Cabecera } from "./Identidad";
import { ALTO_REGLA } from "./Regla";

/** El hueco que la fila deja a la segunda línea: a la derecha van siempre los pasos. */
const LARGO_CONTEXTO = LARGOS_LISTA.contexto;

/**
 * Lo que se pinta de un tramo. Teclear una letra más afina mucho más que bajar por cuatrocientas
 * filas, así que pasado el tope la lista dice cuántas se ha guardado y qué hacer con ellas.
 */
const TOPE = 25;

const CABECERAS: Record<Via, (n: number) => string> = {
  // El orden es el único criterio que existe para todo el mundo, así que se dice: cuatro de
  // cada diez personas no traen ningún año con el que ordenarlas.
  nombre: (n) => `${n === 1 ? "Una persona se llama" : `${n} personas se llaman`} así · por cercanía a ti`,
  familia: (n) => `${n} más, por su familia`,
  "sin nombre": (n) => `Las ${n} personas a las que el documento no da nombre`,
};

export default function Busqueda({
  consulta,
  onTeclear,
  abierta,
  setAbierta,
  oculta,
  resultados,
  sugerencia,
  identidad,
  relaciones,
  puntoDeVista,
  onPersona,
  indice,
  cajon,
  onVolverAlIndice,
}: {
  consulta: string;
  onTeclear: (texto: string) => void;
  abierta: boolean;
  setAbierta: (v: boolean) => void;
  /** Con una hoja abierta el móvil no tiene sitio para las dos; con espacio conviven. */
  oculta: boolean;
  resultados: Resultado[];
  /** La palabra de la consulta que sí encuentra a alguien, cuando la consulta entera no. */
  sugerencia: string | null;
  identidad: (id: string, largoContexto: number) => Identidad;
  relaciones: Map<string, Relacion>;
  puntoDeVista: string;
  onPersona: (id: string) => void;
  /** El índice de parentescos, que es lo que se lee mientras no se ha teclado nada. */
  indice: React.ReactNode;
  /** El cajón del índice que se haya abierto: «tus primos» son quince personas, no un número. */
  cajon: { termino: string; ids: string[] } | null;
  onVolverAlIndice: () => void;
}) {
  const buscando = consulta.trim() !== "";
  return (
    <div
      // Debajo de la regla, que ocupa el borde de arriba a lo ancho.
      style={{ top: ALTO_REGLA + 12 }}
      className={`absolute left-3 flex-col items-start gap-2 ${oculta ? "hidden md:flex" : "flex"}`}
    >
      <div
        style={{ boxShadow: "var(--sh)" }}
        className="flex h-11 w-[min(15rem,calc(100vw-9rem))] items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--paper)] pr-2 pl-3.5"
      >
        <span className="text-[15px] leading-none text-[var(--mut)]">⌕</span>
        <input
          value={consulta}
          onChange={(e) => onTeclear(e.target.value)}
          onFocus={() => setAbierta(true)}
          onKeyDown={(e) => e.key === "Escape" && setAbierta(false)}
          placeholder="Nombre, o «hija de…»"
          className="min-w-0 flex-1 bg-transparent text-[13px] text-[var(--ink)] outline-none placeholder:text-[var(--mut)]"
        />
        {(abierta || buscando) && (
          <button
            type="button"
            aria-label="Cerrar la búsqueda"
            onClick={() => {
              onTeclear("");
              setAbierta(false);
            }}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] text-[var(--mut)] hover:bg-[var(--soft)] hover:text-[var(--ink)]"
          >
            ✕
          </button>
        )}
      </div>

      {abierta && (
        <div
          style={{ boxShadow: "var(--sh)" }}
          className="flex max-h-[min(28rem,65vh)] w-[22rem] max-w-[calc(100vw-1.5rem)] flex-col overflow-y-auto rounded-xl border border-[var(--line)] bg-[var(--paper)] pb-1"
        >
          {cajon ? (
            <>
              <button
                type="button"
                onClick={onVolverAlIndice}
                className="flex min-h-10 items-center px-3 font-[family-name:var(--mono)] text-[12px] text-[var(--mut)] hover:text-[var(--ink)]"
              >
                ‹ índice de parentescos
              </button>
              <Cabecera>
                {cajon.termino} · {cajon.ids.length}
              </Cabecera>
              {cajon.ids.map((id) => (
                <Fila
                  key={id}
                  identidad={identidad(id, LARGO_CONTEXTO)}
                  relacion={relaciones.get(id)}
                  esCentro={id === puntoDeVista}
                  onPulsar={() => onPersona(id)}
                />
              ))}
            </>
          ) : resultados.length > 0 ? (
            VIAS.map((via) => {
              const suyos = resultados.filter((r) => r.via === via);
              if (suyos.length === 0) return null;
              return (
                <div key={via} className="flex flex-col">
                  <Cabecera>{CABECERAS[via](suyos.length)}</Cabecera>
                  {suyos.slice(0, TOPE).map((r) => (
                    <Fila
                      key={r.id}
                      identidad={identidad(r.id, LARGO_CONTEXTO)}
                      relacion={relaciones.get(r.id)}
                      esCentro={r.id === puntoDeVista}
                      onPulsar={() => onPersona(r.id)}
                    />
                  ))}
                  {suyos.length > TOPE && (
                    <p className="px-3 py-2.5 text-[11.5px] leading-[1.5] text-[var(--mut)]">
                      Y {suyos.length - TOPE} más. Añade un apellido o el nombre de un padre.
                    </p>
                  )}
                </div>
              );
            })
          ) : buscando ? (
            <SinNadie
              sugerencia={sugerencia}
              onSugerencia={() => sugerencia && onTeclear(sugerencia)}
              onIndice={() => onTeclear("")}
              onCerrar={() => setAbierta(false)}
            />
          ) : (
            indice
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Nadie sale nunca como un nombre suelto: la segunda línea es lo que identifica a quien no
 * trae ni apellido ni fecha. A la derecha, los pasos hasta el Centro —o «tú», que es el único
 * sitio de la lista donde el acento tiene algo que decir—.
 */
function Fila({
  identidad,
  relacion,
  esCentro,
  onPulsar,
}: {
  identidad: Identidad;
  relacion?: Relacion;
  esCentro: boolean;
  onPulsar: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPulsar}
      className="flex min-h-16 items-center gap-2.5 px-3 text-left hover:bg-[var(--soft)] active:bg-[var(--soft)]"
    >
      <BloqueIdentidad identidad={identidad} marcas />
      <span
        className={`shrink-0 font-[family-name:var(--mono)] text-[11px] ${esCentro ? "text-[var(--acc)]" : "text-[var(--mut)]"}`}
      >
        {esCentro ? "tú" : `${relacion?.pasos ?? "—"} ${relacion?.pasos === 1 ? "paso" : "pasos"}`}
      </span>
    </button>
  );
}

/**
 * El callejón sin salida, con sus salidas: las formas de llegar a alguien que no son teclear
 * su nombre, y volver al árbol —que existe porque en un móvil el panel lo tapa, y quedarse
 * encerrado en una búsqueda vacía es la peor manera de acabar aquí—.
 */
function SinNadie({
  sugerencia,
  onSugerencia,
  onIndice,
  onCerrar,
}: {
  sugerencia: string | null;
  onSugerencia: () => void;
  onIndice: () => void;
  onCerrar: () => void;
}) {
  return (
    <div className="px-4 pt-4 pb-3">
      <p className="font-[family-name:var(--serif)] text-[22px] leading-[1.2]">Nadie se llama así</p>
      <p className="mt-2.5 text-[13px] leading-[1.55] text-[var(--mut)]">
        Se busca por el nombre, por los apellidos y por de quién es cada uno.
      </p>
      <div className="mt-4 flex flex-col gap-[9px]">
        {sugerencia && <Accion texto={`Buscar solo «${sugerencia}»`} nota="⌕" onPulsar={onSugerencia} />}
        <Accion texto="Índice de parentescos" nota="›" onPulsar={onIndice} />
        <Accion texto="Volver al árbol" nota="↩" onPulsar={onCerrar} />
      </div>
    </div>
  );
}
