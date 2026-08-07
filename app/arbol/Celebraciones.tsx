"use client";

// El panel de lo que se celebra: los cumpleaños y las onomásticas de los próximos treinta
// días, de la familia cercana que vive y desde el punto de vista puesto. Solo pinta: quién
// sale, cuándo y cómo se le llama lo decide lib/arbol/celebraciones.

import { escribirCorto } from "@/lib/arbol/fechas";
import { anuncio, esFelicitacion, esTuDia, felicitacion, VENTANA, type Celebracion } from "@/lib/arbol/celebraciones";

export default function Celebraciones({
  lista,
  abierto,
  setAbierto,
}: {
  lista: Celebracion[];
  abierto: boolean;
  setAbierto: (v: boolean) => void;
}) {
  // Lo propio del día manda sobre todo lo demás: es lo único que se anuncia desde el botón
  // cerrado, porque es lo único que no admite enterarse mañana.
  const tuDia = lista.find((c) => c.faltan === 0 && esTuDia(c));
  return (
    <div className="absolute top-3 right-3 flex w-[min(17rem,calc(100vw-1.5rem))] flex-col items-end gap-2">
      <button
        type="button"
        onClick={() => setAbierto(!abierto)}
        className={`flex h-11 items-center gap-2 rounded-full border px-4 text-[13px] font-medium shadow-lg ${
          tuDia ? "border-[#00b87a] bg-[#00b87a] text-white" : "border-neutral-200 bg-white text-neutral-700"
        }`}
      >
        {tuDia ? anuncio(tuDia) : `${lista.length} en ${VENTANA} días`}
        <span className={`text-[10px] ${tuDia ? "text-[#a9e6cd]" : "text-neutral-400"} ${abierto ? "" : "rotate-180"}`}>▲</span>
      </button>
      {abierto && (
        <div className="flex max-h-[min(26rem,calc(100vh-11rem))] w-full flex-col gap-0.5 overflow-y-auto rounded-xl border border-neutral-200 bg-white p-2 shadow-lg">
          {lista.length === 0 ? (
            <p className="px-1.5 py-1 text-[12px] text-neutral-500">
              Nadie celebra nada en {VENTANA} días. Aprovecha la calma.
            </p>
          ) : (
            lista.map((c) => <Fila key={`${c.tipo}:${c.id ?? ""}`} celebracion={c} />)
          )}
        </div>
      )}
    </div>
  );
}

/**
 * La fila normal dice cuándo, quién es y qué celebra. Lo del propio punto de vista y los
 * dos días que son de todos no: eso va dirigido a quien mira, y se lleva la banda y la
 * frase en lugar de una casilla en la lista.
 */
function Fila({ celebracion: c }: { celebracion: Celebracion }) {
  if (esFelicitacion(c)) {
    const hoy = c.faltan === 0;
    return (
      <p
        className={`rounded-lg px-2.5 py-2 text-[12px] ${
          hoy ? "bg-[#00b87a] font-medium text-white" : "bg-[#e4f4ed] text-neutral-800"
        }`}
      >
        {hoy && (c.tipo === "cumpleaños" ? "🎂 " : "🎉 ")}
        {felicitacion(c)}
      </p>
    );
  }
  return (
    <div className="flex items-baseline gap-2.5 px-1.5 py-1">
      <span className="w-11 shrink-0 text-right text-[11px] tabular-nums text-neutral-400">{cuando(c)}</span>
      {/* Sin recortar: «pareja de Montse» acaba en puntos suspensivos y el nombre que
          explica quién es esa persona es justo el que se cae. */}
      <span className="min-w-0 flex-1 text-[12px] text-neutral-900">
        {c.nombre}
        {c.parentesco && <span className="text-neutral-400"> · {c.parentesco}</span>}
      </span>
      <span className="shrink-0 text-[11px] whitespace-nowrap text-neutral-500">
        {c.tipo === "cumpleaños" ? `cumple ${c.edad}` : "santo"}
      </span>
    </div>
  );
}

const cuando = (c: Celebracion) => (c.faltan === 0 ? "hoy" : c.faltan === 1 ? "mañana" : escribirCorto(c.fecha));
