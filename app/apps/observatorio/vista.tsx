"use client";

import { Fragment, useEffect, useState } from "react";
import TerminalShell from "../../components/TerminalShell";
import WhyFooter from "../../components/WhyFooter";
import {
  ALTITUD_MINIMA, MAGNITUD_MAXIMA, MARCO_MINUTOS,
  type Evento, type EventoLuna, type Noche, type FilaPlaneta, type Ventana,
} from "./engine";

// ─── Piezas visuales ──────────────────────────────────────────────────────────

const num = (n: number, decimales = 0) =>
  n.toFixed(decimales).replace("-", "−"); // menos tipográfico, que el guion queda pobre

/** Disco lunar con su fase real: la parte iluminada es la que se verá esa noche. */
function IconoLuna({ evento, tam = 18 }: { evento: EventoLuna; tam?: number }) {
  const r = tam / 2 - 1;
  const creciente = evento.anguloFase < 180;
  // El terminador es una semielipse: su semieje horizontal va de r (luna nueva) a 0 (llena).
  const rx = r * Math.abs(1 - 2 * evento.iluminacion);
  const barrido = evento.iluminacion > 0.5 ? 1 : 0;
  // `lado` es el limbo que dibuja el borde exterior de la sombra: la creciente ilumina la
  // derecha (sombra a la izquierda), la menguante al revés. El barrido de la segunda mitad
  // hace la sombra fina en fase gibosa y gruesa en creciente.
  const lado = creciente ? 0 : 1;
  return (
    <svg width={tam} height={tam} viewBox={`0 0 ${tam} ${tam}`} aria-hidden>
      <circle cx={tam / 2} cy={tam / 2} r={r} fill="var(--t-paper2)" stroke="var(--t-rule)" />
      <path
        d={`M ${tam / 2} ${tam / 2 - r}
            A ${r} ${r} 0 0 ${lado} ${tam / 2} ${tam / 2 + r}
            A ${rx} ${r} 0 0 ${barrido === lado ? 0 : 1} ${tam / 2} ${tam / 2 - r} Z`}
        fill="var(--t-ink2)"
      />
    </svg>
  );
}

function IconoSatelite({ tam = 18 }: { tam?: number }) {
  return (
    <svg width={tam} height={tam} viewBox="0 0 18 18" aria-hidden fill="none" stroke="var(--t-accent2)" strokeWidth="1.3">
      <circle cx="9" cy="9" r="2.4" fill="var(--t-accent2)" stroke="none" />
      <rect x="0.8" y="6.6" width="4.4" height="4.8" rx="0.6" />
      <rect x="12.8" y="6.6" width="4.4" height="4.8" rx="0.6" />
      <line x1="5.2" y1="9" x2="6.6" y2="9" />
      <line x1="11.4" y1="9" x2="12.8" y2="9" />
    </svg>
  );
}

// ─── Tabla de planetas ────────────────────────────────────────────────────────
// Panorama estable, arriba del todo: cada planeta con su disco (color y textura evocada,
// más su fase real como la Luna) y la banda de visibilidad dentro del marco 18:00–02:00.

const RP = 15; // radio del disco de planeta
const redondo = (n: number) => +n.toFixed(2);

// Color y rasgo de cada planeta. Son su identidad: no viran con el tema (ver PROJECT.md).
const ESTILO_PLANETA: Record<string, { base: string; dark: string; sig: "craters" | "plain" | "mars" | "jupiter" }> = {
  Mercurio: { base: "#a49a8c", dark: "#6f685e", sig: "craters" },
  Venus:    { base: "#ecdca6", dark: "#c9b579", sig: "plain" },
  Marte:    { base: "#c66a40", dark: "#8f4426", sig: "mars" },
  Júpiter:  { base: "#e3bd82", dark: "#c08f52", sig: "jupiter" },
  Saturno:  { base: "#e2cd93", dark: "#c4a970", sig: "plain" },
};

// Terminador de la fase, igual que la Luna: la parte oscura del disco según la fracción
// iluminada. El lado iluminado va fijo a la izquierda — pintar la orientación real del
// terminador de cada planeta sería otro cálculo, y lo que se lee de un vistazo es cuánto disco
// falta, no por dónde. El barrido de la segunda mitad: sombra fina cuando el disco está casi
// lleno (ilum > 0.5), gruesa cuando es un creciente (ilum < 0.5).
function faseD(cx: number, cy: number, ilum: number): string {
  const rx = redondo(RP * Math.abs(1 - 2 * ilum));
  const barrido = ilum > 0.5 ? 0 : 1;
  return `M ${cx} ${cy - RP} A ${RP} ${RP} 0 0 1 ${cx} ${cy + RP} A ${rx} ${RP} 0 0 ${barrido} ${cx} ${cy - RP} Z`;
}

/** El rasgo dibujado de cada planeta: bandas, mancha, cráteres… Nada para los lisos. */
function Rasgo({ sig, cx, cy }: { sig: string; cx: number; cy: number }) {
  const linea = "rgba(0,0,0,0.18)";
  switch (sig) {
    case "mars": return <>
      <ellipse cx={cx - 3} cy={cy + 2} rx={4} ry={3} fill="rgba(0,0,0,0.22)" />
      <circle cx={cx + 1} cy={cy - RP + 3} r={2.2} fill="rgba(255,255,255,0.55)" />
    </>;
    case "jupiter": return <>
      <line x1={cx - RP + 2} y1={cy - 5} x2={cx + RP - 2} y2={cy - 5} stroke={linea} strokeWidth="1.4" />
      <line x1={cx - RP + 1} y1={cy} x2={cx + RP - 1} y2={cy} stroke={linea} strokeWidth="1.6" />
      <line x1={cx - RP + 2} y1={cy + 5} x2={cx + RP - 2} y2={cy + 5} stroke={linea} strokeWidth="1.2" />
      <ellipse cx={cx + 3} cy={cy + 4} rx={2.4} ry={1.5} fill="#a23b2a" />
    </>;
    case "craters": return <>
      <circle cx={cx - 3} cy={cy - 2} r={2} fill="none" stroke={linea} strokeWidth="0.9" />
      <circle cx={cx + 2} cy={cy + 3} r={1.4} fill="none" stroke={linea} strokeWidth="0.9" />
    </>;
    default: return null;
  }
}

/** Disco del planeta: color propio, su rasgo, la fase encima y —en Saturno— el anillo real. */
function DiscoPlaneta({ fila }: { fila: FilaPlaneta }) {
  const est = ESTILO_PLANETA[fila.nombre];
  const esSaturno = fila.nombre === "Saturno";
  // Saturno necesita más lienzo para que el anillo no salga cortado.
  const W = esSaturno ? 54 : 32, H = esSaturno ? 34 : 32;
  const cx = W / 2, cy = H / 2;
  const gid = `obs-grad-${fila.nombre}`;
  const { iluminacion, ringTilt } = fila.fase;

  // Anillo a la inclinación real (aprox): ry = rx·sen(tilt). El sen() no está fijado por IEEE
  // → se redondea para que servidor y navegador coincidan y no rompa la hidratación.
  let anilloAtras = null, anilloDelante = null;
  if (esSaturno && ringTilt != null) {
    const rx = RP * 1.7;
    const ry = redondo(rx * Math.sin((Math.abs(ringTilt) * Math.PI) / 180));
    anilloAtras   = <g transform={`rotate(-18 ${cx} ${cy})`}><path d={`M ${cx - rx} ${cy} A ${rx} ${ry} 0 0 1 ${cx + rx} ${cy}`} fill="none" stroke="#cdb075" strokeWidth="2.4" opacity="0.9" /></g>;
    anilloDelante = <g transform={`rotate(-18 ${cx} ${cy})`}><path d={`M ${cx + rx} ${cy} A ${rx} ${ry} 0 0 1 ${cx - rx} ${cy}`} fill="none" stroke="#cdb075" strokeWidth="2.4" /></g>;
  }

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden>
      <defs>
        {fila.nombre === "Júpiter" ? (
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#eccf97" /><stop offset="0.35" stopColor="#cc9d5f" />
            <stop offset="0.55" stopColor="#e6c288" /><stop offset="0.75" stopColor="#bd9256" />
            <stop offset="1" stopColor="#e3bd82" />
          </linearGradient>
        ) : (
          <radialGradient id={gid} cx="0.38" cy="0.35" r="0.75">
            <stop offset="0" stopColor={est.base} /><stop offset="1" stopColor={est.dark} />
          </radialGradient>
        )}
      </defs>
      {anilloAtras}
      <circle cx={cx} cy={cy} r={RP} fill={`url(#${gid})`} />
      <Rasgo sig={est.sig} cx={cx} cy={cy} />
      <path d={faseD(cx, cy, iluminacion)} fill="rgba(8,6,3,0.68)" />
      <circle cx={cx} cy={cy} r={RP} fill="none" stroke="rgba(0,0,0,0.15)" />
      {anilloDelante}
    </svg>
  );
}

// Marco fijo 18:00–02:00 (480 min). La franja verde es la ventana visible; los extremos que
// tocan el borde quedan abiertos, sin hora.
const TICKS: [number, string][] = [[0, "18"], [120, "20"], [240, "22"], [360, "00"], [480, "02"]];

function BandaVisibilidad({ ventana, ahoraPct }: { ventana: Ventana; ahoraPct: number | null }) {
  const pos = (min: number) => redondo((Math.min(MARCO_MINUTOS, Math.max(0, min)) / MARCO_MINUTOS) * 100);
  const izq = pos(ventana.desdeMin), der = pos(ventana.hastaMin);
  return (
    <div className="obs-banda">
      <div className="obs-track" />
      <div className="obs-seg" style={{ left: `${izq}%`, width: `${redondo(der - izq)}%` }} />
      {TICKS.map(([min, etq]) => (
        <Fragment key={min}>
          <span className="obs-tickline" style={{ left: `${pos(min)}%` }} />
          <span className="obs-tick" style={{ left: `${pos(min)}%` }}>{etq}</span>
        </Fragment>
      ))}
      {/* Marcador de "ahora": solo entre las 18:00 y las 02:00. Null en el primer render
          (servidor) → aparece tras montar, sin choque de hidratación con el reloj. */}
      {ahoraPct !== null && <>
        <span className="obs-ahora-dot" style={{ left: `${ahoraPct}%` }} />
        <span className="obs-ahora" style={{ left: `${ahoraPct}%` }} />
      </>}
      {!ventana.abiertoInicio && <span className="obs-edge" style={{ left: `${izq}%` }}>{ventana.horaInicio}</span>}
      {!ventana.abiertoFin && <span className="obs-edge" style={{ left: `${der}%` }}>{ventana.horaFin}</span>}
    </div>
  );
}

/** Minutos transcurridos desde las 18:00 (hora de Madrid), o null si estamos fuera del marco. */
function minutosDesde18(d: Date): number | null {
  const p = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Madrid", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(d);
  const hh = +p.find((x) => x.type === "hour")!.value;
  const mm = +p.find((x) => x.type === "minute")!.value;
  const min = hh >= 18 ? (hh - 18) * 60 + mm : hh < 2 ? (hh + 6) * 60 + mm : -1;
  return min >= 0 && min <= MARCO_MINUTOS ? min : null;
}

function TablaPlanetas({ filas }: { filas: FilaPlaneta[] }) {
  const [ahora, setAhora] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setAhora(minutosDesde18(new Date()));
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, []);
  const ahoraPct = ahora === null ? null : redondo((ahora / MARCO_MINUTOS) * 100);

  return (
    <section className="obs-noche">
      <div className="obs-noche-cab"><span className="obs-fecha">Planetas</span><span className="obs-regla" /></div>
      {filas.map((f) => (
        <div className="obs-prow" key={f.nombre}>
          <span className="obs-pnombre">{f.nombre}</span>
          <span className="obs-pdisco"><DiscoPlaneta fila={f} /></span>
          {f.ventana ? (
            <BandaVisibilidad ventana={f.ventana} ahoraPct={ahoraPct} />
          ) : (
            <span className="obs-pvuelve">
              {f.vuelveEl ? <>Vuelve el <b>{f.vuelveEl}</b></> : <>Vuelve en <b>unos meses</b></>}
            </span>
          )}
        </div>
      ))}
    </section>
  );
}

/** Cuarto de círculo del horizonte al cenit, con la marca donde culmina el objeto. */
function ArcoAltitud({ grados }: { grados: number }) {
  const rad = (grados * Math.PI) / 180;
  // Redondeado a centésimas de píxel, y no por estética: Math.cos no está fijado por la
  // norma IEEE y Node y el navegador discrepan en el último bit → React canta que la
  // hidratación no cuadra. Con dos decimales el número es el mismo en los dos lados.
  const pos = (n: number) => +n.toFixed(2);
  return (
    <svg width="26" height="16" viewBox="0 0 26 16" aria-hidden>
      <line x1="1" y1="14.5" x2="25" y2="14.5" stroke="var(--t-rule)" strokeWidth="1" />
      <path d="M 25 14.5 A 24 24 0 0 0 1 14.5" fill="none" stroke="var(--t-rule2)" strokeWidth="1" />
      <circle cx={pos(13 - 12 * Math.cos(rad))} cy={pos(14.5 - 12 * Math.sin(rad))} r="2" fill="var(--t-accent2)" />
    </svg>
  );
}

/** Punto cuyo tamaño imita el brillo: cuanto más negativa la magnitud, más gordo. */
function PuntoBrillo({ magnitud }: { magnitud: number }) {
  const r = Math.min(5.5, Math.max(1.6, 2 - magnitud * 0.8));
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
      <circle cx="6" cy="6" r={r} fill="var(--t-ink)" />
    </svg>
  );
}

// ─── Filas ────────────────────────────────────────────────────────────────────

type Detalle = { icono: React.ReactNode; titulo: string; texto: string; hora: string };

function detalleDe(e: Evento): Detalle {
  switch (e.tipo) {
    case "satelite":
      return {
        icono: <IconoSatelite />,
        titulo: e.nombre,
        // En los pasos rasantes el inicio y el final caen en el mismo minuto: sobra el "hasta".
        texto: e.horaFin === e.hora
          ? `cruza del ${e.desde} al ${e.hasta} en menos de un minuto`
          : `cruza del ${e.desde} al ${e.hasta} · ${e.duracionMin} min, hasta las ${e.horaFin}`,
        hora: e.hora,
      };
    case "luna":
      return {
        icono: <IconoLuna evento={e} />,
        titulo: "Luna",
        // El rumbo no va aquí: la Luna lo enseña en la columna donde los demás ponen su altitud.
        texto: `${e.fase}, ${Math.round(e.iluminacion * 100)} % iluminada`,
        hora: e.hora,
      };
  }
}

function Fila({ evento }: { evento: Evento }) {
  const d = detalleDe(evento);
  return (
    <div className="obs-fila">
      <span className="obs-hora">{d.hora}</span>
      <span className="obs-icono">{d.icono}</span>
      <span className="obs-cuerpo">
        <span className="obs-titulo">{d.titulo}</span>
        <span className="obs-texto">{d.texto}</span>
      </span>
      {/* `display: contents` en escritorio: los dos datos son celdas del grid.
          En móvil el envoltorio se vuelve visible y los pone en una sola línea. */}
      <span className="obs-datos">
        {/* La Luna sale por donde sale y punto: su altitud en ese momento es cero, así que
            esta columna le sirve para lo único que importa, hacia dónde mirar. */}
        {evento.tipo === "luna" ? (
          <span className="obs-dato obs-rumbo" title="por dónde sale">{evento.desde}</span>
        ) : (
          <span className="obs-dato" title="altitud máxima sobre el horizonte">
            <ArcoAltitud grados={evento.altitud} />
            {num(evento.altitud)}°
          </span>
        )}
        <span className="obs-dato" title="magnitud aparente (menos es más brillante)">
          <PuntoBrillo magnitud={evento.magnitud} />
          {num(evento.magnitud, 1)}
        </span>
      </span>
    </div>
  );
}

// ─── Línea de estado ──────────────────────────────────────────────────────────

const nombreDe = (e: Evento) => (e.tipo === "luna" ? "Luna" : e.nombre);

/** "3h 12m", "12m 30s", "45s": la unidad pequeña solo mientras aún importa. */
function cuenta(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

/** Resumen fijo de arriba: dónde se mira y cuántos planetas se ven esta noche. */
function LineaPlanetas({ sede, visibles }: { sede: string; visibles: number }) {
  return (
    <p className="obs-estado">
      ↳ location: {sede} · visibles: <span style={{ color: "var(--t-accent)" }}>{visibles}</span>
    </p>
  );
}

/**
 * Cabecera viva de la agenda: cuántos eventos hay esta semana y cuánto falta para lo próximo
 * que hay que pillar al vuelo — un paso de satélite o la salida de la Luna. Mientras ocurre,
 * la cuenta se da la vuelta y sube, en verde: es el momento de estar fuera mirando.
 */
function LineaEstado({ eventos }: { eventos: Evento[] }) {
  // Null hasta el primer tick: el reloj del servidor no es el del navegador y la
  // hidratación se quejaría de la diferencia. Ese segundo en blanco no se ve — el
  // tecleo del prompt tarda más que eso en destapar el contenido.
  const [ahora, setAhora] = useState<number | null>(null);
  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const total = <span style={{ color: "var(--t-accent)" }}>{eventos.length}</span>;
  if (ahora === null) return <p className="obs-estado">↳ events: {total}</p>;

  const enCurso = eventos.find((e) => e.instante <= ahora && ahora <= e.instanteFin);
  const proximo = eventos.find((e) => e.instante > ahora);

  return (
    <p className="obs-estado">
      ↳ events: {total} ·{" "}
      {enCurso ? (
        <span style={{ color: "var(--t-accent)" }}>
          now: {nombreDe(enCurso)} +{cuenta(ahora - enCurso.instante)}
        </span>
      ) : proximo ? (
        <span>next: {nombreDe(proximo)} in {cuenta(proximo.instante - ahora)}</span>
      ) : (
        <span>next: nada previsto</span>
      )}
    </p>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

// Los criterios del prompt salen de las constantes del motor: si allí cambia el listón,
// la cabecera no puede seguir presumiendo del viejo.
const COMANDO = `./observatorio --min-altitude=${ALTITUD_MINIMA} --max-magnitude=${MAGNITUD_MAXIMA}`;

export default function Vista({ noches, planetas, sede }: { noches: Noche[]; planetas: FilaPlaneta[]; sede: string }) {
  const total = noches.reduce((n, x) => n + x.eventos.length, 0);
  const fugaces = noches.flatMap((n) => n.eventos);
  const planetasVisibles = planetas.filter((p) => p.ventana).length;

  return (
    <TerminalShell
      title="observatorio"
      prompt={{ host: "observatorio", path: "~/apps", command: COMANDO }}
    >
      <style>{`
        .obs-page {
          max-width: 780px; margin: 0 auto; min-height: 100dvh;
          padding: clamp(2rem, 5vw, 3.5rem) clamp(1.1rem, 4vw, 2rem);
          display: flex; flex-direction: column;
        }
        .obs-estado {
          font-family: var(--t-mono); font-size: 0.75rem; color: var(--t-ink3);
          font-variant-numeric: tabular-nums; margin: 0 0 1.6rem;
        }

        .obs-noche { margin-bottom: 1.6rem; }
        .obs-noche-cab {
          display: flex; align-items: center; gap: 0.7rem; margin-bottom: 0.5rem;
          font-family: var(--t-mono); font-size: 0.72rem;
        }
        .obs-noche-cab .obs-fecha { color: var(--t-accent2); }
        .obs-noche-cab .obs-regla { flex: 1; height: 1px; background: var(--t-rule2); }
        .obs-noche-cab .obs-sede { color: var(--t-ink4); }

        .obs-fila {
          display: grid; align-items: center; gap: 0 0.75rem;
          grid-template-columns: 3.2rem 18px 1fr auto auto;
          padding: 0.55rem 0.2rem;
          border-bottom: 1px solid var(--t-rule2);
        }
        .obs-fila:last-child { border-bottom: none; }
        .obs-hora { font-family: var(--t-mono); font-size: 0.85rem; color: var(--t-ink); }
        .obs-icono { display: flex; align-items: center; justify-content: center; }
        .obs-cuerpo { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
        .obs-titulo { font-size: 0.92rem; color: var(--t-ink); }
        .obs-texto { font-size: 0.74rem; color: var(--t-ink3); }
        .obs-datos { display: contents; }
        .obs-dato {
          display: flex; align-items: center; gap: 0.3rem;
          font-family: var(--t-mono); font-size: 0.8rem; color: var(--t-ink2);
          min-width: 4.6rem; justify-content: flex-end;
        }
        /* El rumbo de la Luna no es una cifra que alinear con las de arriba: centrado y
           un punto más apagado, para que no compita con las altitudes. */
        .obs-rumbo { justify-content: center; color: var(--t-ink3); }

        .obs-vacio {
          border: 1px dashed var(--t-rule); border-radius: 8px; padding: 1.5rem;
          text-align: center; color: var(--t-ink3); font-size: 0.85rem;
        }

        /* Tabla de planetas: nombre · disco con fase · banda de visibilidad */
        .obs-prow {
          display: grid; align-items: center; gap: 0 1.1rem;
          grid-template-columns: 5rem 3.6rem 1fr;
          padding: 0.8rem 0.2rem; border-bottom: 1px solid var(--t-rule2);
        }
        .obs-prow:last-child { border-bottom: none; }
        .obs-pnombre { font-size: 0.9rem; color: var(--t-ink); }
        .obs-pdisco { display: flex; align-items: center; justify-content: center; }
        .obs-pvuelve { font-size: 0.78rem; color: var(--t-ink3); }
        .obs-pvuelve b { color: var(--t-accent2); font-weight: 600; }

        .obs-banda { position: relative; height: 40px; }
        .obs-track {
          position: absolute; left: 0; right: 0; top: 16px; height: 8px; background: var(--t-rule2);
          -webkit-mask: linear-gradient(90deg, transparent 0, #000 6%, #000 94%, transparent 100%);
                  mask: linear-gradient(90deg, transparent 0, #000 6%, #000 94%, transparent 100%);
        }
        .obs-seg { position: absolute; top: 16px; height: 8px; border-radius: 5px; background: var(--t-accent); opacity: 0.85; }
        .obs-tick { position: absolute; top: 0; font-size: 0.6rem; color: var(--t-ink4); transform: translateX(-50%); font-family: var(--t-mono); }
        .obs-tickline { position: absolute; top: 12px; width: 1px; height: 16px; background: var(--t-rule); }
        .obs-edge {
          position: absolute; top: 28px; font-size: 0.6rem; color: var(--t-accent2);
          transform: translateX(-50%); font-family: var(--t-mono); font-variant-numeric: tabular-nums;
        }
        /* Marcador sutil de la hora actual sobre la banda */
        .obs-ahora { position: absolute; top: 8px; width: 2px; height: 24px; background: var(--t-ink2); opacity: 0.55; border-radius: 1px; transform: translateX(-50%); }
        .obs-ahora-dot { position: absolute; top: 3px; width: 5px; height: 5px; border-radius: 50%; background: var(--t-ink2); transform: translateX(-50%); }

        @media (max-width: 560px) {
          .obs-fila { grid-template-columns: 3.2rem 18px 1fr; row-gap: 0.3rem; }
          .obs-datos { display: flex; gap: 1rem; grid-column: 3; }
          .obs-dato { justify-content: flex-start; min-width: 0; }
          .obs-prow { grid-template-columns: 4.4rem 3.4rem 1fr; gap: 0 0.7rem; }
        }
      `}</style>

      <main className="obs-page">
        <LineaPlanetas sede={sede} visibles={planetasVisibles} />

        <TablaPlanetas filas={planetas} />

        <LineaEstado eventos={fugaces} />

        {total === 0 ? (
          <p className="obs-vacio">
            Semana floja: nada supera el listón estas noches. Vuelve en unos días.
          </p>
        ) : (
          noches.map((noche) => (
            <section className="obs-noche" key={noche.clave}>
              <div className="obs-noche-cab">
                <span className="obs-fecha">{noche.etiqueta}</span>
                <span className="obs-regla" />
                {/* La sede solo cuando no es la de la cabecera: si no, sería repetirla siete veces. */}
                {noche.sede !== sede && <span className="obs-sede">{noche.sede}</span>}
              </div>
              {noche.eventos.map((e) => (
                <Fila key={`${e.tipo}-${e.instante}`} evento={e} />
              ))}
            </section>
          ))
        )}

        <WhyFooter
          question="¿Por qué un observatorio?"
          date="23 de julio de 2026"
          style={{ marginTop: "auto", paddingTop: "2rem" }}
        >
          <p>Ver salir la Luna por el horizonte me fascina. No se gasta: siempre es más grande, más naranja y más rápida de lo que uno recordaba.</p>
          <p>También me gusta enseñar satélites. La estación espacial, por ejemplo, se ve a simple vista, pero solo durante unos minutos y solo si sabes cuándo mirar.</p>
          <p>Las dos cosas tienen el mismo problema: hay que enterarse a tiempo. Así que hice un observatorio que reúne todo eso en un solo sitio.</p>
        </WhyFooter>
      </main>
    </TerminalShell>
  );
}
