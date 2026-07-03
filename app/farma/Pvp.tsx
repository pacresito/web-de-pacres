"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { LineaPvp } from "@/lib/farma/pvp";
import { DIAMETROS, expandir, type FuenteEtiqueta } from "@/lib/farma/etiquetas";
import type { FuentesEtiqueta } from "@/lib/farma/etiquetas-pdf";
import { TrashIcon, PlusIcon } from "./icons";

// PVP (admin): artículos cuyo precio cambió desde la última comprobación, como
// recordatorio para reetiquetar. María reetiqueta y marca hecho —todas de golpe
// (botón "Limpiar todo") o una línea suelta (papelera)—. Marcar apaga el `pending` en
// farma:pvp; el precio nuevo ya es la línea base del próximo diff. Estilo neutro y
// minimalista.
//
// Además de las líneas reales, María puede añadir líneas manuales (precio libre, texto
// + precio, o una promo fija) para generar etiquetas que no vienen de un cambio de PVP. Tamaño de
// etiqueta, cantidad de copias y estas líneas manuales viven solo en estado local: no
// se guardan en Redis (aviso visible al respecto). "Descargar etiquetas" genera el PDF
// (círculos con el precio, mosaico apretado en A4) en el cliente con pdf-lib; la
// geometría vive en lib/farma/etiquetas.ts y el dibujo en etiquetas-pdf.ts.

const TODAS = "__todas__";
const TAMANOS = [
  { valor: "S" as const, radio: 5, titulo: "Pequeño" },
  { valor: "M" as const, radio: 7, titulo: "Mediano" },
  { valor: "L" as const, radio: 9, titulo: "Grande" },
];
type Tamano = (typeof TAMANOS)[number]["valor"];

// Tipos de línea manual: "precio" (precio libre, la denominación no se imprime),
// "texto-precio" (denominación + precio, ambos impresos) y "promo" (texto fijo).
interface FilaExtra {
  id: string;
  tipo: "precio" | "texto-precio" | "promo";
  denominacion: string;
  precio: number | null; // aplica a "precio" y "texto-precio"
}

// Cómo se imprime cada promo fija (título fino opcional + texto principal en negrita),
// replicando los PDF de María.
const PROMOS: Record<string, { titulo?: string; texto: string }> = {
  "2ª unidad -50%": { titulo: "2ª unidad", texto: "-50%" },
  "3x2": { texto: "3x2" },
};

const euro = (n: number) =>
  n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";

// Input de precio en formato moneda: coma decimal, símbolo € fijo, máximo 999,99 y dos
// decimales. Mientras se escribe conserva el texto en crudo (`texto`); al salir del foco
// lo normaliza a número (redondeado y acotado) y lo muestra siempre con dos decimales.
function PrecioInput({ valor, onChange }: { valor: number | null; onChange: (v: number | null) => void }) {
  const [texto, setTexto] = useState<string | null>(null);
  const formateado = valor != null ? valor.toFixed(2).replace(".", ",") : "";
  return (
    <span className="inline-block" style={{ position: "relative", width: 96 }}>
      <input
        type="text"
        inputMode="decimal"
        placeholder="0,00"
        value={texto ?? formateado}
        onFocus={() => setTexto(formateado)}
        onChange={(e) => {
          const limpio = e.target.value.replace(",", ".").replace(/[^\d.]/g, "");
          const [ent, dec] = limpio.split(".");
          setTexto(ent.slice(0, 3) + (limpio.includes(".") ? "," + (dec ?? "").slice(0, 2) : ""));
        }}
        onBlur={() => {
          const n = texto ? Number(texto.replace(",", ".")) : NaN;
          onChange(isNaN(n) ? null : Math.min(999.99, Math.round(n * 100) / 100));
          setTexto(null);
        }}
        className="fa-input fa-mono text-right"
        style={{ height: 30, width: 96, fontSize: 13, paddingRight: 22 }}
      />
      <span className="fa-t-muted2" style={{ position: "absolute", right: 9, top: 0, lineHeight: "30px", fontSize: 13, pointerEvents: "none" }}>
        €
      </span>
    </span>
  );
}

export default function Pvp({ pendientes }: { pendientes: LineaPvp[] }) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState<string | null>(null); // codigo en curso, o TODAS
  const [error, setError] = useState("");
  const [tamanos, setTamanos] = useState<Record<string, Tamano>>({});
  const [cantidades, setCantidades] = useState<Record<string, number>>({});
  const [extras, setExtras] = useState<FilaExtra[]>([]);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [generando, setGenerando] = useState(false);
  const idsRef = useRef(0);
  const fuentesRef = useRef<FuentesEtiqueta | null>(null);

  const tamanoDe = (id: string) => tamanos[id] ?? "S";
  const cantidadDe = (id: string) => cantidades[id] ?? 1;

  // Cada fila con contenido imprimible (precio real, precio libre con número, o promo)
  // aporta una etiqueta; el precio libre aún sin número no cuenta.
  function fuentesEtiquetas(): FuenteEtiqueta[] {
    const fuentes: FuenteEtiqueta[] = pendientes.map((a) => ({
      diametro: DIAMETROS[tamanoDe(a.codigo)],
      cantidad: cantidadDe(a.codigo),
      precio: a.newPrice,
    }));
    for (const x of extras) {
      const comun = { diametro: DIAMETROS[tamanoDe(x.id)], cantidad: cantidadDe(x.id) };
      if (x.tipo === "promo") {
        const promo = PROMOS[x.denominacion];
        if (promo) fuentes.push({ ...comun, ...promo });
        continue;
      }
      if (x.precio == null) continue;
      fuentes.push({ ...comun, precio: x.precio, ...(x.tipo === "texto-precio" ? { titulo: x.denominacion } : {}) });
    }
    return fuentes;
  }

  async function cargarFuentes(): Promise<FuentesEtiqueta> {
    const cache = fuentesRef.current;
    if (cache) return cache;
    const [bold, regular] = await Promise.all([
      fetch("/fonts/Planer-Bold.ttf").then((r) => r.arrayBuffer()),
      fetch("/fonts/Planer-Regular.ttf").then((r) => r.arrayBuffer()),
    ]);
    const fuentes = { bold, regular };
    fuentesRef.current = fuentes;
    return fuentes;
  }

  async function descargar() {
    setGenerando(true);
    setError("");
    try {
      const etiquetas = expandir(fuentesEtiquetas());
      if (etiquetas.length === 0) return;
      const fuentes = await cargarFuentes();
      const { generarPdfEtiquetas } = await import("@/lib/farma/etiquetas-pdf");
      const bytes = await generarPdfEtiquetas(etiquetas, fuentes);
      // cast: pdf-lib devuelve Uint8Array<ArrayBufferLike>, que TS no acepta como BlobPart.
      const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = "etiquetas.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("No se pudo generar el PDF.");
    } finally {
      setGenerando(false);
    }
  }

  function cambiarCantidad(id: string, delta: number) {
    setCantidades((m) => ({ ...m, [id]: Math.max(1, cantidadDe(id) + delta) }));
  }

  function anadirExtra(tipo: FilaExtra["tipo"], denominacion: string) {
    idsRef.current += 1;
    const fila: FilaExtra = { id: `extra-${idsRef.current}`, tipo, denominacion, precio: null };
    setExtras((xs) => [fila, ...xs]);
    setMenuAbierto(false);
  }

  function actualizarExtra(id: string, patch: Partial<FilaExtra>) {
    setExtras((xs) => xs.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }

  function quitarExtra(id: string) {
    setExtras((xs) => xs.filter((x) => x.id !== id));
  }

  async function marcar(codigo?: string) {
    setOcupado(codigo ?? TODAS);
    setError("");
    try {
      const res = await fetch("/farma/api/pvp/done", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(codigo ? { codigo } : {}),
      });
      if (res.ok) {
        router.refresh();
      } else {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "No se pudo marcar.");
      }
    } catch {
      setError("No se pudo conectar.");
    } finally {
      setOcupado(null);
    }
  }

  if (pendientes.length === 0 && extras.length === 0) {
    return (
      <div className="fa-panel">
        <div className="fa-t-green px-6 py-14 text-center text-sm leading-[1.6]">
          ✓ Todo reetiquetado.
          <br />
          <span className="fa-t-muted2">No hay precios pendientes.</span>
        </div>
      </div>
    );
  }

  function EtiquetaCell({ id, onTrash, titulo, ocupado: fila }: { id: string; onTrash: () => void; titulo: string; ocupado: boolean }) {
    return (
      <span className="inline-flex items-center justify-end gap-1">
        {TAMANOS.map((t) => (
          <button
            key={t.valor}
            type="button"
            title={t.titulo}
            onClick={() => setTamanos((m) => ({ ...m, [id]: t.valor }))}
            style={{
              width: t.radio * 2 + 6,
              height: t.radio * 2 + 6,
              borderRadius: "50%",
              border: "1.5px solid var(--fa-border-strong)",
              background: tamanoDe(id) === t.valor ? "var(--fa-accent)" : "transparent",
              borderColor: tamanoDe(id) === t.valor ? "var(--fa-accent)" : "var(--fa-border-strong)",
              cursor: "pointer",
              flex: "none",
            }}
          />
        ))}
        <button type="button" onClick={onTrash} disabled={fila} title={titulo} className="fa-iconbtn fa-iconbtn-edit ml-1">
          <TrashIcon />
        </button>
      </span>
    );
  }

  function CantidadCell({ id }: { id: string }) {
    return (
      <span className="fa-mono inline-flex items-center justify-end gap-1">
        <button type="button" onClick={() => cambiarCantidad(id, -1)} className="fa-iconbtn fa-iconbtn-edit" style={{ width: 22, height: 22 }}>
          −
        </button>
        <span className="inline-block min-w-[16px] text-center">{cantidadDe(id)}</span>
        <button type="button" onClick={() => cambiarCantidad(id, 1)} className="fa-iconbtn fa-iconbtn-edit" style={{ width: 22, height: 22 }}>
          +
        </button>
      </span>
    );
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <p className="fa-t-ink2 text-sm">
          {pendientes.length > 0 && (
            <>
              <b className="font-semibold" style={{ color: "var(--fa-ink)" }}>{pendientes.length}</b>{" "}
              {pendientes.length === 1 ? "precio cambiado pendiente" : "precios cambiados pendientes"} de reetiquetar
            </>
          )}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={descargar}
            disabled={generando || fuentesEtiquetas().length === 0}
            className="fa-btn fa-btn-outline px-[15px] py-[9px]"
          >
            {generando ? "Generando…" : "Descargar etiquetas"}
          </button>
          {pendientes.length > 0 && (
            <button type="button" onClick={() => marcar()} disabled={ocupado !== null} className="fa-btn fa-btn-primary px-[15px] py-[9px]">
              {ocupado === TODAS ? "Guardando…" : "Limpiar todo"}
            </button>
          )}
        </div>
      </div>

      <p className="fa-t-muted2 mb-3 text-[12px]">El tamaño de etiqueta, la cantidad y las líneas añadidas no se guardan al recargar la página.</p>

      <div className="relative mb-3.5 inline-block">
        <button type="button" onClick={() => setMenuAbierto((v) => !v)} className="fa-btn fa-btn-outline inline-flex items-center gap-1.5 px-[13px] py-[7px] text-[13px]">
          <PlusIcon /> Añadir línea
        </button>
        {menuAbierto && (
          <div className="fa-panel absolute left-0 top-[calc(100%+4px)] z-10 min-w-[180px] py-1">
            <button type="button" onClick={() => anadirExtra("precio", "")} className="fa-nav-item block w-full text-left">
              Precio libre
            </button>
            <button type="button" onClick={() => anadirExtra("texto-precio", "")} className="fa-nav-item block w-full text-left">
              Texto + precio
            </button>
            <button type="button" onClick={() => anadirExtra("promo", "2ª unidad -50%")} className="fa-nav-item block w-full text-left">
              2ª unidad -50%
            </button>
            <button type="button" onClick={() => anadirExtra("promo", "3x2")} className="fa-nav-item block w-full text-left">
              3x2
            </button>
          </div>
        )}
      </div>

      {error && <p className="fa-t-red mb-2 text-[13px]">{error}</p>}

      <div className="fa-panel overflow-x-auto">
        <table className="fa-table" style={{ minWidth: 820 }}>
          <thead>
            <tr>
              <th className="fa-th">Código</th>
              <th className="fa-th">Denominación</th>
              <th className="fa-th">Fecha</th>
              <th className="fa-th fa-th-r">PVP antiguo</th>
              <th className="fa-th fa-th-r">Variación</th>
              <th className="fa-th fa-th-r">PVP nuevo</th>
              <th className="fa-th fa-th-r">Etiqueta</th>
              <th className="fa-th fa-th-r">Uds.</th>
            </tr>
          </thead>
          <tbody>
            {extras.map((x) => (
              <tr key={x.id} className="fa-row" style={{ background: "var(--fa-accent-bg)" }}>
                <td className="fa-td fa-t-muted2">—</td>
                <td className="fa-td">
                  {x.tipo !== "promo" ? (
                    <input
                      type="text"
                      maxLength={30}
                      placeholder={x.tipo === "texto-precio" ? "Texto de la etiqueta" : "Texto libre (opcional)"}
                      value={x.denominacion}
                      onChange={(e) => actualizarExtra(x.id, { denominacion: e.target.value })}
                      className="fa-input"
                      style={{ height: 30, fontSize: 13 }}
                    />
                  ) : (
                    x.denominacion
                  )}
                </td>
                <td className="fa-td fa-t-muted2">-</td>
                <td className="fa-td fa-th-r fa-t-muted2">-</td>
                <td className="fa-td fa-th-r fa-t-muted2">-</td>
                <td className="fa-td fa-th-r">
                  {x.tipo !== "promo" ? (
                    <PrecioInput valor={x.precio} onChange={(precio) => actualizarExtra(x.id, { precio })} />
                  ) : (
                    <span className="fa-t-muted2">-</span>
                  )}
                </td>
                <td className="fa-td fa-th-r">
                  <EtiquetaCell id={x.id} onTrash={() => quitarExtra(x.id)} titulo="Quitar línea" ocupado={false} />
                </td>
                <td className="fa-td fa-th-r">
                  <CantidadCell id={x.id} />
                </td>
              </tr>
            ))}
            {pendientes.map((a) => {
              const delta = a.newPrice - a.oldPrice;
              const sube = delta >= 0;
              const trabajando = ocupado !== null;
              return (
                <tr key={a.codigo} className="fa-row">
                  <td className="fa-td fa-mono fa-t-ink3 whitespace-nowrap">{a.codigo}</td>
                  <td className="fa-td">{a.denominacion}</td>
                  <td className="fa-td fa-mono fa-t-ink3 whitespace-nowrap">{a.firstSeen}</td>
                  <td className="fa-td fa-mono fa-th-r fa-t-muted2 line-through">{euro(a.oldPrice)}</td>
                  <td className={`fa-td fa-mono fa-th-r whitespace-nowrap ${sube ? "fa-t-green" : "fa-t-red"}`}>
                    {sube ? "+" : "−"}
                    {euro(Math.abs(delta))}
                  </td>
                  <td className="fa-td fa-mono fa-th-r whitespace-nowrap font-semibold" style={{ color: "var(--fa-ink)" }}>
                    {euro(a.newPrice)}
                  </td>
                  <td className="fa-td fa-th-r">
                    <EtiquetaCell id={a.codigo} onTrash={() => marcar(a.codigo)} titulo="Reetiquetado" ocupado={trabajando} />
                  </td>
                  <td className="fa-td fa-th-r">
                    <CantidadCell id={a.codigo} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
