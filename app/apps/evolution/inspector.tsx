"use client";

import { useCallback, useRef, useState } from "react";
import { RASGOS, nombreDe, type Bicho, type Genoma, type Muerte, type Mundo, type Rasgo } from "./engine";
import { enEje, posGen } from "./designs";
import { usePanel } from "./panel";

/** La ficha del bicho marcado, bajo el mundo: se lee mirándolo andar. */

const num = (x: number) => x.toLocaleString("es-ES", { maximumSignificantDigits: 3 });
const pct = (r: Rasgo, v: number) => Math.round(enEje(r, v) * 100);

const FINAL: Record<Muerte, string> = {
  vejez: "murió de viejo",
  hambre: "murió de hambre",
  comido: "se lo comieron",
};

/** Lo que se lee de un bicho en un momento dado, copiado: el original muere. */
type Ficha = {
  id: number; gen: number;
  dias: number; vida: number;
  despensa: number; carga: number;
  crias: number; vivas: number; camada: number;
  donde: string;
  g: Genoma;
};

function fichar(m: Mundo, b: Bicho): Ficha {
  let vivas = 0;
  for (const o of m.bichos) if (o.idMadre === b.id) vivas++;
  return {
    id: b.id, gen: b.gen,
    // Días vividos contando el de hoy (de noche `dia` ya es mañana), topados en el plazo.
    dias: Math.min(m.cfg.vida, m.dia - b.nacido + (m.noche ? 0 : 1)), vida: m.cfg.vida,
    despensa: b.reserva / (m.cfg.capReserva * b.masa),
    carga: b.carga,
    crias: b.crias, vivas, camada: m.noche ? b.hijos : 0,
    donde: b.dormido ? "durmiendo" : b.aSalvo ? "en casa" : "fuera",
    g: { ...b.g },
  };
}

/** Por encima de llena, en veces. */
const despensaDe = (d: number) => (d > 1 ? `×${num(d)}` : `${Math.round(d * 100)}%`);

/** Se monta con `key` por bicho: cambiar de bicho es empezar de cero. */
export default function Inspector({ mundo, id, eva, cerrar, genes = true }: {
  mundo: () => Mundo | null;
  id: number;
  eva: Genoma;
  cerrar: () => void;
  /** Las seis barras; sin ellas cuando la tira ya los enseña. */
  genes?: boolean;
}) {
  /** La última ficha: deja de refrescarse cuando el bicho no está, que es cuando más se mira. */
  const [ficha, setFicha] = useState<Ficha | null>(null);
  const [vivo, setVivo] = useState(true);
  /** Cómo acabó, o `null` si no está porque se volvió a antes de que naciera. */
  const [muerte, setMuerte] = useState<Muerte | null>(null);
  /** El último cuerpo visto, que guarda la muerte cuando el motor ya lo ha sacado de la lista. */
  const cuerpoRef = useRef<Bicho | null>(null);

  const leer = useCallback(() => {
    const m = mundo();
    if (!m) return;
    const b = m.bichos.find((x) => x.id === id) ?? null;
    // Un cuerpo que se disuelve se ficha una sola vez, y desde ahí se congela.
    const cuerpo = b ?? (cuerpoRef.current ? null : m.restos.find((z) => z.b.id === id)?.b ?? null);
    if (cuerpo) { cuerpoRef.current = cuerpo; setFicha(fichar(m, cuerpo)); }
    setVivo(b !== null);
    setMuerte(b ? null : cuerpoRef.current?.muerte ?? null);
  }, [mundo, id]);
  usePanel(cerrar, leer, 333);

  if (!ficha) return null;
  const f = ficha;
  const cria = (n: number) => `${n} ${n === 1 ? "cría" : "crías"}`;

  return (
    <div className={`in-panel${vivo ? "" : " ido"}`}>
      <style>{`
        .in-panel { border-top: 1px solid var(--border); padding: 0.4rem 0 0.2rem; }
        .in-panel.ido { opacity: 0.55; }
        .in-cab {
          display: flex; align-items: baseline; flex-wrap: wrap; gap: 0.2rem 0.7rem;
          font-size: 0.62rem; color: var(--muted); font-variant-numeric: tabular-nums;
        }
        .in-cab b { font-size: 0.72rem; color: var(--t-accent); letter-spacing: 0.05em; }
        .in-cab i { font-style: normal; color: var(--t-ink4); }
        .in-ido { color: var(--rojo); }
        .in-donde { color: var(--t-ink2); }
        .in-cerrar { margin-left: auto; color: var(--muted); cursor: pointer; font-size: 0.7rem; }
        .in-cerrar:hover, .in-cerrar:active { color: var(--t-accent); }
        .in-genes { display: grid; grid-template-columns: repeat(6, 1fr); gap: 0.3rem 0.8rem; margin-top: 0.35rem; }
        /* El nombre cede y la cifra no: las seis barras tienen que quedar a la misma altura. */
        .in-gen-cab { display: flex; align-items: baseline; justify-content: space-between; gap: 0.3rem; font-size: 0.6rem; }
        .in-gen-cab b {
          color: var(--t-ink2); letter-spacing: 0.04em;
          min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .in-gen-cab span { color: var(--muted); font-variant-numeric: tabular-nums; white-space: nowrap; }
        .in-barra { position: relative; height: 6px; margin-top: 2px; border-bottom: 1px solid var(--t-rule2); }
        .in-barra span { position: absolute; bottom: 0; transform: translateX(-50%); }
        .in-eva-marca { width: 1px; height: 5px; background: var(--t-ink4); }
        .in-aqui { width: 5px; height: 5px; border-radius: 50%; background: var(--t-accent); }
        @media (max-width: 880px) { .in-genes { grid-template-columns: repeat(3, 1fr); } }
        @media (max-width: 430px) { .in-genes { grid-template-columns: repeat(2, 1fr); } }
      `}</style>
      <div className="in-cab">
        <b>#{f.id}</b>
        {!vivo && <span className="in-ido">{muerte ? FINAL[muerte] : "ya no está"}</span>}
        <span>generación {f.gen}</span>
        <span>
          {f.dias} {f.dias === 1 ? "día" : "días"}
          {Number.isFinite(f.vida) && <i> de {f.vida}</i>}
        </span>
        {vivo && <span className="in-donde">{f.donde}</span>}
        <span title="reserva sobre la despensa llena, que va con la masa">
          despensa {despensaDe(f.despensa)}
        </span>
        {f.carga > 0 && <span>lleva {f.carga}</span>}
        <span>
          {f.crias === 0 ? "sin crías" : `${vivo ? "" : "dejó "}${cria(f.crias)}, ${f.vivas} ${f.vivas === 1 ? "viva" : "vivas"}`}
          {f.camada > 0 && <i> · {cria(f.camada)} esta noche</i>}
        </span>
        <button className="in-cerrar" onClick={cerrar} title="Soltar el bicho" aria-label="Soltar el bicho">✕</button>
      </div>

      {/* Misma vara que la leyenda y la tira, con la marca del fundador en cada barra. */}
      {genes && <div className="in-genes">
        {RASGOS.map((r) => (
          <div key={r} className="in-gen" title={`${nombreDe(r)} ${num(f.g[r])}`}>
            <div className="in-gen-cab">
              <b>{nombreDe(r)}</b>
              <span>{pct(r, f.g[r])}%</span>
            </div>
            <div className="in-barra">
              <span className="in-eva-marca" style={{ left: `${posGen(r, eva[r]) * 100}%` }} />
              <span className="in-aqui" style={{ left: `${posGen(r, f.g[r]) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>}
    </div>
  );
}
