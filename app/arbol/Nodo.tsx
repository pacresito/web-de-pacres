"use client";

import type { Identidad, Pinta } from "@/lib/arbol/identidad";
import { ALTO_NODO, ANCHO_NODO, type NodoLayout } from "@/lib/arbol/layout";

// Señalar una fracción del recuento atenúa el resto del lienzo en vez de encender lo suyo:
// el acento es del punto de vista y de nada más, y encender con otro color sería inventarse
// un tercer eje encima de los dos que el árbol ya dice.
export const ATENUADO = 0.15;

const SANGRADO = 9; // el aire entre el borde del nodo y su texto

/**
 * Dónde va la línea base del nombre: arriba cuando debajo lleva los años, y al medio
 * cuando no —113 personas no traen ninguna fecha, así que no es el caso raro—. **No es la
 * mitad del nodo:** una línea base centrada deja el texto colgando, y lo que se centra es
 * la altura de las mayúsculas.
 */
const BASE = { conAños: -3, solo: 4 };

/** Cada trozo de la primera línea, con la clase y la cursiva que le tocan. */
const PINTAS: Record<Pinta, { clase: string; cursiva?: boolean }> = {
  nombre: { clase: "nm" },
  dudoso: { clase: "nm", cursiva: true },
  heredado: { clase: "nm-her" },
  año: { clase: "nm-fecha" },
  sinNombre: { clase: "nm-her", cursiva: true },
};

/**
 * El nodo es el bloque de identidad y nada más: quién es arriba y de quién es debajo. Su
 * sitio en el árbol lo dice la posición, y el resto se reparte entre el fondo y el borde:
 * **el fondo mide la cercanía** —cuatro pisadas del acento, del papel al punto de vista— y
 * **el borde dice dónde miras** —el trazo grueso, la línea directa; el acento, tú y la
 * ficha que tengas abierta—. Dos preguntas, dos canales, y ninguna pisando a la otra.
 */
export default function Nodo({
  nodo,
  identidad,
  vida,
  cumpleHoy,
  atenuado,
  abierta,
  onElegir,
}: {
  nodo: NodoLayout;
  identidad: Identidad;
  /** Sus años, ya escritos. Sin paréntesis: abajo no tiene nada de lo que separarse. */
  vida: string;
  /** Se le rodea entero: es lo único del lienzo que habla de un día y no del árbol. */
  cumpleHoy: boolean;
  atenuado: boolean;
  /** Es la ficha que está abierta: el borde de acento dice desde el lienzo a quién lees. */
  abierta: boolean;
  onElegir: () => void;
}) {
  const izquierda = nodo.x - ANCHO_NODO / 2 + SANGRADO;
  return (
    <g
      onClick={onElegir}
      // El contraste dice a cuántas generaciones del punto de vista está, y lo dice por
      // clase para que el tema oscuro pueda comprimir la escala sin que React lo sepa. A
      // quien se está leyendo se le devuelve entero: la distancia ya no es lo que cuenta.
      // `nodo-dir` es quien no se apaga en el giro, y va por clase por lo mismo: el giro se
      // conduce encendiendo una sola clase arriba, sin que React vuelva a pintar 342 nodos.
      className={`nodo cursor-pointer g${abierta ? 0 : Math.min(Math.abs(nodo.nivel), 4)}${
        nodo.lineaDirecta || nodo.esPuntoDeVista ? " nodo-dir" : ""
      }`}
      style={atenuado ? { opacity: ATENUADO } : undefined}
    >
      {/* La guirnalda del cumpleaños, **por fuera del cerco**: los dos caben a la vez, que
          leer la ficha de quien cumple hoy es justo lo que se va a hacer. Rodear entero es
          la única forma de que se encuentre sin buscarlo — una tarta en una esquina tiene
          el tamaño de un detalle, y el día de alguien no lo es. */}
      {cumpleHoy && (
        <rect
          x={nodo.x - ANCHO_NODO / 2 - 9}
          y={nodo.y - ALTO_NODO / 2 - 9}
          width={ANCHO_NODO + 18}
          height={ALTO_NODO + 18}
          rx={18}
          fill="none"
          className="nd-fiesta"
        />
      )}
      {/* El cerco es la tercera marca y no le quita el canal a ninguna de las dos: el fondo
          sigue midiendo la cercanía y el borde, dónde miras. */}
      {abierta && (
        <rect
          x={nodo.x - ANCHO_NODO / 2 - 4}
          y={nodo.y - ALTO_NODO / 2 - 4}
          width={ANCHO_NODO + 8}
          height={ALTO_NODO + 8}
          rx={13}
          // El único hueco va por atributo, que no es un color y no necesita resolver
          // var(): un rect sin regla de relleno se pinta negro macizo, y una hoja de
          // estilos rancia —o la que un deploy se deje por el camino— taparía al nodo
          // justo cuando se le señala.
          fill="none"
          className="nd-cerco"
        />
      )}
      <rect
        x={nodo.x - ANCHO_NODO / 2}
        y={nodo.y - ALTO_NODO / 2}
        width={ANCHO_NODO}
        height={ALTO_NODO}
        rx={9}
        // Fondo y borde por separado: el fondo dice cuánto es tuyo y el borde, dónde miras.
        className={`${
          nodo.esPuntoDeVista ? "nd-pov" : nodo.lineaDirecta ? "nd-dir" : nodo.consanguineo ? "nd-con" : "nd"
        } ${nodo.esPuntoDeVista || abierta ? "bd-acc" : nodo.lineaDirecta ? "bd-dir" : "bd"}`}
      />
      <text x={izquierda} y={nodo.y + (vida ? BASE.conAños : BASE.solo)} fontSize={13} fontWeight={600}>
        {identidad.titulo.map((trozo, i) => (
          <tspan key={i} className={PINTAS[trozo.pinta].clase} fontStyle={PINTAS[trozo.pinta].cursiva ? "italic" : undefined}>
            {trozo.texto}
          </tspan>
        ))}
      </text>
      {/* Abajo, los años. De quién es hijo y con quién se casó lo dicen los trazos que salen
          del nodo, así que escribirlo era decir con letra lo que el lienzo ya dibuja; los
          años no los dibuja nada. Quien no los trae se queda sin línea, y no con una vacía. */}
      {vida && (
        <text x={izquierda} y={nodo.y + 13} fontSize={10.5} className="ct">
          {vida}
        </text>
      )}
    </g>
  );
}
