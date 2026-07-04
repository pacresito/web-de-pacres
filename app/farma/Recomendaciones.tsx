"use client";

import { useMemo, useState } from "react";
import { coincide, contiene, filtrarFallback, sinAcentos } from "@/lib/farma/buscar";
import Buscador from "./Buscador";
import SearchBox from "./SearchBox";
import { CheckIcon, PencilIcon, XIcon } from "./icons";
import type { RefPedidos } from "@/lib/farma/pedidos";
import type { Recomendaciones as Datos } from "@/lib/farma/recomendaciones-store";

// Recomendaciones (admin): María define las ventas cruzadas. Misma tabla que Descuentos
// (buscar por denominación o código, filtros combinables, edición inline con el lápiz),
// pero la celda editable es la LISTA de recomendados de cada artículo, no un número. Es
// dirigido (A→B no implica B→A). Cada alta/baja guarda la lista completa (la ruta tiene
// semántica de conjunto). El universo son miles: busca o filtra para ver filas.
const LIMITE = 100;

type Fila = { codigo: string; denominacion: string; recomendados: string[] };

export default function Recomendaciones({ catalogo, data: inicial }: { catalogo: RefPedidos; data: Datos }) {
  const [data, setData] = useState(inicial);
  const [q, setQ] = useState("");
  const [sinRecom, setSinRecom] = useState(false);
  const [conRecom, setConRecom] = useState(false);
  const [masDe3, setMasDe3] = useState(false);
  const [editando, setEditando] = useState<string | null>(null); // código en edición
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState("");

  const porNombre = useMemo(() => {
    const m = new Map<string, string>();
    for (const [cod, r] of Object.entries(catalogo)) m.set(r.denominacion, cod);
    return m;
  }, [catalogo]);
  const nombres = useMemo(() => [...porNombre.keys()].sort((a, b) => a.localeCompare(b, "es")), [porNombre]);
  const denom = (cod: string) => catalogo[cod]?.denominacion ?? cod;

  const todas: Fila[] = useMemo(
    () =>
      Object.entries(catalogo)
        .map(([codigo, r]) => ({ codigo, denominacion: r.denominacion, recomendados: data[codigo] ?? [] }))
        .sort((a, b) => a.denominacion.localeCompare(b.denominacion, "es")),
    [catalogo, data],
  );

  const totalSin = useMemo(() => todas.filter((f) => f.recomendados.length === 0).length, [todas]);
  const totalCon = useMemo(() => todas.filter((f) => f.recomendados.length > 0).length, [todas]);
  const totalMas3 = useMemo(() => todas.filter((f) => f.recomendados.length > 3).length, [todas]);

  const consulta = sinAcentos(q.trim());
  const activo = consulta !== "" || sinRecom || conRecom || masDe3;

  const filtradas = useMemo(() => {
    if (!activo) return [];
    let xs = todas;
    if (sinRecom) xs = xs.filter((f) => f.recomendados.length === 0);
    if (conRecom) xs = xs.filter((f) => f.recomendados.length > 0);
    if (masDe3) xs = xs.filter((f) => f.recomendados.length > 3);
    if (consulta)
      xs = filtrarFallback(
        xs,
        (f) => contiene(f.denominacion, consulta) || f.codigo.includes(q.trim()),
        (f) => coincide(f.denominacion, consulta),
      );
    return xs;
  }, [activo, todas, sinRecom, conRecom, masDe3, consulta, q]);

  const visibles = filtradas.slice(0, LIMITE);

  async function guardar(codigo: string, nueva: string[]) {
    setOcupado(true);
    setError("");
    try {
      const res = await fetch("/farma/api/recomendaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo, recomendados: nueva }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? "No se pudo guardar");
        return;
      }
      setData((d) => {
        const n = { ...d };
        if (nueva.length === 0) delete n[codigo];
        else n[codigo] = nueva;
        return n;
      });
    } catch {
      setError("No se pudo conectar.");
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="fa-panel">
      <div className="flex flex-col gap-3 border-b p-4" style={{ borderColor: "var(--fa-border)" }}>
        <SearchBox value={q} onChange={setQ} placeholder="Buscar por denominación o código…" autoFocus />
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setSinRecom(!sinRecom)} className={`fa-chip ${sinRecom ? "fa-chip-on" : ""}`}>
            <span className="fa-chip-box"><CheckIcon /></span>
            Sin recomendados <span className="fa-chip-count">({totalSin})</span>
          </button>
          <button type="button" onClick={() => setConRecom(!conRecom)} className={`fa-chip ${conRecom ? "fa-chip-on" : ""}`}>
            <span className="fa-chip-box"><CheckIcon /></span>
            Con recomendados <span className="fa-chip-count">({totalCon})</span>
          </button>
          <button type="button" onClick={() => setMasDe3(!masDe3)} className={`fa-chip ${masDe3 ? "fa-chip-on" : ""}`}>
            <span className="fa-chip-box"><CheckIcon /></span>
            Más de 3 <span className="fa-chip-count">({totalMas3})</span>
          </button>
        </div>
        {error && <p className="fa-t-red text-[13px]">{error}</p>}
      </div>

      {!activo ? (
        <div className="fa-t-muted2 px-6 py-14 text-center text-sm leading-[1.6]">
          Busca por denominación o código,<br />o activa un filtro para ver artículos.
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="fa-table" style={{ minWidth: 640 }}>
              <thead>
                <tr>
                  <th className="fa-th" style={{ width: 96 }}>Código</th>
                  <th className="fa-th">Denominación</th>
                  <th className="fa-th">Recomendados</th>
                  <th className="fa-th" style={{ width: 64 }}></th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((f) => {
                  const enEdicion = editando === f.codigo;
                  const disponibles = enEdicion
                    ? nombres.filter((n) => { const c = porNombre.get(n); return c !== f.codigo && !f.recomendados.includes(c!); })
                    : [];
                  return (
                    <tr key={f.codigo} className="fa-row">
                      <td className="fa-td fa-mono fa-t-ink3">{f.codigo}</td>
                      <td className="fa-td font-medium" style={{ color: "var(--fa-ink)" }}>{f.denominacion}</td>
                      <td className="fa-td">
                        {f.recomendados.length === 0 && !enEdicion && <span className="fa-t-muted2">—</span>}
                        <div className="flex flex-wrap items-center gap-1.5">
                          {f.recomendados.map((cod) =>
                            enEdicion ? (
                              <span key={cod} className="inline-flex items-center gap-1 rounded-md border border-neutral-300 bg-white px-2 py-0.5 text-[12.5px]">
                                {denom(cod)}
                                <button
                                  type="button"
                                  className="fa-iconbtn fa-iconbtn-cancel h-4 w-4"
                                  disabled={ocupado}
                                  onClick={() => guardar(f.codigo, f.recomendados.filter((c) => c !== cod))}
                                  title="Quitar"
                                  aria-label={`Quitar ${denom(cod)}`}
                                >
                                  <XIcon />
                                </button>
                              </span>
                            ) : (
                              <span key={cod} className="fa-tag">{denom(cod)}</span>
                            ),
                          )}
                          {enEdicion && (
                            <div className="w-64">
                              <Buscador
                                key={f.recomendados.length}
                                items={disponibles}
                                onSelect={(n) => { const c = porNombre.get(n); if (c) guardar(f.codigo, [...f.recomendados, c]); }}
                                placeholder="Añadir recomendado…"
                                inputClassName="fa-input w-full"
                              />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="fa-td fa-th-r">
                        <button
                          type="button"
                          title={enEdicion ? "Listo" : "Editar"}
                          onClick={() => setEditando(enEdicion ? null : f.codigo)}
                          className={`fa-iconbtn ${enEdicion ? "fa-iconbtn-accept" : "fa-iconbtn-edit"}`}
                        >
                          {enEdicion ? <CheckIcon /> : <PencilIcon />}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {visibles.length === 0 && <div className="fa-t-muted2 p-11 text-center text-sm">Sin resultados.</div>}
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
