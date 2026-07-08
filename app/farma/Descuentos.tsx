"use client";

import { useMemo, useState } from "react";
import { rankear, type LabDescuento } from "@/lib/farma/prioridades";
import Buscador from "./Buscador";
import { PencilIcon, CheckIcon, XIcon, ConfirmarIcon, PlusIcon } from "./icons";

// Descuentos: la tabla de Prioridades en modo edición. María elige en el autocompletar un
// principio activo O un laboratorio y ve solo ese; corrige el descuento de cada lab. Dos
// filtros de revisión combinables con la selección: "Inferidos" (descuentos que decidimos
// nosotros, sin validar) y "Sólo uno" (principios con un único laboratorio). El número
// inferido se pinta sutil; se puede confirmar (dar por bueno) o editar — ambos apagan el
// flag. Mismo dato y orden que Prioridades (reusa rankear); la escritura va al blob
// farma:descuentos.

const LIMITE = 100; // tope de filas pintadas (el universo son miles): filtra o busca para afinar

type Fila = ReturnType<typeof rankear>[number] & { principio: string };

// Normaliza lo tecleado en un campo de descuento: solo dígitos y un decimal, tope 100.
// El "-" se cae con el filtro (nunca < 0) y >100 se recorta a 100. Deja pasar cadenas
// intermedias ("", "3.") mientras se escribe.
function sanearDescuento(raw: string): string {
  const limpio = raw.replace(",", ".").replace(/[^\d.]/g, "");
  const [ent, dec] = limpio.split(".");
  const s = ent + (limpio.includes(".") ? "." + (dec ?? "").slice(0, 1) : "");
  return s !== "" && Number(s) > 100 ? "100" : s;
}

export default function Descuentos({ data: inicial }: { data: Record<string, LabDescuento[]> }) {
  const [data, setData] = useState(inicial);
  const [seleccion, setSeleccion] = useState<string | null>(null); // principio O lab elegido en el autocompletar
  const [busquedaKey, setBusquedaKey] = useState(0); // se incrementa para remontar el buscador y vaciar su campo
  const [soloInferidos, setSoloInferidos] = useState(false);
  const [soloUno, setSoloUno] = useState(false);
  const [editando, setEditando] = useState<string | null>(null); // denominación (fila) en edición
  const [draft, setDraft] = useState("");
  const [ocupado, setOcupado] = useState<string | null>(null); // denominación guardando
  const [error, setError] = useState("");

  // Alta de descuento: principio (de los existentes) → lab (de los que aún no lo tienen)
  // → valor. No crea principios ni labs nuevos (se valida también en el servidor).
  const [anadiendo, setAnadiendo] = useState(false);
  const [nPrincipio, setNPrincipio] = useState<string | null>(null);
  const [nLab, setNLab] = useState<string | null>(null);
  const [nDescuento, setNDescuento] = useState("");
  const [guardandoAlta, setGuardandoAlta] = useState(false);

  const todas: Fila[] = useMemo(
    () =>
      Object.entries(data).flatMap(([principio, labs]) =>
        rankear(principio, labs).map((f) => ({ ...f, principio })),
      ),
    [data],
  );

  // Sugerencias del autocompletar: todos los principios activos y todos los laboratorios.
  const sugerencias = useMemo(() => {
    const set = new Set<string>();
    for (const [principio, labs] of Object.entries(data)) {
      set.add(principio);
      for (const l of labs) set.add(l.lab);
    }
    return [...set].sort((a, b) => a.localeCompare(b, "es"));
  }, [data]);

  const totalInferidos = useMemo(() => todas.filter((f) => f.inferido).length, [todas]);
  const totalUno = useMemo(
    () => todas.filter((f) => data[f.principio].length === 1).length,
    [todas, data],
  );

  const activo = seleccion !== null || soloInferidos || soloUno;

  // La selección (principio o lab) y los chips se combinan. Orden: por principio y, dentro,
  // por prioridad (mejor descuento primero; sin descuento al final), para conservar la
  // comparación entre labs.
  const filtradas = useMemo(() => {
    if (!activo) return [];
    let xs = todas;
    if (soloUno) xs = xs.filter((f) => data[f.principio].length === 1);
    if (soloInferidos) xs = xs.filter((f) => f.inferido);
    // Un principio es clave de `data`; si no, la selección es un laboratorio.
    if (seleccion)
      xs = data[seleccion] ? xs.filter((f) => f.principio === seleccion) : xs.filter((f) => f.lab === seleccion);
    return [...xs].sort((a, b) => {
      const p = a.principio.localeCompare(b.principio, "es");
      if (p !== 0) return p;
      if (a.prioridad === b.prioridad) return 0;
      if (a.prioridad === null) return 1;
      if (b.prioridad === null) return -1;
      return a.prioridad - b.prioridad;
    });
  }, [activo, todas, data, soloUno, soloInferidos, seleccion]);

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

  // Vacía la búsqueda: quita la selección y remonta el buscador (limpia su campo de texto).
  function limpiarBusqueda() {
    setSeleccion(null);
    setBusquedaKey((k) => k + 1);
  }

  // Chips excluyentes entre sí; al activar uno se apaga el otro y se limpia la búsqueda.
  function toggleChip(cual: "inferidos" | "uno") {
    const activar = cual === "inferidos" ? !soloInferidos : !soloUno;
    setSoloInferidos(cual === "inferidos" ? activar : false);
    setSoloUno(cual === "uno" ? activar : false);
    if (activar) limpiarBusqueda();
  }

  // Labs que aún NO tienen el principio elegido (los únicos que se pueden añadir).
  const labsDisponibles = useMemo(() => {
    if (!nPrincipio) return [];
    const yaTiene = new Set(data[nPrincipio].map((l) => l.lab));
    const set = new Set<string>();
    for (const labs of Object.values(data)) for (const l of labs) if (!yaTiene.has(l.lab)) set.add(l.lab);
    return [...set].sort((a, b) => a.localeCompare(b, "es"));
  }, [data, nPrincipio]);

  function cerrarAlta() {
    setAnadiendo(false);
    setNPrincipio(null);
    setNLab(null);
    setNDescuento("");
    setError("");
  }

  async function anadir() {
    if (!nPrincipio || !nLab) {
      setError("Elige principio activo y laboratorio.");
      return;
    }
    const valor = Number(nDescuento);
    if (nDescuento.trim() === "" || !Number.isFinite(valor) || valor < 0 || valor > 100) {
      setError("Descuento entre 0 y 100.");
      return;
    }
    setGuardandoAlta(true);
    const ok = await post("/farma/api/descuento/add", { principio: nPrincipio, lab: nLab, valor });
    setGuardandoAlta(false);
    if (ok) {
      const principio = nPrincipio;
      setData((d) => ({ ...d, [principio]: [...d[principio], { lab: nLab, descuento: valor, inferido: false }] }));
      cerrarAlta();
      setSeleccion(principio); // deja a la vista el principio recién ampliado
    }
  }

  return (
    <div className="fa-panel">
      <div className="flex flex-col gap-3 border-b p-4" style={{ borderColor: "var(--fa-border)" }}>
        <Buscador
          key={busquedaKey}
          items={sugerencias}
          onSelect={setSeleccion}
          onClear={() => setSeleccion(null)}
          placeholder="Buscar por principio activo o laboratorio…"
          autoFocus
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => { setError(""); setAnadiendo(true); }}
            className="fa-btn fa-btn-outline inline-flex items-center gap-1.5 px-[13px] py-[7px] text-[13px]"
          >
            <PlusIcon /> Añadir descuento
          </button>
          <button type="button" onClick={() => toggleChip("inferidos")} className={`fa-chip ${soloInferidos ? "fa-chip-on" : ""}`}>
            <span className="fa-chip-box"><CheckIcon /></span>
            Inferidos <span className="fa-chip-count">({totalInferidos})</span>
          </button>
          <button type="button" onClick={() => toggleChip("uno")} className={`fa-chip ${soloUno ? "fa-chip-on" : ""}`}>
            <span className="fa-chip-box"><CheckIcon /></span>
            Sólo uno <span className="fa-chip-count">({totalUno})</span>
          </button>
        </div>

        {anadiendo && (
          <div className="flex flex-wrap items-end gap-2 rounded border p-3" style={{ borderColor: "var(--fa-border)", background: "var(--fa-surface)" }}>
            <label className="fa-t-muted flex flex-col gap-1 text-[12px]">
              Principio activo
              <div className="w-56">
                <Buscador
                  items={Object.keys(data)}
                  onSelect={(p) => { setNPrincipio(p); setNLab(null); }}
                  onClear={() => { setNPrincipio(null); setNLab(null); }}
                  placeholder="Principio activo…"
                  inputClassName="fa-input"
                  autoFocus
                />
              </div>
            </label>
            <label className="fa-t-muted flex flex-col gap-1 text-[12px]">
              Laboratorio
              <div className="w-56">
                <Buscador
                  key={nPrincipio ?? "sin-principio"}
                  items={labsDisponibles}
                  onSelect={setNLab}
                  onClear={() => setNLab(null)}
                  placeholder={nPrincipio ? "Laboratorio…" : "Elige principio primero"}
                  inputClassName="fa-input"
                />
              </div>
            </label>
            <label className="fa-t-muted flex flex-col gap-1 text-[12px]">
              Descuento
              <input
                type="text"
                inputMode="decimal"
                value={nDescuento}
                onChange={(e) => setNDescuento(sanearDescuento(e.target.value))}
                onKeyDown={(e) => { if (e.key === "Enter") anadir(); else if (e.key === "Escape") cerrarAlta(); }}
                placeholder="%"
                className="fa-input fa-mono text-right"
                style={{ width: 90 }}
              />
            </label>
            <div className="flex gap-1">
              <button type="button" onClick={anadir} disabled={!nPrincipio || !nLab || guardandoAlta} className="fa-btn fa-btn-primary px-3 py-[7px] text-[13px]">
                {guardandoAlta ? "Añadiendo…" : "Añadir"}
              </button>
              <button type="button" onClick={cerrarAlta} disabled={guardandoAlta} className="fa-btn fa-btn-outline px-3 py-[7px] text-[13px]">
                Cancelar
              </button>
            </div>
          </div>
        )}

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
                            type="text"
                            inputMode="decimal"
                            value={draft}
                            onChange={(e) => setDraft(sanearDescuento(e.target.value))}
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
