"use client";

// Fase 6 del rediseño, y nada más que eso: el mismo árbol pintado de arriba abajo —los
// ancestros arriba, una banda por generación— para mirar **una sola cosa**: si el bloque de
// identidad de dos líneas sigue cabiendo cuando la generación manda en el alto y no en el
// ancho. No sustituye a `/arbol`: aquí no hay cámara, ni riel, ni ficha, ni búsqueda, y las
// marcas que se pulsan no están porque no hay nada que abrir salvo el interruptor de arriba.
//
// **El layout no se toca.** `calcularLayout` empaqueta por un eje y reparte generaciones por
// el otro sin saber cuál de los dos se pinta a lo alto, así que basta transponerlo al
// dibujar. El eje de empaquetado se escala **uniformemente**, y por eso donde no había
// solape no puede haberlo: todos los huecos salen iguales o mayores que los de `/arbol`.
//
// El nodo, el trazo de pareja y el contador se dibujan aquí otra vez: `Nodo.tsx` y
// `Piezas.tsx` los pintan en coordenadas del árbol y esto en las de pantalla. Son ochenta
// líneas que **no se enteran de lo que cambie allí**, y ese es el precio de que `/arbol` no
// tenga que saber que existe otro eje. Si un día divergen, se borra esta ruta: ya contestó.

import { useMemo, useState } from "react";
import { construirGrafo } from "@/lib/arbol/grafo";
import { identidadDe, libretaDe, LARGOS_NODO, type Pinta } from "@/lib/arbol/identidad";
import {
  ALTO_CONTADOR,
  ALTO_NODO,
  ANCHO_COLUMNA,
  ANCHO_CONTADOR,
  ANCHO_NODO,
  calcularLayout,
  type Vinculo,
} from "@/lib/arbol/layout";
import { tramosDePareja } from "@/lib/arbol/trazos";
import { CORAZON, GRIETA, GUION } from "../Piezas";
import type { ArbolData } from "@/lib/arbol/tree";

const POR_DEFECTO = "p25";
const SEP_PAREJA = 26; // el hueco entre los dos de una pareja; layout.ts no lo exporta
const PASO = 160; // de una generación a la siguiente, ahora a lo alto
const SANGRADO = 9; // el aire entre el borde del nodo y su texto, como en el lienzo
const SALTO = 5; // el saltito con que un trazo pasa por encima de otro
const MARGEN = 80;

/** Los tres anchos que se comparan: el de hoy y dos estrecheces plausibles en bandas. */
const ANCHOS = [228, 176, 144];
const ZOOMS = [1, 0.5, 0.25];

/** El eje de generación, que en `/arbol` es el ancho y aquí el alto. */
const K_GEN = PASO / ANCHO_COLUMNA;
const py = (x: number) => x * K_GEN;

/**
 * Y el de empaquetado, que pasa a ser el ancho de pantalla. El factor es el que le deja a la
 * pareja el mismo hueco que tiene hoy: escalar por el de las unidades sueltas la pegaba.
 */
const packDe = (ancho: number) => (ancho + SEP_PAREJA) / (ALTO_NODO + SEP_PAREJA);

const PINTAS: Record<Pinta, { clase: string; cursiva?: boolean }> = {
  nombre: { clase: "nm" },
  dudoso: { clase: "nm", cursiva: true },
  heredado: { clase: "nm-her" },
  año: { clase: "nm-fecha" },
  sinNombre: { clase: "nm-her", cursiva: true },
};

export default function Vertical({ data, hoy }: { data: ArbolData; hoy: string }) {
  const [ancho, setAncho] = useState(ANCHOS[0]);
  const [zoom, setZoom] = useState(1);
  const [todo, setTodo] = useState(false);

  const grafo = useMemo(() => construirGrafo(data), [data]);
  const libreta = useMemo(() => libretaDe(grafo), [grafo]);
  const layout = useMemo(
    () =>
      calcularLayout(grafo, {
        puntoDeVista: grafo.personaPorId.has(POR_DEFECTO) ? POR_DEFECTO : (data.people[0]?.id ?? POR_DEFECTO),
        expandidas: todo ? new Set(grafo.unionPorId.keys()) : new Set(),
        parejas: new Set(),
        ocultarNoConectados: true,
      }),
    [grafo, data, todo],
  );

  const px = useMemo(() => {
    const k = packDe(ancho);
    return (y: number) => y * k;
  }, [ancho]);

  /** Lo que le cabe a cada línea, a los mismos píxeles por carácter que el lienzo de hoy. */
  const largos = useMemo(() => {
    const util = ancho - 2 * SANGRADO;
    const base = ANCHO_NODO - 2 * SANGRADO;
    return {
      titulo: Math.floor((util * LARGOS_NODO.titulo) / base),
      contexto: Math.floor((util * LARGOS_NODO.contexto) / base),
    };
  }, [ancho]);

  const escribir = (id: string) =>
    identidadDe(grafo, id, {
      linaje: libreta.linaje,
      fechas: "edad",
      apellidos: "nuevos",
      hoy,
      largos,
      homonimia: libreta.homonimias.get(id),
    });

  const niveles = [...new Set(layout.nodos.map((n) => n.nivel))];
  const marco = {
    x: px(layout.limites.minY) - ancho / 2 - MARGEN,
    y: py(layout.limites.minX) - ALTO_NODO / 2 - MARGEN,
    w: px(layout.limites.maxY - layout.limites.minY) + ancho + 2 * MARGEN,
    h: py(layout.limites.maxX - layout.limites.minX) + ALTO_NODO + 2 * MARGEN,
  };

  /** Por dónde sale el reparto de su ancla: del hueco de la pareja o del borde de abajo. */
  const salidaDe = (v: Vinculo) =>
    py(v.x) + (v.salida === v.x ? 0 : v.salida - v.x === ANCHO_NODO / 2 ? ALTO_NODO / 2 : ALTO_CONTADOR / 2);

  /** Un tramo hacia abajo que salta por encima de las horizontales ajenas que cruza. */
  const abajo = (hasta: number, x: number, saltos: number[]): string =>
    [
      ...saltos.map((s) => `V ${(py(s) - SALTO).toFixed(2)} A ${SALTO} ${SALTO} 0 0 0 ${x.toFixed(2)} ${(py(s) + SALTO).toFixed(2)}`),
      `V ${hasta.toFixed(2)}`,
    ].join(" ");

  /** El trazo de una unión a uno de sus hijos: baja, se corre por el hueco y vuelve a bajar. */
  const bajada = (v: Vinculo, h: Vinculo["hijos"][number]): string => {
    const x = px(v.y);
    const arranque = `M ${x.toFixed(2)} ${salidaDe(v).toFixed(2)}`;
    const borde = py(h.x) - (h.ancho === ANCHO_NODO ? ALTO_NODO : ALTO_CONTADOR) / 2;
    if (h.recto) return `${arranque} ${abajo(borde, x, h.saltos)}`;
    const destino = px(h.y);
    return `${arranque} ${abajo(py(v.canal), x, v.saltos)} H ${destino.toFixed(2)} ${abajo(borde, destino, h.saltos)}`;
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-[var(--line)] px-4 py-2 text-[12px] text-[var(--mut)]">
        <Grupo titulo="Ancho del nodo">
          {ANCHOS.map((a) => (
            <Boton key={a} puesto={a === ancho} onPulsar={() => setAncho(a)}>
              {a} px · {Math.floor(((a - 2 * SANGRADO) * LARGOS_NODO.contexto) / (ANCHO_NODO - 2 * SANGRADO))} car
            </Boton>
          ))}
        </Grupo>
        <Grupo titulo="Zoom">
          {ZOOMS.map((z) => (
            <Boton key={z} puesto={z === zoom} onPulsar={() => setZoom(z)}>
              {z}×
            </Boton>
          ))}
        </Grupo>
        <Boton puesto={todo} onPulsar={() => setTodo(!todo)}>
          Desplegar todo
        </Boton>
        <span className="font-[family-name:var(--mono)]">
          {layout.nodos.length} personas · {Math.round(marco.w)} × {Math.round(marco.h)} px
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-auto bg-[var(--paper)]">
        <svg
          width={marco.w * zoom}
          height={marco.h * zoom}
          viewBox={`${marco.x} ${marco.y} ${marco.w} ${marco.h}`}
          className="block"
        >
          {/* Una banda por generación: lo que el diseño quería y el eje horizontal no daba. */}
          {niveles.map((nivel) => (
            <rect
              key={nivel}
              x={marco.x}
              y={-nivel * PASO - PASO / 2}
              width={marco.w}
              height={PASO}
              className={nivel % 2 === 0 ? "banda-a" : "banda-b"}
            />
          ))}

          {layout.vinculos.map((v) => (
            <g key={v.unionId} className={v.directo ? "lk-dir" : "lk"}>
              {v.hijos.map((h, i) => (
                <path key={i} d={bajada(v, h)} />
              ))}
              {v.pareja && <TrazoDePareja v={v} x={px(v.pareja[0])} otro={px(v.pareja[1])} ancho={ancho} />}
            </g>
          ))}

          {layout.contadores.map((c) => (
            <g key={`${c.sentido}:${c.unionId}`}>
              <rect
                x={px(c.y) - ANCHO_CONTADOR / 2}
                y={py(c.x) - ALTO_CONTADOR / 2}
                width={ANCHO_CONTADOR}
                height={ALTO_CONTADOR}
                rx={ALTO_CONTADOR / 2}
                className="pieza"
                strokeDasharray="4 3"
              />
              <text x={px(c.y)} y={py(c.x) + 4} textAnchor="middle" fontSize={12} className="pieza-tx">
                +{c.cantidad} {c.sentido}
              </text>
            </g>
          ))}

          {layout.nodos.map((n) => {
            const identidad = escribir(n.id);
            return (
              <g key={n.id} className={`nodo g${Math.min(Math.abs(n.nivel), 4)}`} transform={`translate(${px(n.y).toFixed(2)} ${py(n.x).toFixed(2)})`}>
                <rect
                  x={-ancho / 2}
                  y={-ALTO_NODO / 2}
                  width={ancho}
                  height={ALTO_NODO}
                  rx={9}
                  className={`${
                    n.esPuntoDeVista ? "nd-pov" : n.lineaDirecta ? "nd-dir" : n.consanguineo ? "nd-con" : "nd"
                  } ${n.esPuntoDeVista ? "bd-acc" : n.lineaDirecta ? "bd-dir" : "bd"}`}
                />
                <text x={-ancho / 2 + SANGRADO} y={-3} fontSize={13} fontWeight={600}>
                  {identidad.titulo.map((trozo, i) => (
                    <tspan
                      key={i}
                      className={PINTAS[trozo.pinta].clase}
                      fontStyle={PINTAS[trozo.pinta].cursiva ? "italic" : undefined}
                    >
                      {trozo.texto}
                    </tspan>
                  ))}
                </text>
                <text x={-ancho / 2 + SANGRADO} y={13} fontSize={10.5} className="ct">
                  {identidad.contexto}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

/** El trazo de la pareja, que en bandas es horizontal: los dos se pintan uno al lado del otro. */
function TrazoDePareja({ v, x, otro, ancho }: { v: Vinculo; x: number; otro: number; ancho: number }) {
  const bordes: [number, number] = x < otro ? [x + ancho / 2, otro - ancho / 2] : [x - ancho / 2, otro + ancho / 2];
  const { tramos, centro } = tramosDePareja(bordes, v.tipo === "pareja");
  const y = py(v.x);
  return (
    <>
      {tramos.map(([desde, hasta], i) => (
        <line
          key={i}
          x1={desde}
          y1={y}
          x2={hasta}
          y2={y}
          className="par"
          strokeWidth={2.5}
          strokeDasharray={v.roto && v.tipo !== "pareja" ? GUION : undefined}
        />
      ))}
      {v.tipo === "pareja" && (
        <g transform={`translate(${centro.toFixed(2)} ${y.toFixed(2)})`} className="par-cor">
          <path d={CORAZON} strokeWidth={1.4} />
          {v.roto && <path d={GRIETA} strokeWidth={1} fill="none" />}
        </g>
      )}
    </>
  );
}

const Grupo = ({ titulo, children }: { titulo: string; children: React.ReactNode }) => (
  <span className="flex items-center gap-1.5">
    <span className="font-[family-name:var(--mono)] text-[9.5px] tracking-[0.1em] uppercase">{titulo}</span>
    {children}
  </span>
);

const Boton = ({ puesto, onPulsar, children }: { puesto: boolean; onPulsar: () => void; children: React.ReactNode }) => (
  <button
    type="button"
    onClick={onPulsar}
    className={`rounded-[7px] border px-2 py-1 ${
      puesto ? "border-[var(--acc)] bg-[var(--acc)] text-[var(--paper)]" : "border-[var(--line)] text-[var(--ink)]"
    }`}
  >
    {children}
  </button>
);
