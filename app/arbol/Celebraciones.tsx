"use client";

// Lo que celebra la familia: los cumpleaños y las onomásticas de los próximos treinta días,
// de la familia cercana que vive y desde el Centro puesto. Solo pinta: quién sale, cuándo y
// cómo se le llama lo decide lib/arbol/celebraciones, y las piezas —hoja, bloque de
// identidad, relación— son las mismas de la ficha, que es donde acaba cada fila.

import { anuncio, esFelicitacion, esTuDia, felicitacion, VENTANA, type Celebracion } from "@/lib/arbol/celebraciones";
import { escribirCorto } from "@/lib/arbol/fechas";
import { LARGOS_FILA, type Identidad } from "@/lib/arbol/identidad";
import { BloqueIdentidad } from "./Identidad";

export default function Celebraciones({
  lista,
  identidad,
  onPersona,
}: {
  lista: Celebracion[];
  /** El bloque de identidad de quien celebra, con el hueco que la fila le deja abajo. */
  identidad: (id: string, largoContexto: number) => Identidad;
  onPersona: (id: string) => void;
}) {
  return (
    <div className="flex flex-col">
      <h2 className="font-[family-name:var(--serif)] text-[24px] leading-[1.15]">Lo que se celebra</h2>
      <p className="mt-1 text-[12.5px] text-[var(--mut)]">
        Los próximos {VENTANA} días, de la familia cercana.
      </p>
      <div className="mt-3.5 flex flex-col gap-1">
        {lista.length === 0 ? (
          <p className="py-1 text-[12.5px] text-[var(--mut)]">Nadie celebra nada en {VENTANA} días. Aprovecha la calma.</p>
        ) : (
          lista.map((c) => <Fila key={`${c.tipo}:${c.id ?? ""}`} celebracion={c} identidad={identidad} onPersona={onPersona} />)
        )}
      </div>
    </div>
  );
}

/** Por poco que le quite la relación, la segunda línea sigue teniendo que identificar. */
const HUECO_MINIMO = 16;

/**
 * La fila normal dice cuándo, quién es —bloque de identidad, con la relación desde el
 * Centro pegada detrás— y qué celebra. Lo del propio Centro y los dos días que son de
 * todos no: eso va dirigido a quien mira, y se lleva la frase en lugar de una casilla.
 */
function Fila({
  celebracion: c,
  identidad,
  onPersona,
}: {
  celebracion: Celebracion;
  identidad: (id: string, largoContexto: number) => Identidad;
  onPersona: (id: string) => void;
}) {
  const hoy = c.faltan === 0;
  if (esFelicitacion(c)) {
    return (
      <div
        className={`flex items-baseline gap-2.5 rounded-[10px] px-2.5 py-2 text-[12.5px] ${
          hoy && esTuDia(c) ? "border-[1.5px] border-[var(--ink)] font-medium text-[var(--ink)]" : "bg-[var(--soft)] text-[var(--ink)]"
        }`}
      >
        {/* El día propio no puede ir en acento —el acento es del Centro—, así que se marca
            con el peso del borde y con la fecha en Serif, que aquí no la lleva nadie más. */}
        <span className="w-11 shrink-0 text-right font-[family-name:var(--serif)] text-[13px] text-[var(--mut)]">{cuando(c)}</span>
        <span className="flex-1">
          {hoy && (c.tipo === "cumpleaños" ? "🎂 " : "🎉 ")}
          {felicitacion(c)}
        </span>
      </div>
    );
  }
  // «pareja de Ana» ya lo dice la segunda línea del bloque, que es lo último que suelta al
  // cónyuge: repetirlo gastaba media fila en decir dos veces lo mismo.
  const cola = c.parentesco?.startsWith("pareja de ") ? null : c.parentesco;
  const largo = Math.max(HUECO_MINIMO, LARGOS_FILA.contexto - (cola ? cola.length + 3 : 0));
  return (
    <button
      type="button"
      onClick={() => onPersona(c.id!)}
      className="flex items-start gap-2.5 rounded-[10px] px-1.5 py-1.5 text-left hover:bg-[var(--soft)] active:bg-[var(--soft)]"
    >
      <span className="w-11 shrink-0 pt-px text-right font-[family-name:var(--mono)] text-[11px] tabular-nums text-[var(--mut)]">
        {cuando(c)}
      </span>
      <BloqueIdentidad identidad={identidad(c.id!, largo)} cola={cola} />
      <span className="shrink-0 pt-px text-[11px] whitespace-nowrap text-[var(--mut)]">
        {c.tipo === "cumpleaños" ? `cumple ${c.edad}` : "onomástica"}
      </span>
    </button>
  );
}

const cuando = (c: Celebracion) => (c.faltan === 0 ? "hoy" : c.faltan === 1 ? "mañana" : escribirCorto(c.fecha));

/**
 * El aviso flotante: lo único del panel que se lee sin abrirlo. Anuncia el día propio, que
 * es lo único que no admite enterarse mañana; el resto, cuántos hay.
 */
export function AvisoCelebraciones({
  lista,
  onAbrir,
  apartado,
}: {
  lista: Celebracion[];
  onAbrir: () => void;
  /** Lo que se corre a la izquierda cuando la hoja ocupa su columna de la derecha. */
  apartado: string;
}) {
  const tuDia = lista.find((c) => c.faltan === 0 && esTuDia(c));
  return (
    <button
      type="button"
      onClick={onAbrir}
      style={{ boxShadow: "var(--sh)" }}
      className={`absolute top-3 right-3 flex h-11 max-w-[calc(100vw-1.5rem)] items-center rounded-full bg-[var(--paper)] px-4 text-[13px] font-medium text-[var(--ink)] ${apartado} ${
        tuDia ? "border-[1.5px] border-[var(--ink)]" : "border border-[var(--line)]"
      }`}
    >
      {tuDia ? anuncio(tuDia) : `${lista.length} en ${VENTANA} días`}
    </button>
  );
}
