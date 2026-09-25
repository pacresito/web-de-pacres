"use client";

import Asa from "./asa";
import { useCallback, useState } from "react";
import {
  C_BASAL, C_EMPUJE, C_VISION, CONFIG, EFICIENCIA, E_COMIDA, GIRO, RADIO_COMIDA, TICKS_BOCADO, URNA,
  type Config, type Mundo,
} from "./engine";
import { usePanel } from "./panel";

/** Todas las reglas del mundo. Ni una cifra escrita a mano: salen de las constantes del motor. */

/** Un número para leer: coma decimal y, por debajo de la milésima, potencia. */
function num(x: number): string {
  if (x === 0) return "0";
  const a = Math.abs(x);
  if (a >= 1) return String(+x.toFixed(3)).replace(".", ",");
  if (a >= 1e-3) {
    const s = x.toFixed(3 - Math.floor(Math.log10(a)));
    return s.replace(/0+$/, "").replace(".", ",");   // aquí siempre hay coma: no se come un 10
  }
  const exp = Math.floor(Math.log10(a));
  const mant = +(x / 10 ** exp).toFixed(2);
  return `${String(mant).replace(".", ",")} · 10${sup(exp)}`;
}

const SUPS: Record<string, string> = { "-": "⁻", 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹" };
const sup = (n: number): string => String(n).split("").map((c) => SUPS[c] ?? c).join("");

const pct = (x: number): string => `${Math.round(x * 100)}%`;

const CASA: Record<Config["forma"], string> = {
  caja: "todo el perímetro",
  donut: "alrededor del hueco central",
  barrera: "todo el perímetro, a los dos lados del muro",
  trebol: "todo el borde del disco",
  islas: "el perímetro de cada isla",
};

type Fila = [que: string, cuanto: string, porque: string];
type Seccion = { titulo: string; filas: Fila[] };

function secciones(cfg: Config): Seccion[] {
  return [
    {
      titulo: "el mundo",
      filas: [
        ["la forma", cfg.forma, "la sortea la semilla: decide lo lejos que queda la comida y quién se encuentra con quién"],
        ["tamaño", `${cfg.ancho} × ${cfg.alto}`, "medido para que el suelo se barra: más grande, el centro no lo pisa nadie"],
        ["casa", `franja de ${cfg.casa}`, `${CASA[cfg.forma]}; pisarla ya es estar a salvo, y a ${num(cfg.casa / 2)} del borde se ha llegado del todo`],
        ["la jornada", `${cfg.ticksDia} ticks`, "se acaba cuando se acaba: el que sigue fuera hace noche donde le pilló"],
        ["la luz", "4·u·(1 − u)", "u es lo que lleva corrido el día: cero al alba y al ocaso, uno al mediodía"],
        ["el clima", `${cfg.comidas} bocados al día`, `lo sortea la semilla entre ${URNA.join(", ")} — es el techo de la población`],
        ["se empieza con", `${cfg.censoInicial}`, `y el mundo no recuerda con cuántas empezó: en diez días el clima manda`],
        ["y con provisiones", `despensa ×${num(cfg.despensaFundador)}`, "solo el fundador, al que nadie se la ha pagado: le compra el primer día, no hijos"],
      ],
    },
    {
      titulo: "un cuerpo",
      filas: [
        ["radio", "talla", "y la masa, el cubo del radio: lo grande cuesta al cubo y alcanza en línea"],
        ["velocidad", "empuje / radio cargado", "cargado se va más lento, y lo que no cabe en la despensa también pesa"],
        ["giro máximo", `tangente ${GIRO} / masa cargada`, "el grande maniobra peor, y eso no lo decide ningún gen"],
        ["despensa", `${num(cfg.capReserva)} × masa`, "no es un techo: lo que la pasa espera a ser un hijo"],
        ["vejez", `${cfg.vida} días`, "desde el primero que sale al campo — es lo que le pone plazo a un genoma"],
      ],
    },
    {
      titulo: "lo que cuesta un tick",
      filas: [
        ["se paga", "masa cargada × (basal + ver + mover)", "se paga siempre, hasta dormido: quieto se ahorra el empuje y nada más"],
        ["basal", num(C_BASAL), "por unidad de masa: estar vivo"],
        ["ver", `${num(C_VISION)} × visión²`, "al cuadrado, que es lo que le pone precio a un ojo grande"],
        ["mover", `${num(C_EMPUJE)} × velocidad²`, "probado con el cubo y descartado: la talla perdía su óptimo"],
        ["quedarse a 0", "hambre", "se muere en el sitio, a media faena"],
      ],
    },
    {
      titulo: "comer",
      filas: [
        ["un bocado", `radio ${RADIO_COMIDA} · ${num(E_COMIDA)} de masa`, "se recoge al tocarlo y se lleva encima, sin canjear"],
        ["descargar", `un bocado cada ${TICKS_BOCADO} ticks`, `solo pasada la línea media, a ${num(cfg.casa / 2)} del borde: lo que se ve encima tarda en entrar lo que tarda en irse`],
        ["alcance del ojo", "visión × luz × radio de lo que mira", "por eso el crepúsculo no se cosecha y lo pequeño hay que tenerlo cerca"],
        ["dormir", "haber llegado del todo y no ver nada", "no hay hora de acostarse: sale del ojo de cada uno y de la luz que queda"],
      ],
    },
    {
      titulo: "cazar",
      filas: [
        ["hace falta ser", `${num(cfg.boca)} veces el radio del otro`, "y estar los dos fuera de la franja: en casa no se caza ni se es cazado"],
        ["la dentellada", `${cfg.ticksPresa} ticks`, "mordiendo no se anda ni se decide, ni el que muerde ni el mordido"],
        ["se aprovecha", pct(EFICIENCIA), "de la masa de la presa; su carga cambia de dueño entera"],
        ["de los tuyos no", "distancia genética", "por debajo de lo que la población se separa entre sí, sois la misma cosa"],
      ],
    },
    {
      titulo: "criar y heredar",
      filas: [
        ["se cría", "de noche y llegando del todo", "el que hace noche fuera no cría, y no por eso se muere"],
        ["un hijo cuesta", `${num(cfg.capReserva)} × su masa`, "se muta primero y se mira si cabe: por eso la talla se paga al criar"],
        ["mutación", `× o ÷ (1 + azar · ${num(cfg.tasa)})`, "multiplicativa en los cinco genes que no bajan de cero, y sin techo ninguno"],
        ["sociabilidad", `± azar · ${num(cfg.paso)}`, "el único con signo: sumando, porque lo suyo es querer estar lejos o cerca"],
      ],
    },
  ];
}

export default function Reglas({ mundo, cerrar }: { mundo: () => Mundo | null; cerrar: () => void }) {
  // Se sigue mirando: sembrar con el panel abierto cambia el mundo.
  const [cfg, setCfg] = useState<Config>(CONFIG);
  const leer = useCallback(() => setCfg(mundo()?.cfg ?? CONFIG), [mundo]);
  usePanel(cerrar, leer);

  return (
    <div className="ev-panel rg-panel">
      <style>{`
        .rg-panel { border: 1px solid var(--border); border-radius: 6px; padding: 0.9rem 1rem 1.2rem; }
        .rg-seccion { margin-top: 0.9rem; }
        .rg-titulo {
          font-size: 0.66rem; font-weight: 600; letter-spacing: 0.09em; color: var(--t-ink2);
          border-bottom: 1px solid var(--border); padding-bottom: 0.25rem;
        }
        /* En rejilla: en flex, la nota más larga fijaría el ancho de la tabla. */
        .rg-fila {
          display: grid; grid-template-columns: minmax(0, 8.5rem) minmax(0, 12rem) minmax(0, 1fr);
          gap: 0.2rem 0.9rem; align-items: baseline;
          border-top: 1px solid var(--t-rule2); padding: 0.3rem 0; font-size: 0.66rem;
        }
        .rg-fila:first-of-type { border-top: none; }
        .rg-que { color: var(--t-ink); font-weight: 600; letter-spacing: 0.03em; }
        .rg-cuanto { color: var(--t-accent); font-variant-numeric: tabular-nums; }
        .rg-porque { color: var(--t-ink3); line-height: 1.45; }
        @media (max-width: 620px) {
          .rg-fila { grid-template-columns: minmax(0, 1fr) minmax(0, auto); }
          .rg-porque { grid-column: 1 / -1; }
        }
      `}</style>
      <Asa cerrar={cerrar} />
      <div className="ev-cabecera">
        <b>las reglas</b>
        <button className="ev-btn muted ev-cerrar" onClick={cerrar}>cerrar</button>
      </div>
      {secciones(cfg).map((s) => (
        <section key={s.titulo} className="rg-seccion">
          <h3 className="rg-titulo">{s.titulo}</h3>
          {s.filas.map(([que, cuanto, porque], i) => (
            <div key={i} className="rg-fila">
              <b className="rg-que">{que}</b>
              <span className="rg-cuanto">{cuanto}</span>
              <span className="rg-porque">{porque}</span>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
