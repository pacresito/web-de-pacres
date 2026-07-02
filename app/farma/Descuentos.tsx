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
    <div className="fa-panel">
      <div className="flex flex-col gap-3 border-b p-4" style={{ borderColor: "var(--fa-border)" }}>
        <SearchBox
          value={q}
          onChange={setQ}
          placeholder="Buscar por principio activo o laboratorio…"
          autoFocus
        />
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setSoloInferidos(!soloInferidos)} className={`fa-chip ${soloInferidos ? "fa-chip-on" : ""}`}>
            <span className="fa-chip-box"><CheckIcon /></span>
            Inferidos <span className="fa-chip-count">({totalInferidos})</span>
          </button>
          <button type="button" onClick={() => setSoloUno(!soloUno)} className={`fa-chip ${soloUno ? "fa-chip-on" : ""}`}>
            <span className="fa-chip-box"><CheckIcon /></span>
            Sólo uno <span className="fa-chip-count">({totalUno})</span>
          </button>
        </div>
        {error && <p className="fa-t-red text-[13px]">{error}</p>}
      </div>

      {!activo ? (
        <div className="fa-t-muted2 px-6 py-14 text-center text-sm leading-[1.6]">
          Busca por principio activo o laboratorio,<br />o activa un filtro para ver los descuentos.
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="fa-table" style={{ minWidth: 620 }}>
              <thead>
                <tr>
                  <th className="fa-th">Denominación</th>
                  <th className="fa-th fa-th-r">Descuento</th>
                  <th className="fa-th">Prioridad</th>
                  <th className="fa-th" style={{ width: 96 }}></th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((f) => {
                  const enEdicion = editando === f.denominacion;
                  const trabajando = ocupado === f.denominacion;
                  return (
                    <tr key={f.denominacion} className="fa-row">
                      <td className="fa-td">
                        <span className={f.inferido ? "fa-t-muted2" : "font-medium"} style={f.inferido ? undefined : { color: "var(--fa-ink)" }}>
                          {f.denominacion}
                        </span>
                        {f.inferido && <span className="fa-tag ml-1.5">inferido</span>}
                      </td>
                      <td className="fa-td fa-th-r">
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
                            className="fa-edit-input fa-mono"
                          />
                        ) : f.descuento === null ? (
                          <span className="fa-t-muted2">—</span>
                        ) : (
                          <span className={`fa-mono ${f.inferido ? "fa-t-muted2" : ""}`}>{f.descuento} %</span>
                        )}
                      </td>
                      <td className="fa-td fa-mono fa-t-ink3">{f.prioridad ?? "—"}</td>
                      <td className="fa-td fa-th-r">
                        {enEdicion ? (
                          <span className="inline-flex justify-end gap-1">
                            <button type="button" title="Guardar" onClick={() => guardar(f)} disabled={trabajando} className="fa-iconbtn fa-iconbtn-accept">
                              {trabajando ? "…" : <CheckIcon />}
                            </button>
                            <button type="button" title="Cancelar" onClick={() => setEditando(null)} disabled={trabajando} className="fa-iconbtn fa-iconbtn-cancel">
                              <XIcon />
                            </button>
                          </span>
                        ) : (
                          <span className="inline-flex justify-end gap-1">
                            {f.inferido && (
                              <button type="button" title="Confirmar" onClick={() => confirmar(f)} disabled={trabajando} className="fa-iconbtn fa-iconbtn-confirm">
                                {trabajando ? "…" : <ConfirmarIcon />}
                              </button>
                            )}
                            <button type="button" title="Editar" onClick={() => empezar(f)} disabled={trabajando} className="fa-iconbtn fa-iconbtn-edit">
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
          </div>
          {visibles.length === 0 && <div className="fa-t-muted2 p-11 text-center text-sm">Sin resultados para esa búsqueda.</div>}
          {filtradas.length > LIMITE && (
            <div className="fa-t-muted border-t p-3.5 text-[13px]" style={{ borderColor: "var(--fa-rule)", background: "var(--fa-inset)" }}>
              Mostrando {LIMITE} de {filtradas.length}. Busca o filtra para afinar.
            </div>
          )}
        </>
      )}
    </div>
  );
}
