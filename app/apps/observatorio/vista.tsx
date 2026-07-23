"use client";

import TerminalShell from "../../components/TerminalShell";
import WhyFooter from "../../components/WhyFooter";
import {
  ALTITUD_MINIMA, MAGNITUD_MAXIMA, HORA_MINIMA_LUNA,
  type Evento, type EventoLuna, type Noche,
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
  const lado = creciente ? 1 : 0;
  return (
    <svg width={tam} height={tam} viewBox={`0 0 ${tam} ${tam}`} aria-hidden>
      <circle cx={tam / 2} cy={tam / 2} r={r} fill="var(--t-paper2)" stroke="var(--t-rule)" />
      <path
        d={`M ${tam / 2} ${tam / 2 - r}
            A ${r} ${r} 0 0 ${lado} ${tam / 2} ${tam / 2 + r}
            A ${rx} ${r} 0 0 ${barrido === lado ? 1 : 0} ${tam / 2} ${tam / 2 - r} Z`}
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

function IconoPlaneta({ tam = 18 }: { tam?: number }) {
  return (
    <svg width={tam} height={tam} viewBox="0 0 18 18" aria-hidden>
      <circle cx="9" cy="9" r="4.2" fill="var(--t-ink2)" />
      <ellipse cx="9" cy="9" rx="7.6" ry="2.6" fill="none" stroke="var(--t-ink3)" strokeWidth="1.1"
               transform="rotate(-22 9 9)" />
    </svg>
  );
}

/** Cuarto de círculo del horizonte al cenit, con la marca donde culmina el objeto. */
function ArcoAltitud({ grados }: { grados: number }) {
  const rad = (grados * Math.PI) / 180;
  return (
    <svg width="26" height="16" viewBox="0 0 26 16" aria-hidden>
      <line x1="1" y1="14.5" x2="25" y2="14.5" stroke="var(--t-rule)" strokeWidth="1" />
      <path d="M 25 14.5 A 24 24 0 0 0 1 14.5" fill="none" stroke="var(--t-rule2)" strokeWidth="1" />
      <circle cx={13 - 12 * Math.cos(rad)} cy={14.5 - 12 * Math.sin(rad)} r="2" fill="var(--t-accent2)" />
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
        texto: `sale por el ${e.desde} · ${e.fase}, ${Math.round(e.iluminacion * 100)} % iluminada`,
        hora: e.hora,
      };
    case "planeta":
      return {
        icono: <IconoPlaneta />,
        titulo: e.nombre,
        texto: `al ${e.desde} · se le ve hasta las ${e.horaFin}`,
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
        <span className="obs-dato" title="altitud máxima sobre el horizonte">
          {evento.tipo === "luna" ? (
            <span className="obs-dato-vacio">saliendo</span>
          ) : (
            <>
              <ArcoAltitud grados={evento.altitud} />
              {num(evento.altitud)}°
            </>
          )}
        </span>
        <span className="obs-dato" title="magnitud aparente (menos es más brillante)">
          <PuntoBrillo magnitud={evento.magnitud} />
          {num(evento.magnitud, 1)}
        </span>
      </span>
    </div>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function Vista({ noches }: { noches: Noche[] }) {
  const total = noches.reduce((n, x) => n + x.eventos.length, 0);

  return (
    <TerminalShell
      title="observatorio"
      prompt={{ host: "observatorio", path: "~/apps", command: "./observatorio --dias=7" }}
    >
      <style>{`
        .obs-page {
          max-width: 780px; margin: 0 auto; min-height: 100dvh;
          padding: clamp(2rem, 5vw, 3.5rem) clamp(1.1rem, 4vw, 2rem);
          display: flex; flex-direction: column;
        }
        .obs-page h1 {
          font-family: var(--t-serif); font-weight: 400;
          font-size: clamp(2rem, 6vw, 2.8rem); color: var(--t-ink); margin: 0;
        }
        .obs-sub { color: var(--t-ink3); font-size: 0.9rem; margin: 0.5rem 0 1rem; line-height: 1.5; }
        .obs-criterios {
          display: flex; flex-wrap: wrap; gap: 0.4rem;
          font-family: var(--t-mono); font-size: 0.68rem; color: var(--t-ink3);
          margin: 0 0 2rem; padding: 0; list-style: none;
        }
        .obs-criterios li {
          border: 1px solid var(--t-rule); border-radius: 999px; padding: 2px 9px;
          background: var(--t-paper2);
        }

        .obs-noche { margin-bottom: 1.6rem; }
        .obs-noche-cab {
          display: flex; align-items: center; gap: 0.7rem; margin-bottom: 0.5rem;
          font-family: var(--t-mono); font-size: 0.72rem;
        }
        .obs-noche-cab .obs-fecha { color: var(--t-accent2); text-transform: lowercase; }
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
        .obs-dato-vacio { color: var(--t-ink4); font-size: 0.7rem; min-width: 0; }

        .obs-vacio {
          border: 1px dashed var(--t-rule); border-radius: 8px; padding: 1.5rem;
          text-align: center; color: var(--t-ink3); font-size: 0.85rem;
        }
        .obs-nota {
          font-size: 0.72rem; color: var(--t-ink4); line-height: 1.6;
          border-top: 1px solid var(--t-rule2); padding-top: 1rem; margin-top: 0.5rem;
        }

        @media (max-width: 560px) {
          .obs-fila { grid-template-columns: 3.2rem 18px 1fr; row-gap: 0.3rem; }
          .obs-datos { display: flex; gap: 1rem; grid-column: 3; }
          .obs-dato { justify-content: flex-start; min-width: 0; }
        }
      `}</style>

      <main className="obs-page">
        <h1>Observatorio</h1>
        <p className="obs-sub">
          Lo que se puede ver a simple vista las próximas siete noches, calculado para el sitio
          donde estaré cada una de ellas. Nada de madrugadas: solo lo que ocurre antes de las 00:00.
        </p>
        <ul className="obs-criterios">
          <li>altitud ≥ {ALTITUD_MINIMA}°</li>
          <li>satélites con magnitud ≤ {num(MAGNITUD_MAXIMA)}</li>
          <li>Luna a partir de las {HORA_MINIMA_LUNA}:00</li>
          <li>cielo ya oscuro</li>
        </ul>

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
                <span className="obs-sede">{noche.sede}</span>
              </div>
              {noche.eventos.map((e) => (
                <Fila key={`${e.tipo}-${e.instante}`} evento={e} />
              ))}
            </section>
          ))
        )}

        <p className="obs-nota">
          Satélites propagados con SGP4 sobre los elementos orbitales de Celestrak; Luna y planetas,
          con efemérides VSOP87/ELP. La magnitud de un satélite es una estimación: depende de cómo le
          dé el Sol a los paneles, así que tómala como orden de magnitud y no como promesa.
        </p>

        <WhyFooter
          question="¿Por qué un observatorio?"
          date="23 de julio de 2026"
          style={{ marginTop: "auto", paddingTop: "2rem" }}
        >
          <p>Desde La Manga la Luna sale del mar. Es de esas cosas que no se pueden fotografiar bien y hay que estar.</p>
          <p>El problema es acordarse: cuando te enteras de que pasaba la estación espacial, pasó anteayer.</p>
          <p>Así que esta página no intenta ser un planetario. Solo contesta a una pregunta: ¿merece la pena salir esta noche, y a qué hora?</p>
        </WhyFooter>
      </main>
    </TerminalShell>
  );
}
