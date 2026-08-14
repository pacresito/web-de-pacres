"use client";

import type { Identidad, Pinta } from "@/lib/arbol/identidad";
import { ALTO_NODO, ANCHO_NODO, type NodoLayout } from "@/lib/arbol/layout";

// Señalar una fracción del recuento atenúa el resto del lienzo en vez de encender lo suyo:
// el acento es del punto de vista y de nada más, y encender con otro color sería inventarse
// un tercer eje encima de los dos que el árbol ya dice.
export const ATENUADO = 0.15;

const SANGRADO = 9; // el aire entre el borde del nodo y su texto

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
  cumpleHoy,
  atenuado,
  abierta,
  onElegir,
}: {
  nodo: NodoLayout;
  identidad: Identidad;
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
      <text x={izquierda} y={nodo.y - 3} fontSize={13} fontWeight={600}>
        {identidad.titulo.map((trozo, i) => (
          <tspan key={i} className={PINTAS[trozo.pinta].clase} fontStyle={PINTAS[trozo.pinta].cursiva ? "italic" : undefined}>
            {trozo.texto}
          </tspan>
        ))}
      </text>
      {/* La segunda línea es lo que identifica de verdad a quien no trae ni apellido ni
          fecha: se pinta apagada, pero no se quita nunca. */}
      <text x={izquierda} y={nodo.y + 13} fontSize={10.5} className="ct">
        {identidad.contexto}
      </text>
      {/* La esquina de arriba a la derecha es la única que no usa ni la manija ni el «+»
          de la pareja, así que la tarta cabe sin taparle nada a nadie. */}
      {cumpleHoy && (
        <text x={nodo.x + ANCHO_NODO / 2 - 13} y={nodo.y - ALTO_NODO / 2 + 5} textAnchor="middle" fontSize={15}>
          🎂
        </text>
      )}
    </g>
  );
}
