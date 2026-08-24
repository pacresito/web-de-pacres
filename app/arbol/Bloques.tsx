"use client";

// La escala media del lienzo, en SVG: un recuadro por grupo de hermanos en lugar de uno por
// persona. Quién va en cada uno y dónde cae lo decide lib/arbol/bloques; aquí solo se pinta.
//
// El bloque comparte los dos canales del nodo —el fondo dice cuánto es tuyo y el borde dónde
// miras— y añade el tercero que solo tiene sentido en grupo: una marca por persona, para que
// el tamaño de cada familia se vea sin leer el recuento.

import { ALTO_BLOQUE, ANCHO_BLOQUE, type Bloque } from "@/lib/arbol/bloques";

const SANGRADO = 12;
const MARCA = { ancho: 7, alto: 12, hueco: 3 };

/**
 * El título nombra a dos personas y no se recorta: **encoge**. Dos nombres compuestos
 * —«de José Gerardo y María de los Ángeles»— piden medio recuadro más del que hay, y las dos
 * salidas de siempre son peores que esta: acortarlos en el dato le cambia el nombre a
 * alguien en toda la app, y cortarlos con «…» tapa justo la mitad que distingue a una
 * pareja de la de al lado. Un cuerpo más pequeño se lee; medio nombre, no.
 */
const TITULO = { cuerpo: 17, minimo: 12, ancho: ANCHO_BLOQUE - SANGRADO * 2 };
/**
 * Lo que mide un carácter por cada píxel de cuerpo, medido en el navegador sobre los 98
 * títulos que caben en pantalla: el más apretado da 0,500 y el más suelto 0,486, así que
 * esto lleva su pizca de sobra. El nodo mide 0,492 y no es el mismo número: allí la letra
 * es más pequeña y el hinting la ensancha menos.
 */
const PASO = 0.51;

const cuerpoDelTitulo = (titulo: string): number =>
  +Math.max(TITULO.minimo, Math.min(TITULO.cuerpo, TITULO.ancho / (titulo.length * PASO))).toFixed(2);

export default function Bloques({
  bloques,
  conTitulo,
  puntoDeVista,
  onElegir,
}: {
  bloques: Bloque[];
  /** Alejado del todo el título no se leería: el mapa se queda en cajas y marcas. */
  conTitulo: boolean;
  puntoDeVista: string;
  onElegir: (bloque: Bloque) => void;
}) {
  return (
    <>
      {bloques.map((b) => (
        <Recuadro key={b.id} bloque={b} conTitulo={conTitulo} puntoDeVista={puntoDeVista} onElegir={() => onElegir(b)} />
      ))}
    </>
  );
}

function Recuadro({
  bloque,
  conTitulo,
  puntoDeVista,
  onElegir,
}: {
  bloque: Bloque;
  conTitulo: boolean;
  puntoDeVista: string;
  onElegir: () => void;
}) {
  const izquierda = bloque.x - ANCHO_BLOQUE / 2 + SANGRADO;
  const gente = [...bloque.hermanos, ...bloque.parejas];
  return (
    <g onClick={onElegir} className="cursor-pointer">
      <rect
        x={bloque.x - ANCHO_BLOQUE / 2}
        y={bloque.y - ALTO_BLOQUE / 2}
        width={ANCHO_BLOQUE}
        height={ALTO_BLOQUE}
        rx={10}
        className={`${bloque.esDelPuntoDeVista ? "nd-pov" : bloque.lineaDirecta ? "nd-dir" : "nd"} ${
          bloque.esDelPuntoDeVista ? "bd-acc" : bloque.lineaDirecta ? "bd-dir" : "bd"
        }`}
      />
      {conTitulo && (
        <>
          <text x={izquierda} y={bloque.y - 6} fontSize={cuerpoDelTitulo(bloque.titulo)} fontWeight={600} className="nm">
            {bloque.titulo}
          </text>
          <text x={izquierda} y={bloque.y + 10} fontSize={12} className="ct">
            {recuento(bloque)}
          </text>
        </>
      )}
      {/* Una marca por persona, apoyadas en el borde de abajo: cuántos son se ve antes de
          leer cuántos son. La del punto de vista, en acento — es la única que se busca. */}
      <g>
        {gente.map((id, i) => (
          <rect
            key={id}
            x={izquierda + i * (MARCA.ancho + MARCA.hueco)}
            y={bloque.y + ALTO_BLOQUE / 2 - MARCA.alto - 6}
            width={MARCA.ancho}
            height={MARCA.alto}
            rx={2}
            className={id === puntoDeVista ? "mk-pov" : "mk"}
          />
        ))}
      </g>
    </g>
  );
}

/** «5 hermanos · 3 parejas», y sin la mitad que no hay: un «0 parejas» no dice nada. */
function recuento({ hermanos, parejas, sinPadres }: Bloque): string {
  if (sinPadres) return "no constan sus padres";
  const partes = [plural(hermanos.length, "hermano", "hermanos"), plural(parejas.length, "pareja", "parejas")];
  return partes.filter(Boolean).join(" · ");
}

const plural = (n: number, uno: string, varios: string) => (n === 0 ? "" : `${n} ${n === 1 ? uno : varios}`);
