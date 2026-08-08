"use client";

// La ficha: lo que se lee al tocar a alguien, venga del lienzo o del panel de lo que se
// celebra. Solo pinta —lo que dice lo escribe lib/arbol/ficha— y guarda la única regla que
// el lienzo no puede guardar por sí solo: **tocar no muda el Centro; solo «Centrar aquí»**.

import type { Ficha as Datos } from "@/lib/arbol/ficha";
import { Titulo } from "./Bloque";

export default function Ficha({
  datos,
  anterior,
  onCentrar,
  onIndice,
  onDevolver,
}: {
  datos: Datos;
  /** El Centro de antes, para poder deshacer la mudanza desde la ficha del de ahora. */
  anterior?: { id: string; nombre: string };
  onCentrar: () => void;
  onIndice: () => void;
  onDevolver: () => void;
}) {
  return (
    <div className="flex flex-col">
      <Relacion datos={datos} />

      <p className="mt-4 font-[family-name:var(--serif)] text-[34px] leading-[1.05] tracking-[-0.01em]">
        <Titulo trozos={datos.titulo} />
      </p>
      <p className="mt-[7px] font-[family-name:var(--mono)] text-[12.5px] text-[var(--mut)]">{datos.datos}</p>

      {datos.marcas.length > 0 && (
        <p className="mt-1.5 flex flex-wrap gap-1.5">
          {datos.marcas.map((marca) => (
            <span
              key={marca}
              className="rounded-[5px] border border-[var(--line)] px-[5px] py-[2px] font-[family-name:var(--mono)] text-[9px] font-medium tracking-[0.05em] text-[var(--mut)] uppercase"
            >
              {marca}
            </span>
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

      {datos.esCentro && (
        <Caja>
          Cerrar esta ficha no cambia nada. El Centro solo cambia desde la ficha{" "}
          <b className="font-semibold text-[var(--ink)]">de otra persona</b>.
        </Caja>
      )}

      <div className="mt-[18px] flex flex-col gap-[9px]">
        {datos.esCentro ? (
          <>
            <Accion texto="Índice de parentescos desde aquí" nota="›" onPulsar={onIndice} />
            {anterior && <Accion texto={`Devolver el Centro a ${anterior.nombre}`} nota="↩" onPulsar={onDevolver} />}
          </>
        ) : (
          <Accion texto="Centrar aquí" nota="el árbol se recoloca" primaria onPulsar={onCentrar} />
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
function Relacion({ datos }: { datos: Datos }) {
  const { frase, pasos } = datos.relacion;
  // «Es» es la cópula y el resto es el parentesco, que es lo que se destaca. Cuando no hay
  // palabra la frase no empieza así y no se destaca nada, que es justo lo que significa.
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
      {!datos.esCentro && (
        <span className="shrink-0 font-[family-name:var(--mono)] text-[11px] text-[var(--mut)]">
          {pasos} {pasos === 1 ? "paso" : "pasos"}
        </span>
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

function Accion({
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
