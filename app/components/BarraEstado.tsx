import type { CSSProperties, ReactNode } from "react";

/**
 * La barra de estado de un experimento: la línea de datos en monoespaciada sobre el lienzo,
 * los iconos de la derecha y la regla que la separa de él. La flecha la pone la hoja de estilos
 * sobre el primer hijo, así que el contenido empieza en el dato — también el que escribe por
 * `innerHTML` el bucle de render, que entra en un hijo con la clase `be-elastico`.
 */
export default function BarraEstado({ children, acciones, estilo }: {
  children: ReactNode;
  acciones?: ReactNode;
  estilo?: CSSProperties;
}) {
  return (
    <div className="be-barra" style={estilo}>
      {children}
      {acciones && <div className="be-fin">{acciones}</div>}
    </div>
  );
}

/** Un dato de la barra: `etiqueta: valor`. La etiqueta se apaga y el valor se lee — lo que
 *  cambia es lo que se mira. */
export function Dato({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div className="be-dato">
      <span className="be-etq">{etiqueta}:</span>
      {children}
    </div>
  );
}
