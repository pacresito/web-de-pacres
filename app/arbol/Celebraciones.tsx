"use client";

// Lo que celebra la familia: los cumpleaños y las onomásticas de los próximos treinta días,
// de la familia cercana que vive y desde el Centro puesto. Solo pinta: quién sale, cuándo y
// cómo se le llama lo decide lib/arbol/celebraciones, y las piezas —hoja, bloque de
// identidad, relación— son las mismas de la ficha, que es donde acaba cada fila.

import {
  anuncio,
  esFelicitacion,
  esTuDia,
  felicitacion,
  loQueViene,
  VENTANA,
  type Celebracion,
} from "@/lib/arbol/celebraciones";
import { diaDeLaSemana, escribirCorto, escribirDiaDeMes, type Fecha } from "@/lib/arbol/fechas";
import type { Identidad } from "@/lib/arbol/identidad";
import { BloqueIdentidad } from "./Identidad";
import Redondo from "./Redondo";
import { ALTO_REGLA } from "./Regla";

export default function Celebraciones({
  lista,
  hoy,
  identidad,
  onPersona,
}: {
  lista: Celebracion[];
  /** El día del servidor: la lista cuenta en «faltan», y para leerla hay que saber desde cuándo. */
  hoy: Fecha;
  /** El bloque de identidad de quien celebra, ya escrito para esta lista. */
  identidad: (id: string) => Identidad;
  onPersona: (id: string) => void;
}) {
  const destacado = inminente(lista);
  return (
    <div className="flex flex-col">
      <h2 className="font-[family-name:var(--serif)] text-[24px] leading-[1.15]">Lo que se celebra</h2>
      {/* Qué día es hoy y cuánto falta para lo primero. La ventana y la familia que entra
          no se cuentan: se ven en la lista, y quien las eche de menos no las echa aquí. */}
      <p className="mt-1 text-[12.5px] text-[var(--mut)]">
        Hoy es {diaDeLaSemana(hoy)}, {escribirDiaDeMes(hoy)}
        {lista.length > 0 && ` · ${loQueViene(lista)}`}
      </p>
      <div className="mt-3.5 flex flex-col gap-1">
        {lista.length === 0 ? (
          <p className="py-1 text-[12.5px] text-[var(--mut)]">Nadie celebra nada en {VENTANA} días. Aprovecha la calma.</p>
        ) : (
          lista.map((c) => (
            <Fila
              key={`${c.tipo}:${c.id ?? ""}`}
              celebracion={c}
              destacada={c.faltan === destacado}
              identidad={identidad}
              onPersona={onPersona}
            />
          ))
        )}
      </div>
    </div>
  );
}

/**
 * Qué día se remarca, o nada si no hay ninguno encima. **Se remarca un solo día y es el
 * primero**: con hoy y mañana encendidos a la vez, media lista sale en negrita y dejan de
 * destacar los dos. Mañana solo se lleva el marco cuando hoy no hay nada que celebrar.
 */
const inminente = (lista: Celebracion[]): number | null =>
  lista.length > 0 && lista[0].faltan <= 1 ? lista[0].faltan : null;


/**
 * Lo que lleva el día que está encima: el marco y el gris, que en esta lista no los lleva
 * nadie más. **El acento queda fuera** —es del Centro— y el marco va siempre puesto, en
 * transparente cuando no toca: entrar y salir del borde corría la fila píxeles arriba.
 */
const MARCO = "rounded-[10px] border-[1.5px]";
const REMARCADA = "border-[var(--ink)] bg-[var(--soft)]";

/**
 * La fila normal dice cuándo, quién es y qué celebra. Lo del propio Centro y los dos días
 * que son de todos no: eso va dirigido a quien mira, y se lleva la frase en lugar de una
 * casilla.
 *
 * **El parentesco desde el Centro no entra**, aunque `celebracion` lo traiga: esta lista se
 * abre para saber a quién felicitar, y saber que es tu sobrino no cambia la respuesta. La
 * línea entera se la queda entonces de quién es, que es lo que distingue a los que se
 * llaman igual.
 */
function Fila({
  celebracion: c,
  destacada,
  identidad,
  onPersona,
}: {
  celebracion: Celebracion;
  /** Es del día que está encima, sea de quien sea: eso es lo que se remarca. */
  destacada: boolean;
  identidad: (id: string) => Identidad;
  onPersona: (id: string) => void;
}) {
  if (esFelicitacion(c)) {
    return (
      <div
        className={`${MARCO} flex items-baseline gap-2.5 px-2.5 py-2 text-[12.5px] text-[var(--ink)] ${
          destacada ? `${REMARCADA} font-medium` : "border-transparent bg-[var(--soft)]"
        }`}
      >
        {/* El día va en la misma mono que en las demás filas: la lista se lee por su columna
            de la izquierda, y una fila con otra letra ahí se lee como si dijera otra cosa. */}
        <span className="w-11 shrink-0 text-right font-[family-name:var(--mono)] text-[11px] tabular-nums text-[var(--mut)]">
          {cuando(c)}
        </span>
        <span className="flex-1">
          {c.faltan === 0 && (c.tipo === "cumpleaños" ? "🎂 " : "🎉 ")}
          {felicitacion(c)}
        </span>
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={() => onPersona(c.id!)}
      className={`${MARCO} flex items-start gap-2.5 px-1.5 py-1.5 text-left ${
        destacada ? REMARCADA : "border-transparent hover:bg-[var(--soft)] active:bg-[var(--soft)]"
      }`}
    >
      <span className="w-11 shrink-0 pt-px text-right font-[family-name:var(--mono)] text-[11px] tabular-nums text-[var(--mut)]">
        {cuando(c)}
      </span>
      <BloqueIdentidad identidad={identidad(c.id!)} />
      <span className="shrink-0 pt-px text-[11px] whitespace-nowrap text-[var(--mut)]">
        {c.tipo === "cumpleaños" ? `cumple ${c.edad}` : "onomástica"}
      </span>
    </button>
  );
}

const cuando = (c: Celebracion) => (c.faltan === 0 ? "hoy" : c.faltan === 1 ? "mañana" : escribirCorto(c.fecha));

/**
 * El aviso flotante. **Solo se estira el día propio**, que es lo único que no admite
 * enterarse mañana: cuántas celebraciones caen en un mes no es una noticia y no gana un
 * rótulo fijo en el borde, así que el resto del año es la tarta y nada más.
 */
export function AvisoCelebraciones({
  lista,
  onAbrir,
  apartado,
  oculto,
}: {
  lista: Celebracion[];
  onAbrir: () => void;
  /** Lo que se corre a la izquierda cuando la hoja ocupa su columna de la derecha. */
  apartado: string;
  /** El índice desplegado se come la fila de arriba entera: donde no caben, este se va. */
  oculto: boolean;
}) {
  const tuDia = lista.find((c) => c.faltan === 0 && esTuDia(c));
  // Debajo de la regla, como la búsqueda: el borde de arriba es suyo a lo ancho.
  const sitio = `absolute right-3 ${apartado} ${oculto ? "hidden md:flex" : "flex"}`;
  if (!tuDia) {
    return (
      <Redondo etiqueta="Lo que se celebra" onPulsar={onAbrir} className={`${sitio} text-[17px]`} style={{ top: ALTO_REGLA + 12 }}>
        🎂
      </Redondo>
    );
  }
  return (
    <button
      type="button"
      onClick={onAbrir}
      style={{ boxShadow: "var(--sh)", top: ALTO_REGLA + 12 }}
      className={`${sitio} h-11 max-w-[calc(100vw-1.5rem)] items-center rounded-full border-[1.5px] border-[var(--ink)] bg-[var(--paper)] px-4 text-[13px] font-medium text-[var(--ink)]`}
    >
      {anuncio(tuDia)}
    </button>
  );
}
