"use client";

import { useState } from "react";
import Buscador from "./Buscador";
import { rankear, type LabDescuento } from "@/lib/farma/prioridades";

// Descuentos: la tabla de Prioridades en modo edición. María busca un principio
// activo y corrige el descuento de cada lab. El número de un descuento `inferido`
// (lo decidimos nosotros, no dato firme suyo) se pinta sutil; puede darlo por bueno
// (Comprobar) o cambiarlo (Editar) — ambos apagan el flag. Mismo dato y orden que
// Prioridades (reusa Buscador y rankear); la escritura va al blob farma:descuentos.
export default function Descuentos({ data: inicial }: { data: Record<string, LabDescuento[]> }) {
  const [data, setData] = useState(inicial);
  const [principio, setPrincipio] = useState<string | null>(null);
  const [editando, setEditando] = useState<string | null>(null); // lab en edición
  const [draft, setDraft] = useState("");
  const [ocupado, setOcupado] = useState<string | null>(null); // lab guardando
  const [error, setError] = useState("");

  const principios = Object.keys(data);
  const filas = principio ? rankear(principio, data[principio]) : [];

  function patchLocal(lab: string, cambio: Partial<LabDescuento>) {
    setData((d) => ({
      ...d,
      [principio!]: d[principio!].map((l) => (l.lab === lab ? { ...l, ...cambio } : l)),
    }));
  }

  async function post(url: string, body: object): Promise<boolean> {
    setError("");
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "Error al guardar");
        return false;
      }
      return true;
    } catch {
      setError("No se pudo conectar.");
      return false;
    }
  }

  async function guardar(lab: string) {
    const valor = Number(draft);
    if (draft.trim() === "" || !Number.isFinite(valor) || valor < 0 || valor > 100) {
      setError("Descuento entre 0 y 100.");
      return;
    }
    setOcupado(lab);
    const ok = await post("/farma/api/descuento", { principio, lab, valor });
    setOcupado(null);
    if (ok) {
      patchLocal(lab, { descuento: valor, inferido: false });
      setEditando(null);
    }
  }

  async function comprobar(lab: string) {
    setOcupado(lab);
    const ok = await post("/farma/api/descuento/check", { principio, lab });
    setOcupado(null);
    if (ok) patchLocal(lab, { inferido: false });
  }

  function empezar(lab: string, descuento: number | null) {
    setError("");
    setDraft(descuento === null ? "" : String(descuento));
    setEditando(lab);
  }

  return (
    <div className="flex flex-col gap-5">
      <Buscador
        items={principios}
        onSelect={(p) => {
          setPrincipio(p);
          setEditando(null);
          setError("");
        }}
        placeholder="Principio activo…"
        autoFocus
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      {principio && (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-neutral-300 text-left text-neutral-500">
              <th className="py-2 font-medium">Denominación</th>
              <th className="py-2 text-right font-medium">Descuento</th>
              <th className="py-2 text-right font-medium">Prioridad</th>
              <th className="py-2 text-right font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => {
              const enEdicion = editando === f.lab;
              const trabajando = ocupado === f.lab;
              return (
                <tr key={f.lab} className="border-b border-neutral-100">
                  <td className="py-2">{f.denominacion}</td>
                  <td className="py-2 text-right tabular-nums">
                    {enEdicion ? (
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") guardar(f.lab);
                          else if (e.key === "Escape") setEditando(null);
                        }}
                        autoFocus
                        className="w-20 rounded border border-neutral-300 px-2 py-1 text-right outline-none focus:border-neutral-500"
                      />
                    ) : f.descuento === null ? (
                      <span className="text-neutral-400">—</span>
                    ) : (
                      // Inferido: número sutil (lo decidimos nosotros, sin validar)
                      <span className={f.inferido ? "text-neutral-400" : ""}>{f.descuento}%</span>
                    )}
                  </td>
                  <td className="py-2 text-right tabular-nums">{f.prioridad ?? "—"}</td>
                  <td className="py-2 text-right">
                    {enEdicion ? (
                      <span className="flex justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => guardar(f.lab)}
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
                      <span className="flex justify-end gap-3">
                        {f.inferido && (
                          <button
                            type="button"
                            onClick={() => comprobar(f.lab)}
                            disabled={trabajando}
                            className="text-neutral-500 hover:underline disabled:opacity-40"
                          >
                            {trabajando ? "…" : "Comprobar"}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => empezar(f.lab, f.descuento)}
                          disabled={trabajando}
                          className="text-neutral-500 hover:underline disabled:opacity-40"
                        >
                          Editar
                        </button>
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
