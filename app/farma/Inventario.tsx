"use client";

import { useMemo, useState } from "react";

// Inventario: el listado de artículos donde María revisa y ajusta el stock mínimo de
// cada uno. La columna Consumo (mensual, de Ventas) es solo lectura; las líneas con
// stock mínimo mayor que el consumo se resaltan —son las que Pedidos resume en su
// línea-enlace—. Por defecto se muestran solo esas (el trabajo real); el buscador
// rastrea todo el universo para corregir un artículo concreto. La edición inline
// escribe en el hash farma:stmin. Estilo neutro (no es la pantalla con skin Unycop).

export interface ArticuloMin {
  codigo: string;
  denominacion: string;
  stMin: number;
  consumoMensual: number;
}

const LIMITE = 100; // tope de filas pintadas: el universo son miles, María afina con el buscador

const sinAcentos = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export default function Inventario({ articulos }: { articulos: ArticuloMin[] }) {
  const [items, setItems] = useState(articulos);
  const [soloAlertas, setSoloAlertas] = useState(true);
  const [q, setQ] = useState("");
  const [editando, setEditando] = useState<string | null>(null); // codigo en edición
  const [draft, setDraft] = useState("");
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [error, setError] = useState("");

  const consulta = sinAcentos(q.trim());
  const totalAlertas = useMemo(
    () => items.filter((a) => a.stMin > a.consumoMensual).length,
    [items],
  );

  // Buscar manda sobre el filtro: si hay consulta, rastrea todo el universo.
  const filtrados = useMemo(() => {
    let xs = items;
    if (consulta) xs = xs.filter((a) => sinAcentos(a.denominacion).includes(consulta));
    else if (soloAlertas) xs = xs.filter((a) => a.stMin > a.consumoMensual);
    return [...xs].sort((a, b) => a.denominacion.localeCompare(b.denominacion, "es"));
  }, [items, consulta, soloAlertas]);

  const visibles = filtrados.slice(0, LIMITE);

  function empezar(codigo: string, stMin: number) {
    setError("");
    setDraft(String(stMin));
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
      <div className="flex flex-wrap items-center gap-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar artículo…"
          className="flex-1 rounded border border-neutral-300 px-3 py-2 outline-none focus:border-neutral-500"
        />
        <label className="flex items-center gap-2 text-sm text-neutral-600">
          <input
            type="checkbox"
            checked={soloAlertas}
            onChange={(e) => setSoloAlertas(e.target.checked)}
            disabled={consulta !== ""}
          />
          Solo stock mínimo &gt; consumo ({totalAlertas})
        </label>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-neutral-300 text-left text-neutral-500">
            <th className="py-2 font-medium">Denominación</th>
            <th className="py-2 text-right font-medium">Stock mínimo</th>
            <th className="py-2 text-right font-medium">Consumo</th>
            <th className="py-2 text-right font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {visibles.map((a) => {
            const enEdicion = editando === a.codigo;
            const trabajando = ocupado === a.codigo;
            const alerta = a.stMin > a.consumoMensual;
            return (
              <tr key={a.codigo} className={`border-b border-neutral-100 ${alerta ? "bg-amber-50" : ""}`}>
                <td className="py-2">{a.denominacion}</td>
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
                    <span className={alerta ? "font-medium text-amber-800" : ""}>{a.stMin}</span>
                  )}
                </td>
                <td className="py-2 text-right tabular-nums text-neutral-600">{a.consumoMensual}</td>
                <td className="py-2 text-right">
                  {enEdicion ? (
                    <span className="flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => guardar(a.codigo)}
                        disabled={trabajando}
                        className="text-neutral-900 hover:underline disabled:opacity-40"
                      >
                        {trabajando ? "Guardando…" : "Guardar"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditando(null)}
                        disabled={trabajando}
                        className="text-neutral-500 hover:underline disabled:opacity-40"
                      >
                        Cancelar
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => empezar(a.codigo, a.stMin)}
                      className="text-neutral-500 hover:underline"
                    >
                      Editar
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
          {consulta ? "Ningún artículo coincide." : "Ningún artículo con stock mínimo mayor que el consumo."}
        </p>
      ) : filtrados.length > LIMITE ? (
        <p className="text-sm text-neutral-400">
          Mostrando {LIMITE} de {filtrados.length}. Busca para afinar.
        </p>
      ) : null}
    </div>
  );
}
