"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { fraseHoja, resumenEtiquetas, type BorradorEtiquetas, type FilaExtra, type LineaPvp, type Tamano } from "@/lib/farma/pvp";
import { DIAMETROS, empaquetar, expandir, type FuenteEtiqueta } from "@/lib/farma/etiquetas";
import type { DatosLinea } from "@/lib/farma/resumen";
import type { FuentesEtiqueta } from "@/lib/farma/etiquetas-pdf";
import { contarMetrica } from "./contarMetrica";
import { TrashIcon, PlusIcon } from "./icons";

// PVP (admin): artículos cuyo precio cambió desde la última comprobación, como
// recordatorio para reetiquetar. María reetiqueta y marca hecho —todas de golpe
// (botón "Limpiar todo") o una línea suelta (papelera)—. Marcar apaga el `pending` en
// farma:pvp; el precio nuevo ya es la línea base del próximo diff. Estilo neutro y
// minimalista.
//
// Además de las líneas reales, María puede añadir líneas manuales (precio libre, texto
// + precio, o una promo fija) para generar etiquetas que no vienen de un cambio de PVP.
// El tamaño de etiqueta, la cantidad de copias y estas líneas manuales se persisten en
// Redis (blob farma:pvp-etiquetas) por autosave, así que sobreviven a las recargas; la
// carga inicial llega como prop `borrador` desde el server component. El botón de
// descarga genera en el cliente con pdf-lib dos PDF de un solo clic: las pegatinas
// (círculos con el precio, mosaico apretado en A4) y el resumen en papel normal que dice
// a qué producto va cada círculo. La geometría vive en lib/farma/etiquetas.ts, el dibujo
// en etiquetas-pdf.ts y el resumen en resumen.ts / resumen-pdf.ts.

const TODAS = "__todas__";
// El radio del botón es una escala comprimida (ordena los tamaños de un vistazo sin que
// el selector ocupe media fila), no el diámetro real.
const TAMANOS: { valor: Tamano; radio: number; titulo: string }[] = [
  { valor: "S", radio: 5, titulo: "Pequeño" },
  { valor: "M", radio: 7, titulo: "Mediano" },
  { valor: "L", radio: 9, titulo: "Grande" },
  { valor: "XL", radio: 11, titulo: "Extra grande" },
];

// Cómo se imprime cada promo fija (título fino opcional + texto principal en negrita),
// replicando los PDF de María.
const PROMOS: Record<string, { titulo?: string; texto: string }> = {
  "2ª unidad -50%": { titulo: "2ª unidad", texto: "-50%" },
  "3x2": { texto: "3x2" },
};

// Número destacado de las líneas de recuento (mismo tratamiento que el panel de María).
const Fuerte = ({ n }: { n: number }) => (
  <b className="font-semibold" style={{ color: "var(--fa-ink)" }}>{n}</b>
);

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

export default function Pvp({ pendientes, borrador }: { pendientes: LineaPvp[]; borrador: BorradorEtiquetas }) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState<string | null>(null); // codigo en curso, o TODAS
  const [error, setError] = useState("");
  const [tamanos, setTamanos] = useState<Record<string, Tamano>>(borrador.tamanos);
  const [cantidades, setCantidades] = useState<Record<string, number>>(borrador.cantidades);
  const [extras, setExtras] = useState<FilaExtra[]>(borrador.extras);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [generando, setGenerando] = useState(false);
  // Continúa la numeración de ids tras las líneas manuales ya guardadas, para no chocar.
  const idsRef = useRef(borrador.extras.reduce((m, x) => Math.max(m, Number(x.id.replace("extra-", "")) || 0), 0));
  const fuentesRef = useRef<FuentesEtiqueta | null>(null);

  const tamanoDe = (id: string) => tamanos[id] ?? "S";
  const cantidadDe = (id: string) => cantidades[id] ?? 1;
  // Recuento en vivo (líneas manuales, copias y hoja que llenan) sobre el estado actual:
  // el borrador de Redis va con retraso por el autosave, el estado no.
  const resumen = resumenEtiquetas(pendientes, { tamanos, cantidades, extras });

  // Autosave (debounce) del borrador de etiquetado en Redis: sobrevive a las recargas.
  // Se saltan el primer render (el estado ya viene del prop) y se podan tamaños/cantidades
  // de líneas que ya no existen (pendiente limpiado o extra borrado) para no acumular.
  const primeraRef = useRef(true);
  useEffect(() => {
    if (primeraRef.current) {
      primeraRef.current = false;
      return;
    }
    const vivos = new Set<string>([...pendientes.map((p) => p.codigo), ...extras.map((x) => x.id)]);
    const soloVivos = <T,>(m: Record<string, T>) =>
      Object.fromEntries(Object.entries(m).filter(([k]) => vivos.has(k)));
    const t = setTimeout(() => {
      fetch("/farma/api/pvp/etiquetas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tamanos: soloVivos(tamanos), cantidades: soloVivos(cantidades), extras }),
      }).catch(() => {});
    }, 600);
    return () => clearTimeout(t);
  }, [tamanos, cantidades, extras, pendientes]);

  // Cada fila con contenido imprimible (precio real, precio libre con número, o promo)
  // aporta una etiqueta; el precio libre aún sin número no cuenta. Cada fuente lleva su
  // `ref` (código del pendiente o id de la línea manual) y `datos` guarda lo que el
  // círculo no puede decir —qué producto es y de qué precio viene— para el resumen.
  function lineasEtiquetas(): { fuentes: FuenteEtiqueta[]; datos: Record<string, DatosLinea> } {
    const fuentes: FuenteEtiqueta[] = [];
    const datos: Record<string, DatosLinea> = {};

    for (const a of pendientes) {
      fuentes.push({ ref: a.codigo, diametro: DIAMETROS[tamanoDe(a.codigo)], cantidad: cantidadDe(a.codigo), precio: a.newPrice });
      datos[a.codigo] = { producto: a.denominacion, tamano: tamanoDe(a.codigo), precio: a.newPrice, antes: a.oldPrice };
    }

    for (const x of extras) {
      const comun = { ref: x.id, diametro: DIAMETROS[tamanoDe(x.id)], cantidad: cantidadDe(x.id) };
      const tamano = tamanoDe(x.id);
      if (x.tipo === "promo") {
        const promo = PROMOS[x.denominacion];
        if (!promo) continue;
        fuentes.push({ ...comun, ...promo });
        datos[x.id] = {
          producto: promo.titulo ? `Promoción · ${promo.titulo}` : "Promoción",
          tamano,
          precio: null,
          texto: promo.texto,
          antes: null,
        };
        continue;
      }
      if (x.precio == null) continue; // mismo criterio que `extraImprimible`, con el tipo estrechado
      fuentes.push({ ...comun, precio: x.precio, ...(x.tipo === "texto-precio" ? { titulo: x.denominacion } : {}) });
      datos[x.id] = { producto: x.denominacion || "Línea sin nombre", tamano, precio: x.precio, antes: null };
    }

    return { fuentes, datos };
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

  // cast: pdf-lib devuelve Uint8Array<ArrayBufferLike>, que TS no acepta como BlobPart.
  function descargarPdf(bytes: Uint8Array, nombre: string) {
    const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/pdf" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = nombre;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Los dos PDF de un clic: las pegatinas y el resumen que las describe. Se empaqueta una
  // sola vez y las dos salidas hablan de las mismas hojas. La segunda descarga va con un
  // respiro: encadenadas sin pausa, algunos navegadores se comen la segunda (y Chrome pide
  // permiso la primera vez para bajar varios archivos de una web).
  async function descargar() {
    setGenerando(true);
    setError("");
    try {
      const { fuentes: lineas, datos } = lineasEtiquetas();
      const etiquetas = expandir(lineas);
      if (etiquetas.length === 0) return;
      const hojas = empaquetar(etiquetas);
      const fuentes = await cargarFuentes();
      const [{ generarPdfEtiquetas }, { generarPdfResumen }, { filasPorHoja }] = await Promise.all([
        import("@/lib/farma/etiquetas-pdf"),
        import("@/lib/farma/resumen-pdf"),
        import("@/lib/farma/resumen"),
      ]);
      const ahora = new Date();
      const fecha = ahora.toLocaleDateString("sv-SE"); // AAAA-MM-DD
      const cuenta = `(${etiquetas.length})`;

      descargarPdf(await generarPdfEtiquetas(hojas, fuentes), `${fecha} Etiquetas ${cuenta}.pdf`);
      const resumenPdf = await generarPdfResumen(filasPorHoja(hojas, datos), fuentes, ahora.toLocaleDateString("es-ES"));
      setTimeout(() => descargarPdf(resumenPdf, `${fecha} Etiquetas resumen ${cuenta}.pdf`), 400);
      contarMetrica("pvp:etiquetas");
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
      <span className="inline-flex items-center gap-1">
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
      <span className="fa-mono inline-flex items-center gap-1">
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
      <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
        <div className="fa-t-ink2 flex flex-col gap-[3px] text-sm">
          {pendientes.length > 0 && (
            <p>
              <Fuerte n={pendientes.length} />{" "}
              {pendientes.length === 1 ? "precio cambiado pendiente" : "precios cambiados pendientes"} de reetiquetar
            </p>
          )}
          {resumen.personalizadas > 0 && (
            <p>
              <Fuerte n={resumen.personalizadas} />{" "}
              {resumen.personalizadas === 1 ? "etiqueta personalizada" : "etiquetas personalizadas"}
            </p>
          )}
          {resumen.unidades > 0 && (
            <p>
              <Fuerte n={resumen.unidades} />{" "}
              {resumen.unidades === 1 ? "etiqueta para imprimir" : "etiquetas para imprimir"}, {fraseHoja(resumen.hojas)}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={descargar}
            disabled={generando || lineasEtiquetas().fuentes.length === 0}
            className="fa-btn fa-btn-outline px-[15px] py-[9px]"
          >
            {generando ? "Generando…" : "Descargar etiquetas y resumen"}
          </button>
          {pendientes.length > 0 && (
            <button type="button" onClick={() => marcar()} disabled={ocupado !== null} className="fa-btn fa-btn-primary px-[15px] py-[9px]">
              {ocupado === TODAS ? "Guardando…" : "Limpiar todo"}
            </button>
          )}
        </div>
      </div>

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
              <th className="fa-th">PVP antiguo</th>
              <th className="fa-th">Variación</th>
              <th className="fa-th fa-th-r">PVP nuevo</th>
              <th className="fa-th">Etiqueta</th>
              <th className="fa-th">Uds.</th>
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
                <td className="fa-td fa-t-muted2">-</td>
                <td className="fa-td fa-t-muted2">-</td>
                <td className="fa-td fa-th-r">
                  {x.tipo !== "promo" ? (
                    <PrecioInput valor={x.precio} onChange={(precio) => actualizarExtra(x.id, { precio })} />
                  ) : (
                    <span className="fa-t-muted2">-</span>
                  )}
                </td>
                <td className="fa-td">
                  <EtiquetaCell id={x.id} onTrash={() => quitarExtra(x.id)} titulo="Quitar línea" ocupado={false} />
                </td>
                <td className="fa-td">
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
                  <td className="fa-td fa-mono fa-t-muted2 line-through">{euro(a.oldPrice)}</td>
                  <td className={`fa-td fa-mono whitespace-nowrap ${sube ? "fa-t-green" : "fa-t-red"}`}>
                    {sube ? "+" : "−"}
                    {euro(Math.abs(delta))}
                  </td>
                  <td className="fa-td fa-mono fa-th-r whitespace-nowrap font-semibold" style={{ color: "var(--fa-ink)" }}>
                    {euro(a.newPrice)}
                  </td>
                  <td className="fa-td">
                    <EtiquetaCell id={a.codigo} onTrash={() => marcar(a.codigo)} titulo="Reetiquetado" ocupado={trabajando} />
                  </td>
                  <td className="fa-td">
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
