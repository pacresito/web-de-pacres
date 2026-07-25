"use client";

import { useEffect, useRef, useState } from "react";
import TerminalShell from "../../components/TerminalShell";
import WhyFooter from "../../components/WhyFooter";
import { MARCO_MINUTOS, minutosEnMarco } from "./marco";
import type { Cielo, Evento, EventoSatelite, FilaPlaneta, PuntoArco } from "./engine";

const redondo = (n: number) => +n.toFixed(2);

// ─── Los cuerpos ──────────────────────────────────────────────────────────────
// Color y rasgo de cada cuerpo. Son su identidad: no viran con el tema (ver PROJECT.md).
// La textura es un apunte, no un mapa: dos manchas y una banda bastan para que un disco de
// 22 px se reconozca; más detalle a ese tamaño solo ensucia.

const R = 11;                 // radio del disco
const CX = 18, CY = 12;       // centro dentro del lienzo (36 × 24, ancho para el anillo)
const SOMBRA = "rgba(0,0,0,0.20)";
const LUZ = "rgba(255,255,255,0.16)";

function Craters() {
  return <>
    <circle cx={CX - 4} cy={CY - 3} r="2.6" fill="none" stroke={SOMBRA} strokeWidth="0.9" />
    <circle cx={CX + 3} cy={CY + 3.5} r="1.7" fill="none" stroke={SOMBRA} strokeWidth="0.9" />
    <circle cx={CX - 1} cy={CY + 5} r="1.1" fill={SOMBRA} />
  </>;
}

const CUERPOS: Record<string, { color: string; textura: React.ReactNode }> = {
  Mercurio: { color: "#8f8a80", textura: <Craters /> },
  Venus: {
    color: "#e6cf87",
    textura: <>
      <ellipse cx={CX - 2} cy={CY - 4} rx="8" ry="2" fill={LUZ} />
      <ellipse cx={CX + 1} cy={CY + 4} rx="7" ry="1.6" fill={SOMBRA} />
    </>,
  },
  Marte: {
    color: "#c0512e",
    textura: <>
      <ellipse cx={CX - 3} cy={CY + 1} rx="4.5" ry="3" fill={SOMBRA} />
      <ellipse cx={CX + 4} cy={CY - 3} rx="2.5" ry="1.6" fill={SOMBRA} />
      <ellipse cx={CX} cy={CY - R + 1.5} rx="3.5" ry="1.6" fill="rgba(255,255,255,0.45)" />
    </>,
  },
  Júpiter: {
    color: "#cb9f63",
    textura: <>
      <rect x={CX - R} y={CY - 6.5} width={R * 2} height="2" fill={SOMBRA} />
      <rect x={CX - R} y={CY - 1} width={R * 2} height="2.4" fill={SOMBRA} />
      <rect x={CX - R} y={CY + 4.5} width={R * 2} height="1.8" fill={SOMBRA} />
      <ellipse cx={CX + 3} cy={CY + 3} rx="2.2" ry="1.3" fill="rgba(162,59,42,0.55)" />
    </>,
  },
  Saturno: {
    color: "#dcc27f",
    textura: <>
      <rect x={CX - R} y={CY - 4} width={R * 2} height="1.8" fill={SOMBRA} />
      <rect x={CX - R} y={CY + 2} width={R * 2} height="1.6" fill={SOMBRA} />
    </>,
  },
  Luna: {
    color: "#d9d2c2",
    textura: <>
      <ellipse cx={CX - 3.5} cy={CY - 3} rx="4" ry="3" fill={SOMBRA} />
      <ellipse cx={CX + 2.5} cy={CY + 1} rx="3.2" ry="2.4" fill={SOMBRA} />
      <ellipse cx={CX - 1} cy={CY + 5.5} rx="2.6" ry="1.6" fill={SOMBRA} />
      <circle cx={CX + 4.5} cy={CY - 5} r="1.6" fill="none" stroke={LUZ} strokeWidth="0.8" />
    </>,
  },
};

/**
 * Terminador de la fase: la parte oscura del disco. `sombraDerecha` dice de qué lado cae —en
 * la Luna es real (la creciente ilumina la derecha), en los planetas va fija a la izquierda:
 * de un vistazo se lee cuánto disco falta, no por dónde—.
 */
function sombraD(ilum: number, sombraDerecha: boolean): string {
  const rx = redondo(R * Math.abs(1 - 2 * ilum)); // semieje del terminador: R en nueva, 0 en llena
  const limbo = sombraDerecha ? 1 : 0;
  // El terminador se comba hacia fuera cuando el disco está casi lleno y hacia dentro cuando
  // es un creciente: así la sombra sale fina o gruesa según toque.
  const comba = ilum > 0.5 === !sombraDerecha ? 1 : 0;
  return `M ${CX} ${CY - R} A ${R} ${R} 0 0 ${limbo} ${CX} ${CY + R} A ${rx} ${R} 0 0 ${comba} ${CX} ${CY - R} Z`;
}

/** Disco de un cuerpo: su color, su textura, la fase real encima y —en Saturno— el anillo. */
function Disco({ nombre, iluminacion, sombraDerecha = false, ringTilt = null }: {
  nombre: string; iluminacion: number; sombraDerecha?: boolean; ringTilt?: number | null;
}) {
  const { color, textura } = CUERPOS[nombre];
  const recorte = `obs-disco-${nombre}`;

  // Anillo a la inclinación real (aprox): ry = rx·sen(tilt). El sen() no está fijado por IEEE
  // (ver PROJECT.md) → se redondea para que servidor y navegador coincidan en la hidratación.
  const rx = R * 1.55;
  const ry = ringTilt === null ? 0 : redondo(rx * Math.sin((Math.abs(ringTilt) * Math.PI) / 180));
  const arco = (desde: number, hasta: number) =>
    `M ${CX + desde * rx} ${CY} A ${rx} ${ry} 0 0 1 ${CX + hasta * rx} ${CY}`;

  return (
    <svg width="36" height="24" viewBox="0 0 36 24" aria-hidden>
      <defs><clipPath id={recorte}><circle cx={CX} cy={CY} r={R} /></clipPath></defs>
      {ringTilt !== null && (
        <g transform={`rotate(-18 ${CX} ${CY})`}>
          <path d={arco(-1, 1)} fill="none" stroke="#cdb075" strokeWidth="1.8" opacity="0.75" />
        </g>
      )}
      <circle cx={CX} cy={CY} r={R} fill={color} />
      <g clipPath={`url(#${recorte})`}>
        {textura}
        <path d={sombraD(iluminacion, sombraDerecha)} fill="rgba(6,5,2,0.7)" />
      </g>
      <circle cx={CX} cy={CY} r={R} fill="none" stroke="rgba(0,0,0,0.35)" />
      {ringTilt !== null && (
        <g transform={`rotate(-18 ${CX} ${CY})`}>
          <path d={arco(1, -1)} fill="none" stroke="#cdb075" strokeWidth="1.8" />
        </g>
      )}
    </svg>
  );
}

// ─── La carta del cielo ───────────────────────────────────────────────────────
// Círculo = el cielo entero, con el N arriba y el E a la derecha, como un mapa visto desde
// arriba —y no como el cielo visto desde abajo, que pondría el E a la izquierda—. El centro
// es el cenit y el borde, el horizonte. El trazo va continuo mientras el satélite se ve y
// punteado cuando entra en la sombra de la Tierra.

const C = 52, RADIO = 46; // el lienzo es siempre 104 × 104; el tamaño lo pone el CSS

/** Punto de la carta para un rumbo y una altura. */
function xy(az: number, alt: number, radio = RADIO): [number, number] {
  const r = radio * (1 - Math.min(90, Math.max(0, alt)) / 90);
  const a = (az * Math.PI) / 180;
  // Math.sin/cos no están fijados por IEEE (ver PROJECT.md): redondear para que servidor y
  // navegador coincidan y la hidratación no se queje.
  return [redondo(C + r * Math.sin(a)), redondo(C - r * Math.cos(a))];
}

/** Tramos continuos por visibilidad; la frontera entra en los dos para que la línea no se corte. */
function tramos(puntos: PuntoArco[]): { vis: boolean; d: string }[] {
  const trazo = (pts: PuntoArco[]) =>
    pts.map((p, k) => `${k ? "L" : "M"} ${xy(p.az, p.alt).join(" ")}`).join(" ");
  const salida: { vis: boolean; d: string }[] = [];
  for (let i = 0; i < puntos.length; ) {
    let j = i;
    while (j + 1 < puntos.length && puntos[j + 1].vis === puntos[i].vis) j++;
    const hasta = Math.min(j + 1, puntos.length - 1);
    salida.push({ vis: puntos[i].vis, d: trazo(puntos.slice(i, hasta + 1)) });
    i = j + 1;
  }
  return salida;
}

/**
 * Punta de flecha al final del arco, para saber hacia dónde corre el satélite. Apunta en la
 * dirección del último tramo con recorrido: al ras del horizonte las muestras se amontonan y
 * las dos finales solas dan una dirección temblorosa, pero irse muy atrás desvía la punta de
 * la curva que se está dibujando.
 */
function flechaD(puntos: PuntoArco[]): string | null {
  if (puntos.length < 2) return null;
  const [xf, yf] = xy(puntos[puntos.length - 1].az, puntos[puntos.length - 1].alt);
  const antes = puntos.slice(0, -1).reverse()
    .map((p) => xy(p.az, p.alt))
    .find(([x, y]) => Math.hypot(x - xf, y - yf) >= 1.5);
  if (!antes) return null;

  const a = Math.atan2(yf - antes[1], xf - antes[0]);
  const ala = (giro: number) =>
    `${redondo(xf - 4 * Math.cos(a + giro))} ${redondo(yf - 4 * Math.sin(a + giro))}`;
  return `M ${ala(0.5)} L ${xf} ${yf} L ${ala(-0.5)}`;
}

/** Dónde está el satélite en un instante, interpolando entre las dos muestras que lo rodean. */
function posicionEn(puntos: PuntoArco[], ahora: number): { az: number; alt: number } | null {
  if (puntos.length < 2 || ahora < puntos[0].t || ahora > puntos[puntos.length - 1].t) return null;
  const i = puntos.findIndex((p) => p.t >= ahora);
  if (i <= 0) return puntos[0];
  const a = puntos[i - 1], b = puntos[i];
  const k = (ahora - a.t) / (b.t - a.t);
  // El rumbo puede cruzar el norte (350° → 10°): se interpola por el camino corto.
  const salto = ((b.az - a.az + 540) % 360) - 180;
  return { az: a.az + salto * k, alt: a.alt + (b.alt - a.alt) * k };
}

function CartaCielo({ paso, detallada = false, giro = 0, ahora = null }: {
  paso: EventoSatelite; detallada?: boolean; giro?: number; ahora?: number | null;
}) {
  const pts = paso.trayectoria;
  const [ix, iy] = xy(pts[0].az, pts[0].alt);
  const flecha = flechaD(pts);
  const luna = paso.luna ? xy(paso.luna.az, paso.luna.alt) : null;
  const viva = ahora === null ? null : posicionEn(pts, ahora);
  // El lienzo es el mismo (104) para la miniatura y para la pantalla completa, así que el
  // trazo y los rótulos se adelgazan al ampliar: si no, la carta grande sale a brochazos.
  const rotulo = detallada ? 6.5 : 8;
  const grosor = detallada ? 1.2 : 1.7;

  return (
    <svg viewBox="0 0 104 104" className="obs-carta" aria-hidden>
      <circle cx={C} cy={C} r={RADIO} fill="none" stroke="var(--t-rule)" />
      <circle cx={C} cy={C} r={RADIO / 2} fill="none" stroke="var(--t-rule2)" strokeDasharray="2 3" />
      {detallada && <circle cx={C} cy={C} r={RADIO * 0.75} fill="none" stroke="var(--t-rule2)" strokeDasharray="2 3" />}
      <circle cx={C} cy={C} r="1.6" fill="var(--t-ink3)" />

      <g transform={`rotate(${redondo(giro)} ${C} ${C})`}>
        <text x={C} y="12" textAnchor="middle" fontSize={rotulo} fill="var(--t-ink3)">N</text>
        <text x={C} y="99" textAnchor="middle" fontSize={rotulo} fill="var(--t-ink4)">S</text>
        <text x="9" y="55" textAnchor="middle" fontSize={rotulo} fill="var(--t-ink4)">O</text>
        <text x="96" y="55" textAnchor="middle" fontSize={rotulo} fill="var(--t-ink4)">E</text>

        {tramos(pts).map((t, i) => (
          <path key={i} d={t.d} fill="none" stroke="var(--t-ink)" strokeWidth={grosor * (t.vis ? 1 : 0.85)}
            strokeLinecap="round" strokeLinejoin="round" strokeDasharray={t.vis ? undefined : "1.5 3"} />
        ))}
        <circle cx={ix} cy={iy} r="2.2" fill="var(--t-ink)" />
        {flecha && <path d={flecha} fill="none" stroke="var(--t-ink)" strokeWidth={grosor} strokeLinecap="round" strokeLinejoin="round" />}

        {luna && <circle cx={luna[0]} cy={luna[1]} r={detallada ? 4.6 : 3.4} fill="#98a2ab" stroke="#6f7880" strokeWidth="0.9" />}

        {viva && <>
          <circle cx={xy(viva.az, viva.alt)[0]} cy={xy(viva.az, viva.alt)[1]} r="6" fill="var(--t-accent)" opacity="0.25" className="obs-latido" />
          <circle cx={xy(viva.az, viva.alt)[0]} cy={xy(viva.az, viva.alt)[1]} r="2.9" fill="var(--t-accent)" stroke="var(--t-paper)" strokeWidth="0.8" />
        </>}
      </g>
    </svg>
  );
}

// ─── Formatos ─────────────────────────────────────────────────────────────────

/** "-3,4": la magnitud como se escribe en español, con una decimal. */
const mag = (m: number) => m.toFixed(1).replace(".", ",");

/** "6m", o "< 1m" en los pasos rasantes, que entran y salen dentro del mismo minuto. */
const duracion = (p: EventoSatelite) => (p.horaFin === p.hora ? "< 1m" : `${p.duracionMin}m`);

/** "3h 12m", "12m 30s", "45s": la unidad pequeña solo mientras aún importa. */
function cuenta(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

/** Reloj compartido: null hasta montar, para que el servidor no pinte una hora que el navegador contradiga. */
function useAhora(cada: number): number | null {
  const [ahora, setAhora] = useState<number | null>(null);
  useEffect(() => {
    // Suscribirse al reloj empieza por leerlo: sin esta primera lectura, la marca de "ahora"
    // tardaría hasta 30 s en aparecer.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- es la lectura inicial, no una cascada
    setAhora(Date.now());
    const id = setInterval(() => setAhora(Date.now()), cada);
    return () => clearInterval(id);
  }, [cada]);
  return ahora;
}

// ─── La línea de tiempo ───────────────────────────────────────────────────────

const HORAS = ["18", "20", "22", "00", "02"];

/** Posición dentro del marco, en % del eje. */
const pct = (min: number) => redondo((Math.min(MARCO_MINUTOS, Math.max(0, min)) / MARCO_MINUTOS) * 100);

/** La pista de lo que esta noche no se ve: una vía fantasma con el día en que vuelve. */
function Vuelve({ cuando }: { cuando: string | null }) {
  return <div className="obs-fantasma">↩ vuelve {cuando ?? "en unos meses"}</div>;
}

function PistaPlaneta({ fila }: { fila: FilaPlaneta }) {
  if (!fila.ventana) return <div className="obs-pista"><Vuelve cuando={fila.vuelveEl} /></div>;
  const izq = pct(fila.ventana.desdeMin);
  return (
    <div className="obs-pista">
      <span className="obs-barra" style={{
        left: `${izq}%`,
        width: `${redondo(pct(fila.ventana.hastaMin) - izq)}%`,
        background: CUERPOS[fila.nombre].color,
      }} />
    </div>
  );
}

/**
 * Un instante en la pista: su señal (rombo la Luna, raya verde un satélite) y, al lado, la
 * hora con el detalle que la acompaña —el rumbo por el que sale, el nombre del satélite—.
 */
function Marca({ evento, clase, detalle }: { evento: Evento; clase: string; detalle: string }) {
  const x = pct(minutosEnMarco(new Date(evento.instante)) ?? 0);
  // Pasada la mitad derecha del eje, el texto se pone a la izquierda de la señal: si no, se sale.
  const alaIzquierda = x > 62;
  return (
    <>
      <span className={clase} style={{ left: `${x}%` }} />
      <span className="obs-marca-txt" style={alaIzquierda
        ? { right: `${redondo(100 - x)}%`, marginRight: 12, textAlign: "right" }
        : { left: `${x}%`, marginLeft: 12 }}>
        <b>{evento.hora}</b> <span className="obs-mut">{detalle}</span>
      </span>
    </>
  );
}

function PistaLuna({ cielo }: { cielo: Cielo }) {
  if (!cielo.luna) return <div className="obs-pista"><Vuelve cuando={cielo.lunaVuelveEl} /></div>;
  return (
    <div className="obs-pista">
      <Marca evento={cielo.luna} clase="obs-rombo" detalle={cielo.luna.desde} />
    </div>
  );
}

function PistaSatelites({ pasos }: { pasos: EventoSatelite[] }) {
  if (!pasos.length) return <div className="obs-pista"><span className="obs-sinpasos">sin pasos esta noche</span></div>;
  return (
    <div className="obs-pista">
      {pasos.map((p) => <Marca key={p.instante} evento={p} clase="obs-raya" detalle={p.nombre} />)}
    </div>
  );
}

function LineaDeTiempo({ cielo }: { cielo: Cielo }) {
  const ahora = useAhora(30000);
  const enMarco = ahora === null ? null : minutosEnMarco(new Date(ahora));
  // Los que se ven van primero y en el orden en que asoman: las barras dibujan una escalera.
  const planetas = [...cielo.planetas].sort((a, b) =>
    (a.ventana ? a.ventana.desdeMin : Infinity) - (b.ventana ? b.ventana.desdeMin : Infinity));

  return (
    <div className="obs-tl">
      <div className="obs-eje"><div className="obs-eje-horas">{HORAS.map((h) => <span key={h}>{h}</span>)}</div></div>

      <div className="obs-tl-cuerpo">
        <div className="obs-columna">
          {planetas.map((p) => (
            <div className="obs-etq" key={p.nombre} style={p.ventana ? undefined : { opacity: 0.4 }}>
              <Disco nombre={p.nombre} iluminacion={p.fase.iluminacion} ringTilt={p.fase.ringTilt} />
              <span>{p.nombre}</span>
            </div>
          ))}
          <span className="obs-sep" />
          <div className="obs-etq" style={cielo.luna ? undefined : { opacity: 0.4 }}>
            <Disco nombre="Luna" iluminacion={cielo.luna?.iluminacion ?? 0.5}
              sombraDerecha={(cielo.luna?.anguloFase ?? 0) >= 180} />
            <span>Luna</span>
          </div>
          <div className="obs-etq obs-etq-sat"><span className="obs-sect">Satélites</span></div>
        </div>

        <div className="obs-columna obs-columna-pistas">
          {enMarco !== null && <>
            <span className="obs-ahora" style={{ left: `${pct(enMarco)}%` }} />
            <span className="obs-ahora-etq" style={{ left: `${pct(enMarco)}%` }}>ahora</span>
          </>}
          {planetas.map((p) => <PistaPlaneta key={p.nombre} fila={p} />)}
          <span className="obs-sep" />
          <PistaLuna cielo={cielo} />
          <PistaSatelites pasos={cielo.pasos} />
        </div>
      </div>
    </div>
  );
}

// ─── La tarjeta de satélites ──────────────────────────────────────────────────

function FilaPaso({ paso, onAbrir }: { paso: EventoSatelite; onAbrir: () => void }) {
  return (
    <div className="obs-paso" onClick={onAbrir} role="button" tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onAbrir()}>
      <span className="obs-mini">
        <CartaCielo paso={paso} />
        <span className="obs-lupa">⤢</span>
      </span>
      <span className="obs-paso-datos">
        <span className="obs-paso-nombre">{paso.nombre}</span>
        <span><b className="obs-paso-hora">{paso.hora}</b> <span className="obs-mut">· {duracion(paso)}</span></span>
        <span className="obs-mut">Mag {mag(paso.magnitud)} · ∡ {Math.round(paso.altitud)}°</span>
        <span className="obs-paso-luna">
          {paso.luna
            ? <><span style={{ color: "#98a2ab" }}>●</span> Luna en {paso.luna.rumbo} · {Math.round(paso.luna.alt)}° alt</>
            : <>☾ bajo el horizonte</>}
        </span>
      </span>
    </div>
  );
}

function Satelites({ cielo, onAbrir }: { cielo: Cielo; onAbrir: (p: EventoSatelite) => void }) {
  const n = cielo.pasos.length;
  return (
    <section className="obs-card">
      <div className="obs-card-cab">
        <span className="obs-sect">Satélites · {n ? `${n} paso${n > 1 ? "s" : ""}` : "sin pasos"}</span>
        {n > 0 && <span className="obs-hint">toca la carta → brújula</span>}
      </div>

      {n > 0 && (
        <div className="obs-pasos">
          {cielo.pasos.map((p) => <FilaPaso key={p.instante} paso={p} onAbrir={() => onAbrir(p)} />)}
        </div>
      )}

      <div className="obs-proximos">
        <div className="obs-sect obs-proximos-tit">Próximos pasos</div>
        {cielo.proximos.map((p) => (
          <div className="obs-proximo" key={p.instante}>
            <span>{p.dia} · {p.hora} {p.nombre}</span>
            <span className="obs-mut">{duracion(p)} · Mag {mag(p.magnitud)} · ∡ {Math.round(p.altitud)}°</span>
          </div>
        ))}
        {cielo.ausentes.map((a) => (
          <div className="obs-proximo" key={a.nombre}>
            <span>{a.nombre}</span>
            <span className="obs-mut">↩ vuelve {a.vuelveEl ?? "en unas semanas"}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── La carta a pantalla completa ─────────────────────────────────────────────

/** Rumbo al que apunta el móvil, en grados, o null mientras no haya brújula. */
function useBrujula(): [number | null, () => void] {
  const [rumbo, setRumbo] = useState<number | null>(null);
  const oyente = useRef<((e: DeviceOrientationEvent) => void) | null>(null);

  useEffect(() => () => {
    if (oyente.current) window.removeEventListener("deviceorientation", oyente.current, true);
  }, []);

  const activar = async () => {
    // iOS exige pedir permiso desde un gesto del usuario; el resto de navegadores, no.
    const DOE = window.DeviceOrientationEvent as (typeof DeviceOrientationEvent & {
      requestPermission?: () => Promise<PermissionState>;
    }) | undefined;
    if (DOE?.requestPermission && (await DOE.requestPermission()) !== "granted") return;

    oyente.current = (e) => {
      const iOS = (e as DeviceOrientationEvent & { webkitCompassHeading?: number }).webkitCompassHeading;
      setRumbo(iOS ?? (e.alpha === null ? 0 : 360 - e.alpha));
    };
    window.addEventListener("deviceorientation", oyente.current, true);
    setRumbo(0);
  };

  return [rumbo, activar];
}

function PantallaCompleta({ paso, onCerrar }: { paso: EventoSatelite; onCerrar: () => void }) {
  const ahora = useAhora(1000);
  const [rumbo, activar] = useBrujula();
  const enCurso = ahora !== null && posicionEn(paso.trayectoria, ahora) !== null;
  const frena = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <div className="obs-full" onClick={onCerrar}>
      <div className="obs-full-cab">
        <span><b>{paso.nombre}</b> <span className="obs-mut">· {paso.hora} · {duracion(paso)}</span></span>
        <button className="obs-cerrar" onClick={onCerrar}>cerrar ✕</button>
      </div>

      <div className="obs-norte">▲ {rumbo === null ? "norte" : "estás mirando aquí"}</div>

      <div className="obs-full-carta" onClick={frena}>
        <CartaCielo paso={paso} detallada giro={rumbo === null ? 0 : -rumbo} ahora={ahora} />
      </div>

      <div className="obs-leyenda" onClick={frena}>
        <div className="obs-leyenda-fila">
          {/* El punto verde solo tiene sentido mientras el satélite está sobre el horizonte;
              el resto del tiempo, lo útil es cuánto falta. */}
          <span>{enCurso
            ? <><span className="obs-verde">●</span> dónde mirar ahora</>
            : ahora !== null && ahora < paso.instante
              ? <>empieza en {cuenta(paso.instante - ahora)}</>
              : <>el paso ya ha terminado</>}</span>
          {paso.luna && <span><span style={{ color: "#98a2ab" }}>●</span> Luna en {paso.luna.rumbo} · {Math.round(paso.luna.alt)}°</span>}
        </div>
        {rumbo === null
          ? <button className="obs-boton" onClick={(e) => { frena(e); activar(); }}>Activar brújula</button>
          : <div className="obs-rumbo">brújula activa · rumbo {Math.round(((rumbo % 360) + 360) % 360)}°</div>}
      </div>
    </div>
  );
}

// ─── Línea de estado ──────────────────────────────────────────────────────────

/**
 * El resumen de arriba: dónde se mira, cuántos planetas se ven y cuánto falta para lo próximo
 * que hay que pillar al vuelo. Mientras ocurre, la cuenta se da la vuelta y sube, en verde:
 * es el momento de estar fuera mirando.
 */
function LineaEstado({ cielo }: { cielo: Cielo }) {
  const ahora = useAhora(1000);
  const visibles = cielo.planetas.filter((p) => p.ventana).length;
  const cabecera = <>↳ location: {cielo.sede} · visibles: <span className="obs-verde">{visibles}</span></>;

  if (ahora === null) return <p className="obs-estado">{cabecera}</p>;

  const enCurso = cielo.citas.find((c) => c.instante <= ahora && ahora <= c.instanteFin);
  const proximo = cielo.citas.find((c) => c.instante > ahora);

  return (
    <p className="obs-estado">
      {cabecera} ·{" "}
      {enCurso
        ? <span className="obs-verde">now: {enCurso.nombre} +{cuenta(ahora - enCurso.instante)}</span>
        : proximo
          ? <span>next event: {proximo.nombre} in {cuenta(proximo.instante - ahora)}</span>
          : <span>next event: nada previsto</span>}
    </p>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function Vista({ cielo, comando }: { cielo: Cielo; comando: string }) {
  const [abierto, setAbierto] = useState<EventoSatelite | null>(null);

  // Con la carta a pantalla completa, la página de detrás no debe moverse.
  useEffect(() => {
    if (!abierto) return;
    const previo = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previo; };
  }, [abierto]);

  return (
    <TerminalShell title="observatorio" prompt={{ host: "observatorio", path: "~/apps", command: comando }}>
      <style>{`
        /* width:100% es necesario, no cosmético: como ítem flex con margin auto, sin él encoge
           al ancho del contenido y el max-width nunca llega a aplicar. */
        .obs-page {
          width: 100%; max-width: 900px; margin: 0 auto; min-height: 100dvh;
          padding: clamp(1.6rem, 4vw, 2.6rem) clamp(1.1rem, 4vw, 2rem);
          display: flex; flex-direction: column;
          font-family: var(--t-mono); font-variant-numeric: tabular-nums;
        }
        .obs-mut { color: var(--t-ink3); }
        .obs-verde { color: var(--t-accent); }
        .obs-sect { font-size: 0.62rem; letter-spacing: 0.2em; text-transform: uppercase; color: var(--t-ink3); }
        .obs-estado { font-size: 0.75rem; color: var(--t-ink3); margin: 0 0 1.8rem; }

        /* ── Línea de tiempo ── */
        .obs-eje { display: flex; margin-bottom: 8px; padding-left: var(--obs-etq); }
        .obs-eje-horas { flex: 1; display: flex; justify-content: space-between; font-size: 0.6rem; color: var(--t-ink4); }
        /* La columna de etiquetas da para el disco (36 px, con sitio para el anillo de Saturno)
           más el nombre más largo, "Mercurio", en mono. */
        .obs-tl { --obs-etq: 108px; }
        .obs-tl-cuerpo { display: flex; }
        /* Las dos columnas comparten estructura de filas: por eso quedan alineadas sin rejilla. */
        .obs-columna { display: flex; flex-direction: column; gap: 11px; }
        .obs-columna:first-child { width: var(--obs-etq); flex: none; }
        .obs-columna-pistas { flex: 1; position: relative; min-width: 0; }
        .obs-sep { height: 1px; background: var(--t-rule2); margin: 2px 0; }
        .obs-columna-pistas .obs-sep { background: none; }

        .obs-etq { height: 28px; display: flex; align-items: center; gap: 6px; font-size: 0.75rem; color: var(--t-ink); }
        .obs-pista { height: 28px; position: relative; }

        .obs-barra { position: absolute; top: 6px; height: 16px; border-radius: 8px; }
        .obs-fantasma {
          position: absolute; top: 6px; left: 0; right: 0; height: 16px;
          border: 1px dashed var(--t-rule); border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          font-size: 0.62rem; color: var(--t-ink3);
        }
        /* Las dos señales de un instante comparten sitio y tamaño: rombo la Luna, raya el satélite. */
        .obs-rombo, .obs-raya { position: absolute; top: 50%; }
        .obs-rombo { width: 10px; height: 10px; background: var(--t-ink2); transform: translate(-50%, -50%) rotate(45deg); }
        .obs-raya { width: 3px; height: 16px; border-radius: 1px; background: var(--t-accent); transform: translate(-50%, -50%); }
        .obs-marca-txt { position: absolute; top: 50%; transform: translateY(-50%); font-size: 0.66rem; white-space: nowrap; color: var(--t-ink); }
        .obs-sinpasos { position: absolute; top: 50%; left: 0; transform: translateY(-50%); font-size: 0.62rem; color: var(--t-ink4); }

        .obs-ahora { position: absolute; top: -4px; bottom: 24px; width: 2px; background: var(--t-accent); opacity: 0.9; z-index: 2; }
        .obs-ahora-etq { position: absolute; top: -16px; transform: translateX(-50%); font-size: 0.55rem; color: var(--t-accent); z-index: 2; }

        /* ── Tarjeta de satélites ── */
        .obs-card {
          margin-top: 2rem; background: var(--t-paper2); border: 1px solid var(--t-rule);
          border-radius: 12px; padding: 18px;
        }
        .obs-card-cab { display: flex; align-items: baseline; justify-content: space-between; gap: 1rem; margin-bottom: 14px; }
        .obs-hint { font-size: 0.6rem; color: var(--t-ink4); }
        /* Los pasos se reparten el ancho, pero con tope: así uno solo queda centrado en vez de
           estirado, y dos se quedan a un palmo de los bordes de la tarjeta. */
        .obs-pasos { display: flex; flex-wrap: wrap; justify-content: center; gap: 16px 32px; padding: 0 16px; }
        .obs-paso { display: flex; gap: 14px; align-items: center; flex: 1 1 250px; max-width: 340px; cursor: pointer; transition: transform 0.12s ease; }
        .obs-mini { position: relative; flex: none; line-height: 0; }
        .obs-carta { width: 104px; height: 104px; }
        .obs-lupa { position: absolute; right: 2px; bottom: 2px; font-size: 0.62rem; color: var(--t-ink4); line-height: 1; }
        .obs-paso-datos { display: flex; flex-direction: column; gap: 2px; font-size: 0.75rem; color: var(--t-ink); min-width: 0; }
        .obs-paso-nombre { font-size: 0.88rem; }
        .obs-paso-hora { font-size: 0.95rem; font-weight: 700; }
        .obs-paso-luna { font-size: 0.62rem; color: var(--t-ink3); margin-top: 2px; }

        .obs-proximos { margin-top: 16px; padding-top: 12px; border-top: 1px dashed var(--t-rule); font-size: 0.62rem; color: var(--t-ink3); }
        .obs-proximos-tit { margin-bottom: 4px; }
        .obs-proximo { display: flex; justify-content: space-between; gap: 1rem; line-height: 1.9; }

        /* ── Carta a pantalla completa ── */
        .obs-full {
          position: fixed; inset: 0; z-index: 50; background: var(--t-paper);
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 4px; padding: 16px; overflow-y: auto; animation: obs-fade 0.18s ease;
          font-family: var(--t-mono); color: var(--t-ink);
        }
        .obs-full-cab { width: 100%; max-width: 560px; display: flex; align-items: baseline; justify-content: space-between; gap: 1rem; margin-bottom: 8px; font-size: 0.95rem; }
        .obs-cerrar {
          font: inherit; font-size: 0.75rem; color: var(--t-ink3); background: none;
          border: 1px solid var(--t-rule); border-radius: 7px; padding: 5px 10px; cursor: pointer;
        }
        .obs-norte { height: 16px; font-size: 0.6rem; letter-spacing: 0.05em; color: var(--t-accent); }
        .obs-full-carta .obs-carta { width: min(80vw, 58vh, 500px); height: min(80vw, 58vh, 500px); }
        .obs-leyenda { width: 100%; max-width: 520px; margin-top: 14px; display: flex; flex-direction: column; align-items: center; gap: 10px; }
        .obs-leyenda-fila { display: flex; gap: 18px; flex-wrap: wrap; justify-content: center; font-size: 0.7rem; color: var(--t-ink3); }
        .obs-rumbo { font-size: 0.75rem; color: var(--t-accent); }
        .obs-boton {
          font: inherit; font-size: 0.75rem; font-weight: 700; color: var(--t-paper);
          background: var(--t-accent); border: none; border-radius: 9px; padding: 10px 18px; cursor: pointer;
        }
        .obs-latido { transform-box: fill-box; transform-origin: center; animation: obs-latido 1.6s ease-out infinite; }
        @keyframes obs-fade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes obs-latido { 0% { opacity: 0.55; transform: scale(0.5) } 100% { opacity: 0; transform: scale(2.1) } }

        @media (hover: hover) { .obs-paso:hover { transform: scale(1.03); } }
        .obs-paso:active { transform: scale(1.03); }

        @media (max-width: 560px) {
          .obs-etq { font-size: 0.65rem; gap: 2px; }
          .obs-carta { width: 88px; height: 88px; }
          .obs-paso { flex: 1 1 100%; }
        }
      `}</style>

      <main className="obs-page">
        <LineaEstado cielo={cielo} />
        <LineaDeTiempo cielo={cielo} />
        <Satelites cielo={cielo} onAbrir={setAbierto} />

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

      {abierto && <PantallaCompleta paso={abierto} onCerrar={() => setAbierto(null)} />}
    </TerminalShell>
  );
}
