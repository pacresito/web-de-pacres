"use client";

// La ficha: lo que se lee al tocar a alguien, venga del lienzo o del panel de lo que se
// celebra. Solo pinta —lo que dice lo escribe lib/arbol/ficha— y guarda la única regla que
// el lienzo no puede guardar por sí solo: **tocar no muda el Centro; solo el botón de verlo
// todo desde aquí**.

import type { Ficha as Datos } from "@/lib/arbol/ficha";
import { Accion, Marca, Titulo } from "./Identidad";

export default function Ficha({
  datos,
  anterior,
  onCentrar,
  onCamino,
  onVerEnElArbol,
  onHomonimos,
  onIndice,
  onDevolver,
}: {
  datos: Datos;
  /** El Centro de antes, para poder deshacer la mudanza desde la ficha del de ahora. */
  anterior?: { id: string; nombre: string };
  onCentrar: () => void;
  onCamino: () => void;
  onVerEnElArbol: () => void;
  onHomonimos: (consulta: string | null) => void;
  onIndice: () => void;
  onDevolver: () => void;
}) {
  return (
    <div className="flex flex-col">
      <Relacion datos={datos} onCamino={onCamino} />

      <p className="mt-4 font-[family-name:var(--serif)] text-[34px] leading-[1.05] tracking-[-0.01em]">
        <Titulo trozos={datos.titulo} />
      </p>
      <p className="mt-[7px] font-[family-name:var(--mono)] text-[12.5px] text-[var(--mut)]">{datos.datos}</p>

      {datos.marcas.length > 0 && (
        <p className="mt-1.5 flex flex-wrap gap-1.5">
          {datos.marcas.map((marca) => (
            <Marca key={marca}>{marca}</Marca>
          ))}
        </p>
      )}

      {datos.aviso && <Caja>{datos.aviso}</Caja>}

      <div className="my-4 h-px bg-[var(--line)]" />

      <dl className="grid grid-cols-[78px_1fr] gap-x-3 gap-y-2.5 text-[12.5px] leading-[1.45]">
        {datos.filas.map((f) => (
          <Campo key={f.clave} clave={f.clave}>
            <span className={f.falta ? "text-[var(--mut)]" : undefined}>{f.valor}</span>
          </Campo>
        ))}
        {datos.nota && <Campo clave="Nota">{datos.nota}</Campo>}
      </dl>

      <div className="mt-[18px] flex flex-col gap-[9px]">
        {datos.esCentro ? (
          <>
            <Accion texto="Índice de parentescos" nota="›" onPulsar={onIndice} />
            {anterior && <Accion texto={`Volver a ver como ${anterior.nombre}`} nota="↩" onPulsar={onDevolver} />}
          </>
        ) : (
          <>
            <Accion texto="Ver el árbol desde aquí" primaria onPulsar={onCentrar} />
            {/* A la ficha se llega también desde el buscador y desde el panel, y entonces no
                hay nodo del que se haya venido: sin esto, a quien el lienzo no está pintando
                no había forma de ir a verlo sin mudar el Centro. */}
            <Accion texto="Centrar en el árbol" nota="↗" onPulsar={onVerEnElArbol} />
          </>
        )}
        {datos.homonimos && (
          <Accion texto={datos.homonimos.texto} nota="⌕" onPulsar={() => onHomonimos(datos.homonimos!.consulta)} />
        )}
      </div>
    </div>
  );
}

/**
 * Lo primero que se lee, y lo único que la ficha dice del Centro y no de la persona. Los
 * pasos van al lado porque cuando no hay palabra son lo único que queda: la lengua se
 * agota mucho antes que el parentesco.
 */
function Relacion({ datos, onCamino }: { datos: Datos; onCamino: () => void }) {
  const { frase, pasos } = datos.relacion;
  // «Es» es la cópula y el resto es el parentesco, que es lo que se destaca. El único que no
  // empieza así es «Eres tú», que no es un parentesco y no destaca nada.
  const parentesco = frase.startsWith("Es ") ? frase.slice(3) : null;
  return (
    <div className="flex items-center gap-[9px] rounded-[10px] border border-[var(--accb)] bg-[var(--acch)] px-3 py-[11px] text-[13px] leading-[1.4]">
      {datos.esCentro && <span className="h-[9px] w-[9px] shrink-0 rounded-full bg-[var(--acc)]" />}
      <span className="flex-1">
        {parentesco ? (
          <>
            Es <b className="font-semibold">{parentesco}</b>
          </>
        ) : (
          frase
        )}
        {datos.esCentro && <span className="text-[var(--mut)]"> · todo se cuenta desde aquí</span>}
      </span>
      {/* Los pasos llevan al camino porque es donde nace la pregunta: cuando no hay palabra,
          la línea de relación no sabe contestar nada más que el número. */}
      {!datos.esCentro && (
        <button
          type="button"
          onClick={onCamino}
          className="shrink-0 self-stretch font-[family-name:var(--mono)] text-[11px] whitespace-nowrap text-[var(--mut)] hover:text-[var(--ink)]"
        >
          {pasos} {pasos === 1 ? "paso" : "pasos"} · camino ›
        </button>
      )}
    </div>
  );
}

/** Una fila de la lista, con la clave y el valor alineados por la rejilla de la `dl`. */
const Campo = ({ clave, children }: { clave: string; children: React.ReactNode }) => (
  <div className="col-span-2 grid grid-cols-subgrid">
    <dt className="font-[family-name:var(--mono)] text-[9.5px] leading-[1.55] font-medium tracking-[0.1em] text-[var(--mut)] uppercase">
      {clave}
    </dt>
    <dd>{children}</dd>
  </div>
);

/** Lo que hay que saber antes de sacar conclusiones de lo que se está leyendo. */
const Caja = ({ children }: { children: React.ReactNode }) => (
  <p className="mt-3.5 rounded-[10px] border border-[var(--line)] bg-[var(--soft)] p-3 text-[12.5px] leading-[1.5] text-[var(--mut)]">
    {children}
  </p>
);
