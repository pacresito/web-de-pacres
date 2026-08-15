"use client";

/**
 * Lo que se dice al acabar el giro, y también al entrar —el enlace con el que se reparte el árbol
 * pone de Centro a quien casi nunca es quien mira, y toda la app le habla de tú—. **Mudar el
 * Centro es la única acción de la app que
 * cambia la pantalla entera**, así que es la única que necesita decir qué ha pasado y poder
 * desandarse en el sitio: el «Volver a ver desde…» de la ficha exige abrirla y saber que
 * está ahí. Y cuenta a los que deja fuera el filtro, que es lo que de verdad desconcierta
 * —desde una rama de fuera se vacía media pantalla— y no lo explica ninguna otra cosa.
 * **Es el mismo número que el del filtro**, no lo que ha cambiado al mudarse: quien lo lee
 * aquí lo vuelve a encontrar al abrir la hoja, y dos cuentas distintas de lo mismo no se
 * reconcilian solas.
 */
export default function AvisoDeMudanza({
  centro,
  escondidos,
  onDeshacer,
  onCerrar,
}: {
  /**
   * Nombre y un apellido, sin la edad: aquí no se identifica a nadie, se dice desde qué
   * ojos se mira. La edad de otro delante de un «como…» desmiente justo lo que la frase
   * dice, y desempatar homónimos es trabajo de la ficha, no del aviso.
   */
  centro: string;
  escondidos: number;
  /** Sin él no se pinta el botón: al entrar no se viene de ningún sitio al que volver. */
  onDeshacer?: () => void;
  onCerrar: () => void;
}) {
  return (
    <div
      role="status"
      style={{ boxShadow: "var(--sh)" }}
      className="absolute bottom-[68px] left-3 flex max-w-[calc(100%-1.5rem)] items-center gap-3 rounded-[10px] border border-[var(--line)] bg-[var(--paper)] py-2 pr-2 pl-4 md:max-w-[480px]"
    >
      <p className="min-w-0 text-[12.5px] leading-[1.35] text-[var(--ink)]">
        Viendo el árbol como <b className="font-semibold">{centro}</b>.
        {escondidos > 0 && (
          <span className="text-[var(--mut)]">
            {" "}
            Hay {escondidos} persona{escondidos === 1 ? "" : "s"} no conectada{escondidos === 1 ? "" : "s"} (de tu
            familia política).
          </span>
        )}
      </p>
      {onDeshacer && (
        <button
          type="button"
          onClick={onDeshacer}
          className="shrink-0 rounded-full border border-[var(--accb)] bg-[var(--acch)] px-3 py-1.5 text-[12px] font-medium text-[var(--acc)]"
        >
          Deshacer
        </button>
      )}
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
