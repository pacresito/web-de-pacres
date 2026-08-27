"use client";

import { type Forma } from "@/data/atlas/formas";
import { useTema } from "@/app/components/usePersistedTheme";
import { marcoDeTinta, rutaDelRelieve } from "@/lib/atlas/silueta";

/**
 * La silueta de un país: la forma, la frontera interior cuando la hay y la línea entre los dos
 * paneles de un país partido. La misma en la tarjeta y en la ficha, que es de lo que se trata —
 * dos siluetas del mismo país dibujadas con reglas distintas serían dos siluetas distintas.
 *
 * `ajustada` la ciñe a su tinta a lo ancho: es lo que pide la ficha, donde la figura se pega a
 * la izquierda de su casilla y Chile en un lienzo cuadrado dejaría dos palmos de nada a los
 * lados. La tarjeta la quiere centrada en el lienzo, que es donde ese aire es el margen.
 *
 * Los países que tienen relieve lo llevan encima del relleno, en una imagen precalculada por
 * scripts/build-atlas-relieve.mts. **El relleno se queda debajo**: mientras la imagen carga, si
 * falla o si el país no tiene, se ve exactamente la silueta de siempre.
 */
export default function Silueta({ id, forma, nombre, ajustada = false, style }: {
  id: string; forma: Forma; nombre: string; ajustada?: boolean; style?: React.CSSProperties;
}) {
  const tema = useTema();
  const relieve = rutaDelRelieve(id, tema);

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
      {/* El relieve va enmascarado en su propio alfa, recortado del mismo path que se dibuja
          aquí: no hace falta recortarlo otra vez con un clipPath, y una máscara sola es una
          máscara que no puede desajustarse de la otra. En el viewBox ceñido de la ficha se
          recorta con él, porque va en las mismas coordenadas del lienzo.
          Encima, el contorno otra vez y sin relleno: la imagen tapa la mitad interior del trazo
          del path de abajo, y en un archipiélago ese trazo es lo que salva de desaparecer a las
          islas que a este tamaño son motas. */}
      {relieve && <>
        {/* `key` por archivo: sin ella React reutiliza el mismo `<image>` de un país al
            siguiente, y un `<image>` al que le cambias el `href` sigue pintando lo anterior
            hasta que descarga lo nuevo — con el relleno de debajo ya cambiado, se ven las dos
            siluetas a la vez. Con `key` monta uno nuevo, que nace vacío. */}
        <image key={relieve} href={relieve} x={0} y={0} width={1000} height={1000} />
        <path d={forma.d} fill="none" stroke="var(--t-accent)" strokeWidth={1.5}
              strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </>}
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
