"use client";

import { type Forma } from "@/data/atlas/formas";
import { marcoDeTinta } from "@/lib/atlas/silueta";

/**
 * La silueta de un país: la forma, la frontera interior cuando la hay y la línea entre los dos
 * paneles de un país partido. La misma en la tarjeta y en la ficha, que es de lo que se trata —
 * dos siluetas del mismo país dibujadas con reglas distintas serían dos siluetas distintas.
 *
 * `ajustada` la ciñe a su tinta a lo ancho: es lo que pide la ficha, donde la figura se pega a
 * la izquierda de su casilla y Chile en un lienzo cuadrado dejaría dos palmos de nada a los
 * lados. La tarjeta la quiere centrada en el lienzo, que es donde ese aire es el margen.
 */
export default function Silueta({ forma, nombre, ajustada = false, style }: {
  forma: Forma; nombre: string; ajustada?: boolean; style?: React.CSSProperties;
}) {
  return (
    <svg
      // El arrecife entra en la cuenta de la tinta: asoma por fuera de la tierra, y ceñirse solo
      // a ella le cortaría los anillos por los lados.
      viewBox={ajustada ? marcoDeTinta(forma.d + forma.arrecife) : "0 0 1000 1000"}
      preserveAspectRatio={ajustada ? "xMinYMid meet" : undefined}
      style={style}
      aria-label={`Forma de ${nombre}`}
    >
      {/* El coral, debajo de la tierra: en un archipiélago de atolones el anillo es la forma que
          se reconoce y los islotes que lo coronan son el detalle que va encima. Sin relleno y sin
          cerrar — un arrecife no encierra nada.
          **Va más grueso que la tierra**, y no por jerarquía: la tierra tiene relleno detrás y el
          trazo solo la salva de desaparecer, mientras que el anillo **es** solo trazo. A tamaño de
          ficha un atolón mide cuatro píxeles, y a un pelo de ancho el anillo no se cierra: se lee
          como suciedad. Los de Tuvalu, que son los más pequeños, marcan el listón. */}
      {forma.arrecife && <path d={forma.arrecife} fill="none" stroke="var(--t-accent)" strokeWidth={3}
            strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />}
      {/* Trazo además de relleno, como en el globo y el minimapa: un archipiélago de atolones
          —Maldivas, Tuvalu, las Marshall— relleno a secas se queda en unas motas que no se ven.
          A los grandes, un píxel y medio de contorno no les hace nada. */}
      <path d={forma.d} fill="var(--t-accent)" fillRule="evenodd"
            stroke="var(--t-accent)" strokeWidth={1.5} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      {/* Frontera interior, cuando la hay: Marruecos y el Sáhara Occidental salen juntos —el
          globo viene de otra fuente y recortar uno los descuadraba— y la línea dice dónde acaba
          uno. */}
      {forma.linea && <path d={forma.linea} fill="none" stroke="var(--t-paper)" strokeWidth={6} strokeDasharray="18 14" strokeLinecap="round" opacity={0.75} />}
      {/* La línea entre los dos paneles de un país partido: dice que sus dos islas están a la
          escala buena pero no a la distancia buena. */}
      {forma.separador && <path d={forma.separador} fill="none" stroke="var(--t-ink4)" strokeWidth={6} strokeDasharray="18 14" strokeLinecap="round" />}
    </svg>
  );
}
