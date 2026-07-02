"use client";

import { useMemo, useState } from "react";
import SearchBox from "./SearchBox";
import { PencilIcon, CheckIcon, XIcon } from "./icons";

// Inventario: catálogo completo de artículos con los datos usados para calcular pedidos.
// Highlight = existencias bajo objetivo (max(stMín, consumo)). Tres filtros opcionales:
// "Stock mínimo > consumo", "Reponer" y "Sin historial" (en stock pero fuera de Ventas:
// consumo desconocido, "?"). "Sin historial" es excluyente con los otros dos; marcarlo
// desmarca cualquier otro filtro y viceversa. La búsqueda (por denominación o código) se
// combina con los filtros; sin ningún filtro rastrea todo el universo (incluido sin
// historial). El stMín sin definir se muestra "—". La edición inline escribe en farma:stmin.

export interface ArticuloMin {
  codigo: string;
  denominacion: string;
  stMin: number | null; // null = sin mínimo definido (solo en artículos sin historial)
  consumoMensual: number;
  existencias: number;
  sinHistorial?: boolean;
}

const LIMITE = 100; // tope de filas pintadas: el universo son miles, María afina con el buscador

const sinAcentos = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export default function Inventario({ articulos }: { articulos: ArticuloMin[] }) {
  const [items, setItems] = useState(articulos);
  const [soloStMinAlto, setSoloStMinAlto] = useState(false);
  const [soloBajoObjetivo, setSoloBajoObjetivo] = useState(false);
  const [soloSinHistorial, setSoloSinHistorial] = useState(false);
  const [q, setQ] = useState("");
  const [editando, setEditando] = useState<string | null>(null); // codigo en edición
  const [draft, setDraft] = useState("");
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [error, setError] = useState("");

  const consulta = sinAcentos(q.trim());

  const totalStMinAlto = useMemo(
    () => items.filter((a) => !a.sinHistorial && (a.stMin ?? 0) > a.consumoMensual).length,
    [items],
  );
  const totalBajoObjetivo = useMemo(
    () => items.filter((a) => !a.sinHistorial && a.existencias < Math.max(a.stMin ?? 0, a.consumoMensual)).length,
    [items],
  );
  const totalSinHistorial = useMemo(
    () => items.filter((a) => a.sinHistorial).length,
    [items],
  );

  // Los filtros acotan el universo; la búsqueda (denominación o código) se aplica encima.
  // Sin ningún filtro, la búsqueda rastrea todo el universo (incluido sin historial).
  const filtrados = useMemo(() => {
    let xs = items;
    if (soloSinHistorial) {
      xs = xs.filter((a) => a.sinHistorial);
    } else if (soloStMinAlto || soloBajoObjetivo) {
      xs = xs.filter((a) => !a.sinHistorial);
      if (soloStMinAlto) xs = xs.filter((a) => (a.stMin ?? 0) > a.consumoMensual);
      if (soloBajoObjetivo) xs = xs.filter((a) => a.existencias < Math.max(a.stMin ?? 0, a.consumoMensual));
    }
    if (consulta) {
      xs = xs.filter((a) => sinAcentos(a.denominacion).includes(consulta) || a.codigo.includes(consulta));
    }
    return [...xs].sort((a, b) => a.denominacion.localeCompare(b.denominacion, "es"));
  }, [items, consulta, soloStMinAlto, soloBajoObjetivo, soloSinHistorial]);

  const visibles = filtrados.slice(0, LIMITE);

  function empezar(codigo: string, stMin: number | null) {
    setError("");
    setDraft(stMin === null ? "" : String(stMin));
    setEditando(codigo);
  }

  async function guardar(codigo: string) {
    const valor = Number(draft);
    if (draft.trim() === "" || !Number.isInteger(valor) || valor < 0) {
      setError("Stock mínimo entero ≥ 0.");
      return;
    }
    setOcupado(codigo);
    setError("");
    try {
      const res = await fetch("/farma/api/stmin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo, valor }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "Error al guardar");
        return;
      }
      setItems((xs) => xs.map((a) => (a.codigo === codigo ? { ...a, stMin: valor } : a)));
      setEditando(null);
    } catch {
      setError("No se pudo conectar.");
    } finally {
      setOcupado(null);
    }
  }

  return (
    <div className="fa-panel">
      <div className="flex flex-col gap-3 border-b p-4" style={{ borderColor: "var(--fa-border)" }}>
        <SearchBox value={q} onChange={setQ} placeholder="Buscar por denominación o código…" />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              const v = !soloStMinAlto;
              setSoloStMinAlto(v);
              if (v) setSoloSinHistorial(false);
            }}
            className={`fa-chip ${soloStMinAlto ? "fa-chip-on" : ""}`}
          >
            <span className="fa-chip-box"><CheckIcon /></span>
            Stock mínimo &gt; consumo <span className="fa-chip-count">({totalStMinAlto})</span>
          </button>
          <button
            type="button"
            onClick={() => {
              const v = !soloBajoObjetivo;
              setSoloBajoObjetivo(v);
              if (v) setSoloSinHistorial(false);
            }}
            className={`fa-chip ${soloBajoObjetivo ? "fa-chip-on" : ""}`}
          >
            <span className="fa-chip-box"><CheckIcon /></span>
            Reponer <span className="fa-chip-count">({totalBajoObjetivo})</span>
          </button>
          <button
            type="button"
            onClick={() => {
              const v = !soloSinHistorial;
              setSoloSinHistorial(v);
              if (v) { setSoloStMinAlto(false); setSoloBajoObjetivo(false); }
            }}
            className={`fa-chip ${soloSinHistorial ? "fa-chip-on" : ""}`}
          >
            <span className="fa-chip-box"><CheckIcon /></span>
            Sin historial <span className="fa-chip-count">({totalSinHistorial})</span>
          </button>
        </div>
        {error && <p className="fa-t-red text-[13px]">{error}</p>}
      </div>

      <div className="overflow-x-auto">
        <table className="fa-table" style={{ minWidth: 720 }}>
          <thead>
            <tr>
              <th className="fa-th">Código</th>
              <th className="fa-th">Denominación</th>
              <th className="fa-th fa-th-r">Existencias</th>
              <th className="fa-th fa-th-r">Consumo</th>
              <th className="fa-th fa-th-r">Stock mínimo</th>
              <th className="fa-th" style={{ width: 48 }}></th>
            </tr>
          </thead>
          <tbody>
            {visibles.map((a) => {
              const enEdicion = editando === a.codigo;
              const trabajando = ocupado === a.codigo;
              const bajoObjetivo = a.existencias < Math.max(a.stMin ?? 0, a.consumoMensual);
              const stMinAlto = !a.sinHistorial && (a.stMin ?? 0) > a.consumoMensual;
              return (
                <tr key={a.codigo} className={`fa-row ${bajoObjetivo ? "fa-row-low" : ""}`}>
                  <td className="fa-td fa-mono fa-t-ink3 whitespace-nowrap text-[13px]">{a.codigo}</td>
                  <td className="fa-td" style={{ color: "var(--fa-ink)" }}>{a.denominacion}</td>
                  <td className={`fa-td fa-mono fa-th-r ${bajoObjetivo ? "fa-t-amber font-semibold" : "fa-t-ink3"}`}>{a.existencias}</td>
                  <td className={`fa-td fa-mono fa-th-r ${a.sinHistorial ? "fa-t-muted" : "fa-t-ink3"}`}>{a.sinHistorial ? "?" : a.consumoMensual}</td>
                  <td className="fa-td fa-th-r">
                    {enEdicion ? (
                      <span className="inline-flex items-center justify-end gap-1">
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") guardar(a.codigo);
                            else if (e.key === "Escape") setEditando(null);
                          }}
                          autoFocus
                          className="fa-edit-input fa-mono"
                        />
                        <button type="button" onClick={() => guardar(a.codigo)} disabled={trabajando} className="fa-iconbtn fa-iconbtn-accept">
                          {trabajando ? "…" : <CheckIcon />}
                        </button>
                        <button type="button" onClick={() => setEditando(null)} disabled={trabajando} className="fa-iconbtn fa-iconbtn-cancel">
                          <XIcon />
                        </button>
                      </span>
                    ) : (
                      <span className={`fa-mono ${stMinAlto ? "fa-t-amber font-semibold" : ""}`} style={stMinAlto ? undefined : { color: "var(--fa-ink)" }}>
                        {a.stMin === null ? "—" : a.stMin}
                      </span>
                    )}
                  </td>
                  <td className="fa-td fa-th-r">
                    {!enEdicion && (
                      <button type="button" onClick={() => empezar(a.codigo, a.stMin)} className="fa-iconbtn fa-iconbtn-edit" title="Editar">
                        <PencilIcon />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {visibles.length === 0 && (
        <div className="fa-t-muted2 p-11 text-center text-sm">
          {consulta ? "Sin resultados. Prueba otra búsqueda o cambia los filtros." : "Sin artículos en inventario."}
        </div>
      )}
      <div className="fa-t-muted border-t p-3.5 text-[13px]" style={{ borderColor: "var(--fa-rule)", background: "var(--fa-inset)" }}>
        Mostrando {visibles.length} de {items.length.toLocaleString("es-ES")}. Busca para afinar.
      </div>
    </div>
  );
}
