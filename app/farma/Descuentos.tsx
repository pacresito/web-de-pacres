"use client";

import { useMemo, useState } from "react";
import { rankear, type LabDescuento } from "@/lib/farma/prioridades";
import SearchBox from "./SearchBox";
import { PencilIcon, CheckIcon, XIcon, ConfirmarIcon } from "./icons";

// Descuentos: la tabla de Prioridades en modo edición. María busca (por principio activo
// o laboratorio) y corrige el descuento de cada lab. Dos filtros de revisión combinables
// con la búsqueda: "Inferidos" (descuentos que decidimos nosotros, sin validar) y "Sólo
// uno" (principios con un único laboratorio). El número inferido se pinta sutil; se puede
// confirmar (dar por bueno) o editar — ambos apagan el flag. Mismo dato y orden que
// Prioridades (reusa rankear); la escritura va al blob farma:descuentos.

const LIMITE = 100; // tope de filas pintadas (el universo son miles): filtra o busca para afinar

const sinAcentos = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

type Fila = ReturnType<typeof rankear>[number] & { principio: string };

export default function Descuentos({ data: inicial }: { data: Record<string, LabDescuento[]> }) {
  const [data, setData] = useState(inicial);
  const [q, setQ] = useState("");
  const [soloInferidos, setSoloInferidos] = useState(false);
  const [soloUno, setSoloUno] = useState(false);
  const [editando, setEditando] = useState<string | null>(null); // denominación (fila) en edición
  const [draft, setDraft] = useState("");
  const [ocupado, setOcupado] = useState<string | null>(null); // denominación guardando
  const [error, setError] = useState("");

  const consulta = sinAcentos(q.trim());

  const todas: Fila[] = useMemo(
    () =>
      Object.entries(data).flatMap(([principio, labs]) =>
        rankear(principio, labs).map((f) => ({ ...f, principio })),
      ),
    [data],
  );

  const totalInferidos = useMemo(() => todas.filter((f) => f.inferido).length, [todas]);
  const totalUno = useMemo(
    () => todas.filter((f) => data[f.principio].length === 1).length,
    [todas, data],
  );

  const activo = consulta !== "" || soloInferidos || soloUno;

  // Filtros y búsqueda se combinan. Orden: por principio y, dentro, por prioridad (mejor
  // descuento primero; sin descuento al final), para conservar la comparación entre labs.
  const filtradas = useMemo(() => {
    if (!activo) return [];
    let xs = todas;
    if (soloUno) xs = xs.filter((f) => data[f.principio].length === 1);
    if (soloInferidos) xs = xs.filter((f) => f.inferido);
    if (consulta) xs = xs.filter((f) => sinAcentos(f.denominacion).includes(consulta));
    return [...xs].sort((a, b) => {
      const p = a.principio.localeCompare(b.principio, "es");
      if (p !== 0) return p;
      if (a.prioridad === b.prioridad) return 0;
      if (a.prioridad === null) return 1;
      if (b.prioridad === null) return -1;
      return a.prioridad - b.prioridad;
    });
  }, [activo, todas, data, soloUno, soloInferidos, consulta]);

  const visibles = filtradas.slice(0, LIMITE);

  function patchLocal(principio: string, lab: string, cambio: Partial<LabDescuento>) {
    setData((d) => ({
      ...d,
      [principio]: d[principio].map((l) => (l.lab === lab ? { ...l, ...cambio } : l)),
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

  async function guardar(f: Fila) {
    const valor = Number(draft);
    if (draft.trim() === "" || !Number.isFinite(valor) || valor < 0 || valor > 100) {
      setError("Descuento entre 0 y 100.");
      return;
    }
    setOcupado(f.denominacion);
    const ok = await post("/farma/api/descuento", { principio: f.principio, lab: f.lab, valor });
    setOcupado(null);
    if (ok) {
      patchLocal(f.principio, f.lab, { descuento: valor, inferido: false });
      setEditando(null);
    }
  }

  async function confirmar(f: Fila) {
    setOcupado(f.denominacion);
    const ok = await post("/farma/api/descuento/check", { principio: f.principio, lab: f.lab });
    setOcupado(null);
    if (ok) patchLocal(f.principio, f.lab, { inferido: false });
  }

  function empezar(f: Fila) {
    setError("");
    setDraft(f.descuento === null ? "" : String(f.descuento));
    setEditando(f.denominacion);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <SearchBox
          value={q}
          onChange={setQ}
          placeholder="Principio activo o laboratorio…"
          autoFocus
        />
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-neutral-600">
            <input
              type="checkbox"
              checked={soloInferidos}
              onChange={(e) => setSoloInferidos(e.target.checked)}
            />
            Inferidos ({totalInferidos})
          </label>
          <label className="flex items-center gap-2 text-sm text-neutral-600">
            <input
              type="checkbox"
              checked={soloUno}
              onChange={(e) => setSoloUno(e.target.checked)}
            />
            Sólo uno ({totalUno})
          </label>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {activo && (
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
            {visibles.map((f) => {
              const enEdicion = editando === f.denominacion;
              const trabajando = ocupado === f.denominacion;
              return (
                <tr key={f.denominacion} className="border-b border-neutral-100">
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
                          if (e.key === "Enter") guardar(f);
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
                          title="Guardar"
                          onClick={() => guardar(f)}
                          disabled={trabajando}
                          className="text-green-600 hover:text-green-800 disabled:opacity-40"
                        >
                          {trabajando ? "…" : <CheckIcon />}
                        </button>
                        <button
                          type="button"
                          title="Cancelar"
                          onClick={() => setEditando(null)}
                          disabled={trabajando}
                          className="text-neutral-400 hover:text-neutral-600 disabled:opacity-40"
                        >
                          <XIcon />
                        </button>
                      </span>
                    ) : (
                      <span className="flex justify-end gap-3">
                        {f.inferido && (
                          <button
                            type="button"
                            title="Confirmar"
                            onClick={() => confirmar(f)}
                            disabled={trabajando}
                            className="text-neutral-400 hover:text-neutral-600 disabled:opacity-40"
                          >
                            {trabajando ? "…" : <ConfirmarIcon />}
                          </button>
                        )}
                        <button
                          type="button"
                          title="Editar"
                          onClick={() => empezar(f)}
                          disabled={trabajando}
                          className="text-neutral-300 hover:text-neutral-600 transition-colors disabled:opacity-40"
                        >
                          <PencilIcon />
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

      {activo && visibles.length === 0 ? (
        <p className="text-sm text-neutral-400">Nada coincide.</p>
      ) : filtradas.length > LIMITE ? (
        <p className="text-sm text-neutral-400">
          Mostrando {LIMITE} de {filtradas.length}. Busca o filtra para afinar.
        </p>
      ) : null}
    </div>
  );
}
