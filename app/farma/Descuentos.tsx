"use client";

import { Fragment, useMemo, useState } from "react";
import { abreviar, mismaEntrada, rankear, sinGenerica, type LabDescuento } from "@/lib/farma/prioridades";
import Buscador from "./Buscador";
import { PencilIcon, CheckIcon, XIcon, ConfirmarIcon, PlusIcon, TrashIcon } from "./icons";
import { MAX_DOSIS } from "./api/dosis";

// Descuentos: la tabla de Prioridades en modo edición. María elige en el autocompletar un
// principio activo O un laboratorio y ve solo ese; corrige el descuento de cada lab. Cuatro
// filtros de revisión combinables con la selección: "Inferidos" (descuentos que decidimos
// nosotros, sin validar), "Sólo uno" (principios con un único laboratorio), "Con dosis"
// (las entradas con dosis y la genérica de su lab, que es la tarifa a la que excepcionan)
// y "Sin genérica" (labs cuya tarifa es solo la de unas dosis concretas).
// El número inferido se pinta sutil; se puede confirmar (dar por bueno) o editar — ambos
// apagan el flag. La dosis se edita en cualquier fila, y ponerla o quitarla cambia a qué
// aplica el descuento: eso pide confirmación aparte, porque la fila se va de sitio y el
// error no se ve luego. Borrar sigue siendo solo de las entradas con dosis. Mismo dato y
// orden que Prioridades (reusa rankear); la escritura va al blob farma:descuentos.

const LIMITE = 100; // tope de filas pintadas (el universo son miles): filtra o busca para afinar

type Chip = "inferidos" | "uno" | "dosis" | "sin-generica";
type Fila = ReturnType<typeof rankear>[number] & { principio: string; orden: number };

// Normaliza lo tecleado en un campo de descuento: solo dígitos y un decimal, tope 100.
// El "-" se cae con el filtro (nunca < 0) y >100 se recorta a 100. Deja pasar cadenas
// intermedias ("", "3.") mientras se escribe.
// "Sólo uno" cuenta LABORATORIOS, no entradas: un principio con la genérica y una dosis
// del mismo lab sigue teniendo un solo lab.
const unLab = (labs: LabDescuento[]): boolean => new Set(labs.map((l) => l.lab)).size === 1;

// "Con dosis" arrastra la genérica del mismo lab: la dosis excepciona esa tarifa y sola no
// se puede juzgar.
const grupoDosis = (labs: LabDescuento[], f: { lab: string; dosis?: string }): boolean =>
  f.dosis !== undefined || labs.some((l) => l.dosis && l.lab === f.lab);

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
  const [chip, setChip] = useState<Chip | null>(null); // filtro de revisión, uno cada vez
  const [editando, setEditando] = useState<string | null>(null); // denominación (fila) en edición
  const [draft, setDraft] = useState("");
  const [draftDosis, setDraftDosis] = useState("");
  const [borrando, setBorrando] = useState(false); // el borrado de la fila en edición, pendiente de confirmar
  const [confirmando, setConfirmando] = useState(false); // poner o quitar la dosis, pendiente de confirmar
  const [ocupado, setOcupado] = useState<string | null>(null); // denominación guardando
  const [error, setError] = useState("");

  // Alta de descuento: principio (de los existentes) → dosis (opcional) → lab (de los que
  // aún no lo tienen) → valor. No crea principios ni labs nuevos (se valida también en el
  // servidor). La dosis va antes del lab a propósito: es la que decide qué labs quedan
  // disponibles (con dosis valen todos, incluido el que ya tiene la entrada genérica).
  const [anadiendo, setAnadiendo] = useState(false);
  const [nPrincipio, setNPrincipio] = useState<string | null>(null);
  const [nDosis, setNDosis] = useState("");
  const [nLab, setNLab] = useState<string | null>(null);
  const [nDescuento, setNDescuento] = useState("");
  const [guardandoAlta, setGuardandoAlta] = useState(false);

  const todas: Fila[] = useMemo(
    () =>
      Object.entries(data).flatMap(([principio, labs]) =>
        rankear(principio, labs).map((f, orden) => ({ ...f, principio, orden })),
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
  const totalUno = useMemo(() => todas.filter((f) => unLab(data[f.principio])).length, [todas, data]);
  const totalDosis = useMemo(() => todas.filter((f) => f.dosis).length, [todas]);
  const totalSinGenerica = useMemo(
    () => todas.filter((f) => sinGenerica(data[f.principio], f.lab)).length,
    [todas, data],
  );

  const activo = seleccion !== null || chip !== null;

  // La selección (principio o lab) y el chip se combinan. Orden: por principio y, dentro,
  // el que da `rankear` — por prioridad, con las dosis recolocadas bajo su genérica.
  const filtradas = useMemo(() => {
    if (!activo) return [];
    let xs = todas;
    if (chip === "uno") xs = xs.filter((f) => unLab(data[f.principio]));
    if (chip === "inferidos") xs = xs.filter((f) => f.inferido);
    if (chip === "dosis") xs = xs.filter((f) => grupoDosis(data[f.principio], f));
    if (chip === "sin-generica") xs = xs.filter((f) => sinGenerica(data[f.principio], f.lab));
    // Un principio es clave de `data`; si no, la selección es un laboratorio.
    if (seleccion)
      xs = data[seleccion] ? xs.filter((f) => f.principio === seleccion) : xs.filter((f) => f.lab === seleccion);
    return [...xs].sort((a, b) => a.principio.localeCompare(b.principio, "es") || a.orden - b.orden);
  }, [activo, todas, data, chip, seleccion]);

  const visibles = filtradas.slice(0, LIMITE);

  function patchLocal(f: Fila, cambio: Partial<LabDescuento>) {
    setData((d) => ({
      ...d,
      [f.principio]: d[f.principio].map((l) => (mismaEntrada(l, f.lab, f.dosis) ? { ...l, ...cambio } : l)),
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

  // Vaciar la dosis de una fila que la tenía, o ponérsela a una que no, cambia a qué
  // aplica el descuento (ver la cabecera): se pide confirmación una vez, no en el renombre
  // de una dosis por otra, que es la misma excepción con otro nombre.
  async function guardar(f: Fila, confirmado = false) {
    const valor = Number(draft);
    if (draft.trim() === "" || !Number.isFinite(valor) || valor < 0 || valor > 100) {
      setError("Descuento entre 0 y 100.");
      return;
    }
    const nuevaDosis = draftDosis.trim().toUpperCase() || undefined;
    if (!confirmado && !f.dosis !== !nuevaDosis) {
      setConfirmando(true);
      return;
    }
    setOcupado(f.denominacion);
    const ok = await post("/farma/api/descuento", {
      principio: f.principio,
      lab: f.lab,
      dosis: f.dosis,
      nuevaDosis: nuevaDosis ?? "",
      valor,
    });
    setOcupado(null);
    if (ok) {
      patchLocal(f, { descuento: valor, inferido: false, dosis: nuevaDosis });
      cerrarEdicion();
    }
  }

  async function borrar(f: Fila) {
    setOcupado(f.denominacion);
    const ok = await post("/farma/api/descuento/delete", { principio: f.principio, lab: f.lab, dosis: f.dosis });
    setOcupado(null);
    if (ok) {
      setData((d) => ({
        ...d,
        [f.principio]: d[f.principio].filter((l) => !mismaEntrada(l, f.lab, f.dosis)),
      }));
      cerrarEdicion();
    }
  }

  async function confirmar(f: Fila) {
    setOcupado(f.denominacion);
    const ok = await post("/farma/api/descuento/check", { principio: f.principio, lab: f.lab, dosis: f.dosis });
    setOcupado(null);
    if (ok) patchLocal(f, { inferido: false });
  }

  function empezar(f: Fila) {
    setError("");
    setDraft(f.descuento === null ? "" : String(f.descuento));
    setDraftDosis(f.dosis ?? "");
    setBorrando(false);
    setConfirmando(false);
    setEditando(f.denominacion);
  }

  function cerrarEdicion() {
    setEditando(null);
    setBorrando(false);
    setConfirmando(false);
  }

  // Vacía la búsqueda: quita la selección y remonta el buscador (limpia su campo de texto).
  function limpiarBusqueda() {
    setSeleccion(null);
    setBusquedaKey((k) => k + 1);
  }

  // Chips excluyentes entre sí; al activar uno se apagan los demás y se limpia la búsqueda.
  function toggleChip(cual: Chip) {
    const activar = chip !== cual;
    setChip(activar ? cual : null);
    if (activar) limpiarBusqueda();
  }

  // Labs que se pueden añadir al principio elegido: los que aún no tienen esa entrada.
  // Sin dosis, la entrada es la genérica → quedan fuera los labs que ya la tienen. Con
  // dosis, la entrada es nueva para cualquier lab → valen todos.
  const labsDisponibles = useMemo(() => {
    if (!nPrincipio) return [];
    const dosis = nDosis.trim();
    const yaTiene = new Set(
      data[nPrincipio].filter((l) => (l.dosis ?? "") === dosis.toUpperCase()).map((l) => l.lab),
    );
    const set = new Set<string>();
    for (const labs of Object.values(data)) for (const l of labs) if (!yaTiene.has(l.lab)) set.add(l.lab);
    return [...set].sort((a, b) => a.localeCompare(b, "es"));
  }, [data, nPrincipio, nDosis]);

  function cerrarAlta() {
    setAnadiendo(false);
    setNPrincipio(null);
    setNDosis("");
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
    const dosis = nDosis.trim().toUpperCase() || undefined;
    setGuardandoAlta(true);
    const ok = await post("/farma/api/descuento/add", { principio: nPrincipio, lab: nLab, dosis, valor });
    setGuardandoAlta(false);
    if (ok) {
      const principio = nPrincipio;
      setData((d) => ({ ...d, [principio]: [...d[principio], { lab: nLab, dosis, descuento: valor, inferido: false }] }));
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
          mostrar={abreviar}
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
          <button type="button" onClick={() => toggleChip("inferidos")} className={`fa-chip ${chip === "inferidos" ? "fa-chip-on" : ""}`}>
            <span className="fa-chip-box"><CheckIcon /></span>
            Inferidos <span className="fa-chip-count">({totalInferidos})</span>
          </button>
          <button type="button" onClick={() => toggleChip("uno")} className={`fa-chip ${chip === "uno" ? "fa-chip-on" : ""}`}>
            <span className="fa-chip-box"><CheckIcon /></span>
            Sólo uno <span className="fa-chip-count">({totalUno})</span>
          </button>
          <button type="button" onClick={() => toggleChip("dosis")} className={`fa-chip ${chip === "dosis" ? "fa-chip-on" : ""}`}>
            <span className="fa-chip-box"><CheckIcon /></span>
            Con dosis <span className="fa-chip-count">({totalDosis})</span>
          </button>
          <button type="button" onClick={() => toggleChip("sin-generica")} className={`fa-chip ${chip === "sin-generica" ? "fa-chip-on" : ""}`}>
            <span className="fa-chip-box"><CheckIcon /></span>
            Sin genérica <span className="fa-chip-count">({totalSinGenerica})</span>
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
                  mostrar={abreviar}
                  placeholder="Principio activo…"
                  inputClassName="fa-input"
                  autoFocus
                />
              </div>
            </label>
            <label className="fa-t-muted flex flex-col gap-1 text-[12px]">
              Dosis (opcional)
              <input
                type="text"
                value={nDosis}
                maxLength={MAX_DOSIS}
                onChange={(e) => setNDosis(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") anadir(); else if (e.key === "Escape") cerrarAlta(); }}
                placeholder="Ej: 0,5 mg"
                className="fa-input"
                style={{ width: 120 }}
              />
            </label>
            <label className="fa-t-muted flex flex-col gap-1 text-[12px]">
              Laboratorio
              <div className="w-56">
                <Buscador
                  key={`${nPrincipio ?? "sin-principio"}-${nDosis.trim() ? "dosis" : "generica"}`}
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
                  <th className="fa-th" style={{ width: 124 }}></th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((f) => {
                  const enEdicion = editando === f.denominacion;
                  const trabajando = ocupado === f.denominacion;
                  const huerfana = sinGenerica(data[f.principio], f.lab);
                  return (
                    <Fragment key={f.denominacion}>
                    <tr className="fa-row">
                      <td className="fa-td">
                        {enEdicion ? (
                          <span className="inline-flex items-center gap-1.5" style={{ color: "var(--fa-ink)" }}>
                            {abreviar(f.principio)}
                            <input
                              type="text"
                              value={draftDosis}
                              maxLength={MAX_DOSIS}
                              onChange={(e) => { setDraftDosis(e.target.value); setConfirmando(false); }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") guardar(f, confirmando);
                                else if (e.key === "Escape") cerrarEdicion();
                              }}
                              placeholder="sin dosis"
                              className="fa-edit-input"
                              style={{ width: 130, textAlign: "left" }}
                            />
                            {f.lab}
                          </span>
                        ) : (
                          <>
                            <span className={f.inferido ? "fa-t-muted2" : "font-medium"} style={f.inferido ? undefined : { color: "var(--fa-ink)" }}>
                              {f.denominacion}
                            </span>
                            {f.inferido && <span className="fa-tag ml-1.5">inferido</span>}
                            {huerfana && <span className="fa-tag ml-1.5">sin genérica</span>}
                          </>
                        )}
                      </td>
                      <td className="fa-td fa-th-r">
                        {enEdicion ? (
                          <input
                            type="text"
                            inputMode="decimal"
                            value={draft}
                            onChange={(e) => setDraft(sanearDescuento(e.target.value))}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") guardar(f, confirmando);
                              else if (e.key === "Escape") cerrarEdicion();
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
                        {enEdicion && borrando ? (
                          <span className="inline-flex items-center justify-end gap-1">
                            <span className="fa-t-red text-[12px]">¿Borrar?</span>
                            <button type="button" title="Sí, borrar la línea" onClick={() => borrar(f)} disabled={trabajando} className="fa-iconbtn fa-iconbtn-danger-on">
                              {trabajando ? "…" : <TrashIcon />}
                            </button>
                            <button type="button" title="No" onClick={() => setBorrando(false)} disabled={trabajando} className="fa-iconbtn fa-iconbtn-cancel">
                              <XIcon />
                            </button>
                          </span>
                        ) : enEdicion ? (
                          <span className="inline-flex justify-end gap-1">
                            {f.dosis && (
                              <button type="button" title="Borrar descuento" onClick={() => setBorrando(true)} disabled={trabajando} className="fa-iconbtn fa-iconbtn-danger">
                                <TrashIcon />
                              </button>
                            )}
                            <button type="button" title="Guardar" onClick={() => guardar(f, confirmando)} disabled={trabajando} className="fa-iconbtn fa-iconbtn-accept">
                              {trabajando ? "…" : <CheckIcon />}
                            </button>
                            <button type="button" title="Cancelar" onClick={cerrarEdicion} disabled={trabajando} className="fa-iconbtn fa-iconbtn-cancel">
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
                    {enEdicion && confirmando && (
                      <tr>
                        <td colSpan={4} className="fa-td">
                          <div className="fa-note-amber px-3 py-2 text-[12.5px] leading-[1.5]">
                            {f.dosis
                              ? `Al quitar la dosis, este descuento pasará a valer para TODAS las presentaciones de ${f.lab} en ${abreviar(f.principio)}, no solo para ${f.dosis}.`
                              : `${f.lab} dejará de tener descuento general en ${abreviar(f.principio)}: solo lo tendrá en la dosis «${draftDosis.trim().toUpperCase()}». Las demás presentaciones se quedan sin descuento hasta que las añadas.`}
                            {" "}Pulsa ✓ otra vez para guardarlo.
                          </div>
                        </td>
                      </tr>
                    )}
                    </Fragment>
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
