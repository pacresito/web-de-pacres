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
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <SearchBox
          value={q}
          onChange={setQ}
          placeholder="Buscar por denominación o código…"
        />
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-neutral-600">
            <input
              type="checkbox"
              checked={soloStMinAlto}
              onChange={(e) => {
                setSoloStMinAlto(e.target.checked);
                if (e.target.checked) setSoloSinHistorial(false);
              }}
            />
            Stock mínimo &gt; consumo ({totalStMinAlto})
          </label>
          <label className="flex items-center gap-2 text-sm text-neutral-600">
            <input
              type="checkbox"
              checked={soloBajoObjetivo}
              onChange={(e) => {
                setSoloBajoObjetivo(e.target.checked);
                if (e.target.checked) setSoloSinHistorial(false);
              }}
            />
            Reponer ({totalBajoObjetivo})
          </label>
          <label className="flex items-center gap-2 text-sm text-neutral-600">
            <input
              type="checkbox"
              checked={soloSinHistorial}
              onChange={(e) => {
                setSoloSinHistorial(e.target.checked);
                if (e.target.checked) { setSoloStMinAlto(false); setSoloBajoObjetivo(false); }
              }}
            />
            Sin historial ({totalSinHistorial})
          </label>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <table className="w-full table-fixed border-collapse text-sm">
        <thead>
          <tr className="border-b border-neutral-300 text-left text-neutral-500">
            <th className="py-2 font-medium w-20">Código</th>
            <th className="py-2 font-medium">Denominación</th>
            <th className="py-2 text-right font-medium w-24">Existencias</th>
            <th className="py-2 text-right font-medium w-24">Consumo</th>
            <th className="py-2 text-right font-medium w-28">Stock mínimo</th>
            <th className="py-2 pl-6 w-14"></th>
          </tr>
        </thead>
        <tbody>
          {visibles.map((a) => {
            const enEdicion = editando === a.codigo;
            const trabajando = ocupado === a.codigo;
            const bajoObjetivo = a.existencias < Math.max(a.stMin ?? 0, a.consumoMensual);
            return (
              <tr key={a.codigo} className={`border-b border-neutral-100 ${bajoObjetivo ? "bg-amber-50" : ""}`}>
                <td className="py-2 tabular-nums text-neutral-400 text-xs">{a.codigo}</td>
                <td className="py-2">{a.denominacion}</td>
                <td className={`py-2 text-right tabular-nums ${bajoObjetivo ? "font-medium text-amber-800" : "text-neutral-600"}`}>
                  {a.existencias}
                </td>
                <td className={`py-2 text-right tabular-nums ${a.sinHistorial ? "font-medium text-amber-800" : "text-neutral-600"}`}>{a.sinHistorial ? "?" : a.consumoMensual}</td>
                <td className="py-2 text-right tabular-nums">
                  {enEdicion ? (
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
                      className="w-20 rounded border border-neutral-300 px-2 py-1 text-right outline-none focus:border-neutral-500"
                    />
                  ) : (
                    <span className={!a.sinHistorial && (a.stMin ?? 0) > a.consumoMensual ? "font-medium text-amber-800" : "text-neutral-600"}>{a.stMin === null ? "—" : a.stMin}</span>
                  )}
                </td>
                <td className="py-2 pl-6 w-14 text-right">
                  {enEdicion ? (
                    <span className="flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => guardar(a.codigo)}
                        disabled={trabajando}
                        className="text-green-600 hover:text-green-800 disabled:opacity-40"
                      >
                        {trabajando ? "…" : <CheckIcon />}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditando(null)}
                        disabled={trabajando}
                        className="text-neutral-400 hover:text-neutral-600 disabled:opacity-40"
                      >
                        <XIcon />
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => empezar(a.codigo, a.stMin)}
                      className="text-neutral-300 hover:text-neutral-600 transition-colors"
                    >
                      <PencilIcon />
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {visibles.length === 0 ? (
        <p className="text-sm text-neutral-400">
          {consulta ? "Ningún artículo coincide." : "Sin artículos en inventario."}
        </p>
      ) : filtrados.length > LIMITE ? (
        <p className="text-sm text-neutral-400">
          Mostrando {LIMITE} de {filtrados.length}. Busca para afinar.
        </p>
      ) : null}
    </div>
  );
}
