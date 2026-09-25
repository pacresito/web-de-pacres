"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { opacidadResto, pintarFila, rojoDe, type Fila, type Muestra, type Puesto, type Tinta } from "./render";
import { enEje, posGen, type Design, type Paleta } from "./designs";
import { RASGOS, banda, edadDe, nombreDe, type Bicho, type Genoma, type Mundo, type Rasgo } from "./engine";

/**
 * La población de hoy, gen a gen: cada bicho —el mismo cuerpo que en el mundo— en el eje de su
 * gen, apilado donde estorba, así que el bulto es el reparto.
 */

/** Alto de una fila, cerrada y abierta: lo que se lleve se lo quita al mundo. */
const ALTO = 22, ALTO_ACTIVA = 72;
/** Diámetro del fundador en la fila, en px CSS. */
const CUERPO = 15, CUERPO_QUIETA = 10;
const REFRESCO = 333;
/** Más rápido mientras alguien se muere: el rojo y la disolución son animación. */
const REFRESCO_LUTO = 50;
/** Margen de acierto al pulsar, en px CSS: el mismo dedo que en el mundo. */
const TACTO = 9;

/**
 * La cifra, en tanto por ciento del eje como la leyenda, y a su lado el reparto del decil 1 al 9:
 * los extremos ya están dibujados.
 */
const pct = (r: Rasgo, v: number) => Math.round(enEje(r, v) * 100);

const num = (x: number) => x.toLocaleString("es-ES", { maximumSignificantDigits: 3 });

/** Censo mínimo para dar el reparto: con menos, el decil 9 es el máximo. */
const CENSO_REPARTO = 7;

/** Los colores de la interfaz, del CSS del tema. */
export function tintaDe(el: HTMLElement): Tinta {
  const c = getComputedStyle(el);
  const v = (n: string) => c.getPropertyValue(n).trim();
  return {
    papel: v("--t-paper"), linea: v("--t-rule"), linea2: v("--t-rule2"),
    ink: v("--t-ink"), ink3: v("--t-ink3"), ink4: v("--t-ink4"), acento: v("--t-accent2"),
  };
}

function FilaGen({ rasgo, activa, mundo, eva, paleta, diseno, latido, sel, marcar, alternar }: {
  rasgo: Rasgo; activa: boolean; mundo: () => Mundo | null;
  eva: Genoma; paleta: Paleta; diseno: Design; latido: number;
  sel: number; marcar: (id: number) => void; alternar: () => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  /** Dónde quedó cada cuerpo en el último pintado: es lo que dice a quién se pulsa. */
  const puestosRef = useRef<Puesto[]>([]);
  /** La mediana de hoy y el reparto, en valores de gen. */
  const [pie, setPie] = useState<{ med: number; reparto: [number, number] | null } | null>(null);
  const alto = activa ? ALTO_ACTIVA : ALTO;

  useEffect(() => {
    const cv = ref.current;
    const ctx = cv?.getContext("2d");
    const m = mundo();
    if (!cv || !ctx || !m) return;

    const dpr = window.devicePixelRatio || 1;
    const W = cv.clientWidth, H = alto;
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);

    const base = eva[rasgo];
    const muestra = (b: Bicho): Muestra => ({
      id: b.id,
      t: posGen(rasgo, b.g[rasgo]),
      c: { x: 0, y: 0, hx: 1, hy: 0, radio: b.radio, carga: b.carga, edad: edadDe(m, b), g: b.g },
    });
    // Las muertes, como en el mundo.
    const bocas = new Map<number, Bicho>();
    for (const b of m.bichos) if (b.muerde) bocas.set(b.muerde, b);
    const cuerpos: Muestra[] = [
      ...m.bichos.map((b) => {
        const dep = b.preso ? bocas.get(b.id) : undefined;
        return dep ? { ...muestra(b), rojo: rojoDe(m.cfg, dep) } : muestra(b);
      }),
      ...m.restos.map((z) => ({ ...muestra(z.b), resto: opacidadResto(z.restan), aspa: z.b.muerte === "hambre" })),
    ];
    const rep = banda(m.bichos.map((b) => b.g[rasgo]));

    const fila: Fila = {
      cuerpos,
      eva: posGen(rasgo, base),
      med: rep === null ? null : posGen(rasgo, rep.med),
      recorrido: null,
      escala: (activa ? CUERPO : CUERPO_QUIETA) / (2 * eva.talla),
      enjambre: activa,
      sel,
    };
    puestosRef.current = pintarFila(ctx, W, H, dpr, diseno, paleta, tintaDe(cv), fila);
    setPie(rep === null ? null : {
      med: rep.med,
      reparto: m.bichos.length >= CENSO_REPARTO ? [rep.lo, rep.hi] : null,
    });
  }, [rasgo, activa, alto, mundo, eva, paleta, diseno, latido, sel]);

  /** En la fila abierta, pulsar un bicho lo marca; en otro sitio, abre o cierra la fila. */
  const pulsar = (e: React.MouseEvent) => {
    const cv = ref.current;
    if (activa && cv) {
      const caja = cv.getBoundingClientRect();
      const x = e.clientX - caja.left, y = e.clientY - caja.top;
      // Gana el más cercano: en el montón los cuerpos se solapan.
      let mejor: Puesto | null = null, cerca = 0;
      for (const q of puestosRef.current) {
        const dx = q.cx - x, dy = q.cy - y, d2 = dx * dx + dy * dy;
        const alcance = q.ancho / 2 + TACTO;
        if (d2 > alcance * alcance) continue;
        if (!mejor || d2 < cerca) { mejor = q; cerca = d2; }
      }
      if (mejor) { marcar(mejor.id); return; }
    }
    alternar();
  };

  return (
    <div className={`tr-fila${activa ? " on" : ""}`} onClick={pulsar}>
      <div className="tr-et">
        <b>{nombreDe(rasgo)}</b>
        <span
          className="tr-cifra"
          title={pie ? `${nombreDe(rasgo)} ${num(pie.med)}${pie.reparto ? ` · ${num(pie.reparto[0])}–${num(pie.reparto[1])}` : ""}` : undefined}
        >
          {pie ? <>{pct(rasgo, pie.med)}%{pie.reparto && <i> · {pct(rasgo, pie.reparto[0])}–{pct(rasgo, pie.reparto[1])}</i>}</> : "—"}
        </span>
      </div>
      <canvas ref={ref} style={{ width: "100%", height: alto, display: "block" }} />
    </div>
  );
}

export default function Tira({ mundo, eva, paleta, diseno, sel, marcar }: {
  mundo: () => Mundo | null;
  eva: Genoma;
  paleta: Paleta;
  diseno: Design;
  /** El bicho marcado, el mismo que en el mundo. */
  sel: number;
  marcar: (id: number) => void;
}) {
  /** La fila abierta, o ninguna: abierta cuesta alto al mundo. */
  const [activa, setActiva] = useState<Rasgo | null>(null);
  // El mundo vive en un ref: la tira se despierta sola, con un contador.
  const [latido, setLatido] = useState(0);
  useEffect(() => {
    // Rápido solo si hay muerte y el mundo corre: en pausa los restos están quietos.
    let id = 0, antes = -1;
    const latir = () => {
      setLatido((n) => n + 1);
      const m = mundo();
      const corre = !!m && m.t !== antes;
      antes = m?.t ?? -1;
      const luto = corre && !!m && (m.restos.length > 0 || m.bichos.some((b) => b.preso));
      id = window.setTimeout(latir, luto ? REFRESCO_LUTO : REFRESCO);
    };
    id = window.setTimeout(latir, REFRESCO);
    return () => window.clearTimeout(id);
  }, [mundo]);

  const cambiar = useCallback((r: Rasgo) => () => setActiva((x) => (x === r ? null : r)), []);

  return (
    <div className="tr-panel">
      <style>{`
        .tr-panel { border-top: 1px solid var(--border); padding: 0.4rem 0 0.15rem; }
        .tr-fila {
          display: grid; grid-template-columns: 168px 1fr; gap: 0.6rem; align-items: center;
          border-top: 1px solid var(--t-rule2); padding: 1px 0; cursor: pointer;
        }
        .tr-fila.on { background: color-mix(in srgb, var(--t-accent) 5%, transparent); }
        .tr-et { display: flex; align-items: baseline; gap: 0.4rem; min-width: 0; line-height: 1.2; }
        .tr-et b { font-size: 0.64rem; letter-spacing: 0.05em; color: var(--t-ink2); }
        .tr-fila.on .tr-et b { color: var(--t-ink); }
        .tr-cifra { font-size: 0.6rem; color: var(--t-ink2); font-variant-numeric: tabular-nums; }
        .tr-cifra i { font-style: normal; color: var(--muted); }
        .tr-eje {
          display: flex; justify-content: space-between; font-size: 0.58rem; color: var(--t-ink3);
          padding: 0.2rem 0 0; margin-left: calc(168px + 0.6rem);
        }
        .tr-eva { color: var(--t-ink2); }
        .tr-eje i { font-style: normal; }
        @media (max-width: 500px) {
          .tr-eje i { display: none; }
          .tr-fila { grid-template-columns: 96px 1fr; gap: 0.4rem; }
          .tr-et { flex-direction: column; align-items: flex-start; gap: 0; }
          .tr-eje { margin-left: calc(96px + 0.4rem); }
        }
      `}</style>
      {RASGOS.map((r) => (
        <FilaGen
          key={r} rasgo={r} activa={r === activa} mundo={mundo} eva={eva}
          paleta={paleta} diseno={diseno} latido={latido}
          sel={sel} marcar={marcar} alternar={cambiar(r)}
        />
      ))}
      <div className="tr-eje">
        <span>lo más bajo<i> visto</i></span>
        <span className="tr-eva">el fundador</span>
        <span>lo más alto</span>
      </div>
    </div>
  );
}
