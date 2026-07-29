"use client";

import { useMemo, useState } from "react";
import { indexar, type ArbolData, type Persona } from "@/lib/arbol/tree";

const NOMBRES_DOC: Record<string, string> = {
  "cardona-martin": "Cardona y Martín",
  "castrillo-crespo": "Castrillo y Crespo",
  velasco: "Velasco",
};

function normalizar(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

function etiqueta(p: Persona): string {
  let dates = "";
  if (p.rawDates) dates = ` (${p.rawDates})`;
  else if (p.birth && p.death) dates = ` (${p.birth}–${p.death})`;
  else if (p.birth) dates = ` (${p.birth})`;
  return p.name + dates;
}

export default function Arbol({ data }: { data: ArbolData }) {
  const idx = useMemo(() => indexar(data), [data]);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(Object.values(data.roots).flat()));
  const [query, setQuery] = useState("");

  // Unión donde cada persona aparece como hijo (para subir por el árbol al buscar).
  const unionPorHijo = useMemo(() => {
    const m = new Map<string, string>();
    for (const u of data.unions) for (const c of u.children) m.set(c, u.id);
    return m;
  }, [data.unions]);

  const coincidencias = useMemo(() => {
    const q = normalizar(query.trim());
    if (q.length < 2) return new Set<string>();
    return new Set(data.people.filter((p) => normalizar(p.name).includes(q)).map((p) => p.id));
  }, [query, data.people]);

  function toggle(uid: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  }

  function expandirHasta(pid: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      let current: string | undefined = pid;
      while (current) {
        const pu: string | undefined = unionPorHijo.get(current);
        if (!pu) break;
        next.add(pu);
        const union = idx.unionPorId.get(pu);
        current = union?.partners.find((partnerId) => unionPorHijo.has(partnerId));
      }
      return next;
    });
  }

  function onBuscar(e: React.FormEvent) {
    e.preventDefault();
    for (const pid of coincidencias) expandirHasta(pid);
  }

  function renderPersona(p: Persona) {
    const marcado = coincidencias.has(p.id);
    return (
      <span className={marcado ? "rounded bg-amber-200 px-1" : undefined}>
        {etiqueta(p)}
        {p.uncertain && <span className="ml-0.5 text-neutral-400" title="dato incierto">?</span>}
        {p.nota && <span className="ml-1 text-[12px] text-neutral-400">{p.nota}</span>}
      </span>
    );
  }

  function renderUnion(uid: string, depth: number, key: string) {
    const u = idx.unionPorId.get(uid);
    if (!u) return null;
    const personas = u.partners.map((pid) => idx.personaPorId.get(pid)).filter((p): p is Persona => !!p);
    const abierto = expanded.has(uid);
    const simbolo = u.tipo === "pareja" ? "♥" : personas.length === 2 ? "+" : "";
    const tieneHijos = u.children.length > 0;

    return (
      <li key={key} style={{ marginLeft: depth === 0 ? 0 : 16 }}>
        <button
          type="button"
          onClick={() => tieneHijos && toggle(uid)}
          className={`flex items-start gap-1.5 py-0.5 text-left text-[14px] leading-snug ${
            tieneHijos ? "cursor-pointer" : "cursor-default"
          }`}
        >
          {tieneHijos && <span className="mt-0.5 w-3 text-neutral-400">{abierto ? "▾" : "▸"}</span>}
          {!tieneHijos && <span className="w-3" />}
          <span>
            {personas.map((p, i) => (
              <span key={p.id}>
                {i > 0 && <span className="mx-1 text-neutral-400">{simbolo}</span>}
                {renderPersona(p)}
              </span>
            ))}
          </span>
        </button>
        {abierto && tieneHijos && (
          <ul>
            {u.children.map((cid) => {
              const propiaUnion = idx.familiaDe.get(cid);
              if (propiaUnion) return renderUnion(propiaUnion, depth + 1, `${key}-${cid}`);
              const persona = idx.personaPorId.get(cid);
              if (!persona) return null;
              return (
                <li key={cid} style={{ marginLeft: 16 }} className="py-0.5 pl-[18px] text-[14px] leading-snug">
                  {renderPersona(persona)}
                </li>
              );
            })}
          </ul>
        )}
      </li>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <form onSubmit={onBuscar} className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nombre…"
          className="h-9 flex-1 rounded-lg border border-neutral-300 px-3 text-[14px] outline-none focus:border-neutral-500"
        />
        <button
          type="submit"
          className="h-9 rounded-lg bg-neutral-900 px-3 text-[13px] font-medium text-white disabled:opacity-40"
          disabled={coincidencias.size === 0}
        >
          Ir ({coincidencias.size})
        </button>
      </form>

      {Object.entries(data.roots).map(([doc, uids]) => (
        <section key={doc} className="flex flex-col gap-1">
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-neutral-400">
            {NOMBRES_DOC[doc] ?? doc}
          </h2>
          <ul>{uids.map((uid) => renderUnion(uid, 0, uid))}</ul>
        </section>
      ))}
    </div>
  );
}
