"use client";

/**
 * La esquina de abajo a la izquierda, que es de lo que se está mirando de cerca: la hoja
 * recogida —una ficha o un camino— o la fracción señalada. **No se pisan porque no
 * conviven** —encender uno apaga al otro, que es lo que el lienzo ya hacía al decidir a
 * quién atenuar—, así que comparten sitio y forma. Dos líneas y no una: el nombre entero es
 * justo lo que se ha venido a leer, y en una fila que además esquiva a «Qué se ve» no cabe.
 */
export default function BarraDeAbajo({
  rotulo,
  titulo,
  onAbrir,
  onCerrar,
  cerrar,
}: {
  /** De qué va, en la línea de arriba: es lo fijo, y lo que no se recorta nunca. */
  rotulo: string;
  titulo: string;
  onAbrir?: () => void;
  onCerrar: () => void;
  cerrar: string;
}) {
  const texto = (
    <>
      <span className="block font-[family-name:var(--mono)] text-[10px] tracking-[0.08em] text-[var(--mut)] uppercase">
        {rotulo}
      </span>
      <span className="block truncate text-[13px] font-semibold text-[var(--ink)]">{titulo}</span>
    </>
  );
  return (
    <div
      style={{ boxShadow: "var(--sh)" }}
      // Lo que se reserva a la derecha es «Qué se ve», que está siempre y no se aparta.
      className="absolute bottom-3 left-3 flex max-w-[calc(100%-4.5rem)] items-center rounded-[14px] border border-[var(--line)] bg-[var(--paper)] py-1.5 pl-4"
    >
      {onAbrir ? (
        <button type="button" onClick={onAbrir} className="min-w-0 text-left">
          {texto}
        </button>
      ) : (
        <span className="min-w-0">{texto}</span>
      )}
      <button
        type="button"
        onClick={onCerrar}
        aria-label={cerrar}
        className="ml-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[15px] text-[var(--mut)] hover:text-[var(--ink)]"
      >
        ✕
      </button>
    </div>
  );
}
