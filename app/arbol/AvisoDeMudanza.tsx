"use client";

/**
 * Lo que se dice al acabar el giro. **Mudar el Centro es la única acción de la app que
 * cambia la pantalla entera**, así que es la única que necesita decir qué ha pasado y poder
 * desandarse en el sitio: el «Volver a ver desde…» de la ficha exige abrirla y saber que
 * está ahí. Y cuenta a los que se ha llevado el filtro, que es lo que de verdad desconcierta
 * —desde una rama de fuera se vacía media pantalla— y no lo explica ninguna otra cosa.
 */
export default function AvisoDeMudanza({
  centro,
  seEscondieron,
  onDeshacer,
  onCerrar,
}: {
  centro: string;
  seEscondieron: number;
  onDeshacer: () => void;
  onCerrar: () => void;
}) {
  return (
    <div
      role="status"
      style={{ boxShadow: "var(--sh)" }}
      className="absolute bottom-[68px] left-3 flex max-w-[calc(100%-1.5rem)] items-center gap-3 rounded-[10px] border border-[var(--line)] bg-[var(--paper)] py-2 pr-2 pl-4 md:max-w-[480px]"
    >
      <p className="min-w-0 text-[12.5px] leading-[1.35] text-[var(--ink)]">
        El árbol se ha recolocado alrededor de <b className="font-semibold">{centro}</b>.
        {seEscondieron > 0 && <span className="text-[var(--mut)]"> Desde aquí el filtro esconde a {seEscondieron} más.</span>}
      </p>
      <button
        type="button"
        onClick={onDeshacer}
        className="shrink-0 rounded-full border border-[var(--accb)] bg-[var(--acch)] px-3 py-1.5 text-[12px] font-medium text-[var(--acc)]"
      >
        Deshacer
      </button>
      <button
        type="button"
        onClick={onCerrar}
        aria-label="Cerrar el aviso"
        className="-mr-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] text-[var(--mut)] hover:text-[var(--ink)]"
      >
        ✕
      </button>
    </div>
  );
}
