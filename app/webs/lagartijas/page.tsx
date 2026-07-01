"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { calcularEdad } from "@/lib/utils";

// ─── Datos ──────────────────────────────────────────────────────────────────
// La favorita (verde y amarilla) va en la portada; estas 5 son la galería.
// `sample-*` son lagartijas de muestra; el resto son fotos reales de Lucas.

type Lagartija = {
  src: string;
  nombre: string;
  nota: string;
  tipo: "estándar" | "llavero";
  giro: number;
  cinta: string;
  ocultarEnMovil?: boolean; // en móvil sobran fotos: se ocultan las redundantes
};

const LAGARTIJAS: Lagartija[] = [
  { src: "/lagartijas/celeste-iloveu.jpg",         nombre: "Celeste y morada",    nota: "en la cola: I ♥ U",  tipo: "estándar", giro: -4, cinta: "#9b5de5" },
  { src: "/lagartijas/azul-lola.jpg",              nombre: "Azul y amarilla",     nota: "en la cola: Lola ♥", tipo: "llavero",  giro:  3, cinta: "#4cc3ff" },
  { src: "/lagartijas/verde-manzana.jpg",          nombre: "Verde manzana",       nota: "con llavero",        tipo: "llavero",  giro: -3, cinta: "#a4e44b" },
  { src: "/lagartijas/sample-turquesa-amarilla.jpeg", nombre: "Turquesa y amarilla", nota: "con mosquetón",   tipo: "llavero",  giro:  5, cinta: "#29c2c9" },
  { src: "/lagartijas/sample-verde-azulada-2.jpg",    nombre: "Verde azulada",       nota: "de perfil",       tipo: "estándar", giro: -5, cinta: "#ffd23f" },
];

const PALETA = ["#ff5ca8", "#29c2c9", "#a4e44b", "#ffd23f", "#ff8a3d", "#9b5de5", "#4cc3ff", "#ff4d4d"];

// ─── Lagartija dibujada (SVG) ───────────────────────────────────────────────
// Reutilizada en 3 sitios: mascota de portada (con lengua al tocar) y dos bichos
// decorativos que trepan. El color del cuerpo viaja por `currentColor`.

function Lizard({ color, width, tongue = false }: { color: string; width: number | string; tongue?: boolean }) {
  return (
    <svg viewBox="0 0 120 200" style={{ color, width, height: "auto", overflow: "visible", display: "block", filter: "drop-shadow(0 4px 0 rgba(0,0,0,.10))" }}>
      <path d="M60 116 q 36 24 16 64 q -7 22 -25 13" fill="none" stroke={color} strokeWidth={13} strokeLinecap="round" />
      {["M42 64 L15 48", "M78 64 L105 48", "M42 106 L13 122", "M78 106 L107 122"].map((d) => (
        <path key={d} d={d} fill="none" stroke="currentColor" strokeWidth={11} strokeLinecap="round" />
      ))}
      {([[15, 48], [105, 48], [13, 122], [107, 122]] as const).map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={7.5} fill="currentColor" stroke="#2b2b2b" strokeWidth={3.5} />
      ))}
      <ellipse cx={60} cy={82} rx={27} ry={43} fill="currentColor" stroke="#2b2b2b" strokeWidth={4} />
      {([[60, 68], [52, 92], [68, 104]] as const).map(([cx, cy]) => (
        <circle key={`d${cx}-${cy}`} cx={cx} cy={cy} r={4} fill="rgba(255,255,255,.55)" />
      ))}
      <circle cx={60} cy={36} r={23} fill="currentColor" stroke="#2b2b2b" strokeWidth={4} />
      <circle cx={50} cy={32} r={5.5} fill="#fff" stroke="#2b2b2b" strokeWidth={2} />
      <circle cx={70} cy={32} r={5.5} fill="#fff" stroke="#2b2b2b" strokeWidth={2} />
      <circle cx={50} cy={32} r={2.4} fill="#2b2b2b" />
      <circle cx={70} cy={32} r={2.4} fill="#2b2b2b" />
      <path d="M51 45 q9 8 18 0" fill="none" stroke="#2b2b2b" strokeWidth={2.6} strokeLinecap="round" />
      {tongue && (
        <>
          <path d="M60 47 q 1 20 17 27" fill="none" stroke="#ff3b5c" strokeWidth={6} strokeLinecap="round" />
          <circle cx={80} cy={75} r={6.5} fill="#ff3b5c" stroke="#2b2b2b" strokeWidth={2} />
        </>
      )}
    </svg>
  );
}

// Hilo de cuentas entre secciones: evoca la cola de lagartija que cose el scroll.
function BeadRow() {
  return (
    <div className="lg-bead-row">
      {Array.from({ length: 30 }, (_, i) => (
        <span key={i} className="lg-bead" style={{ background: PALETA[i % PALETA.length], transform: `translateY(${(Math.sin(i / 1.25) * 9).toFixed(1)}px)` }} />
      ))}
    </div>
  );
}

// ─── Página ─────────────────────────────────────────────────────────────────

export default function Lagartijas() {
  const edad = calcularEdad(new Date(2020, 2, 30));
  const [heroOpen, setHeroOpen] = useState(false);

  return (
    <>
      <style>{`
        .lg-page {
          overflow-x: hidden;
          min-height: 100dvh;
          position: relative;
          font-family: var(--font-patrick-hand), cursive;
          color: #2b2b2b;
          background-color: #fdf9ec;
          background-image:
            linear-gradient(90deg, transparent 0, transparent 44px, rgba(246,140,160,.55) 44px, rgba(246,140,160,.55) 47px, transparent 47px),
            repeating-linear-gradient(180deg, #fdf9ec 0, #fdf9ec 33px, #d2e6f0 33px, #d2e6f0 34px);
        }
        .lg-marker  { font-family: var(--font-permanent-marker), cursive; }
        .lg-display { font-family: var(--font-shantell-sans), cursive; }

        /* Encuadernación de espiral (cabecera) */
        .lg-rings { display: flex; gap: clamp(12px,4.5vw,26px); justify-content: center; padding: 9px 12px 0; }
        .lg-ring {
          width: 16px; height: 26px; flex: 0 0 auto;
          border-radius: 50% 50% 9px 9px;
          background: radial-gradient(circle at 50% 32%, #ded7c4, #b3ac99);
          box-shadow: inset 0 -3px 4px rgba(0,0,0,.28);
        }

        .lg-section { position: relative; margin: 0 auto; }

        /* Polaroids (favorita + galería) */
        .lg-polaroid {
          background: #fff; border-radius: 4px; border: 1px solid #ececec; position: relative;
        }
        .lg-washi {
          position: absolute; top: -13px; left: 50%;
          transform: translateX(-50%) rotate(-3deg);
          height: 29px; opacity: .82;
          clip-path: polygon(3% 14%, 97% 0, 100% 86%, 0 100%);
          box-shadow: 0 2px 4px rgba(0,0,0,.12);
        }
        .lg-photo { display: block; width: 100%; object-fit: cover; border-radius: 2px; background: #f3efe2; }

        /* Tarjetas de galería: enderezar y levantar al hover (solo ratón) */
        .lg-card {
          margin: 0; flex: 0 0 auto; width: clamp(196px,70vw,244px);
          background: #fff; padding: 12px 12px 0; border-radius: 4px;
          box-shadow: 0 10px 22px rgba(0,0,0,.15); border: 1px solid #ececec; position: relative;
          transition: transform .25s ease, box-shadow .25s ease;
        }
        @media (hover: hover) {
          .lg-card:hover {
            transform: rotate(0deg) translateY(-10px) scale(1.04) !important;
            box-shadow: 0 26px 46px rgba(0,0,0,.24); z-index: 6;
          }
        }
        .lg-badge {
          display: inline-block; margin-top: 8px; font-family: var(--font-permanent-marker), cursive;
          font-size: 12px; padding: 2px 13px; border: 2.5px solid #2b2b2b; border-radius: 40px;
          transform: rotate(-2deg);
        }

        /* Tarjetas "¿cómo la quieres?" con borde a mano */
        .lg-handcard { flex: 1 1 280px; min-width: 260px; background: #fffdf6; border: 3px solid #2b2b2b; padding: clamp(20px,4vw,30px); box-shadow: 6px 6px 0 rgba(43,43,43,.14); }
        .lg-swatch { width: 30px; height: 30px; border-radius: 50%; border: 2.5px solid #2b2b2b; box-shadow: inset -3px -3px 0 rgba(0,0,0,.14); }

        .lg-pricetag { border: 3px solid #2b2b2b; padding: 16px 30px; text-align: center; box-shadow: 5px 5px 0 rgba(43,43,43,.16); }
        .lg-pricehole { width: 15px; height: 15px; border: 3px solid #2b2b2b; border-radius: 50%; background: #fdf9ec; margin: 0 auto -2px; }

        /* Hilo de cuentas */
        .lg-bead-row { display: flex; gap: 5px; justify-content: center; align-items: center; overflow: hidden; padding: 14px 0; max-width: 920px; margin: 0 auto; }
        .lg-bead { width: 15px; height: 15px; border-radius: 50%; border: 2px solid rgba(0,0,0,.2); flex: 0 0 auto; box-shadow: inset -2px -2px 0 rgba(0,0,0,.15); }

        @keyframes lg-bobby   { 0%,100%{ transform: translateY(0) } 50%{ transform: translateY(10px) } }
        @keyframes lg-twinkle { 0%,100%{ transform: scale(1) rotate(0); opacity:.8 } 50%{ transform: scale(1.25) rotate(22deg); opacity:1 } }
        @keyframes lg-spin    { to { transform: rotate(360deg) } }
        @keyframes lg-popin   { 0%{ transform: scale(0) rotate(-12deg) } 70%{ transform: scale(1.15) rotate(4deg) } 100%{ transform: scale(1) rotate(0) } }
        @keyframes lg-crawl   { 0%,100%{ transform: translateY(0) rotate(var(--r,0deg)) } 50%{ transform: translateY(-8px) rotate(calc(var(--r,0deg) + 5deg)) } }

        .lg-hero-target { transition: transform .2s ease; }
        @media (hover: hover) { .lg-hero-target:hover { transform: scale(1.04); } }

        /* Animaciones decorativas solo si el usuario no pide reducir movimiento */
        @media (prefers-reduced-motion: no-preference) {
          .lg-anim-bob     { animation: lg-bobby 1.3s ease-in-out infinite; }
          .lg-anim-spin    { animation: lg-spin 16s linear infinite; }
          .lg-anim-twinkle { animation: lg-twinkle 3s ease-in-out infinite; }
          .lg-anim-popin   { animation: lg-popin .3s ease-out; }
          .lg-anim-crawl   { animation: lg-crawl 2.6s ease-in-out infinite; }
        }

        /* Ajustes solo de móvil: menos fotos, encuadernación más fina y línea roja
           pegada al margen (como el mockup de Claude Design). */
        @media (max-width: 640px) {
          .lg-hide-mobile { display: none; }
          .lg-page {
            background-image:
              linear-gradient(90deg, transparent 0, transparent 24px, rgba(246,140,160,.55) 24px, rgba(246,140,160,.55) 27px, transparent 27px),
              repeating-linear-gradient(180deg, #fdf9ec 0, #fdf9ec 33px, #d2e6f0 33px, #d2e6f0 34px);
          }
          /* Menos anillas y menos cuentas: la fila no abarca todo el ancho. */
          .lg-rings .lg-ring:nth-child(n+10) { display: none; }
          .lg-bead-row .lg-bead:nth-child(n+15) { display: none; }
        }
      `}</style>

      <div className="lg-page">

        {/* Espiral de cuaderno */}
        <div className="lg-rings">
          {Array.from({ length: 16 }, (_, i) => <span key={i} className="lg-ring" />)}
        </div>

        {/* ── PORTADA ── */}
        <section className="lg-section" style={{ maxWidth: 920, padding: "clamp(22px,6vw,56px) clamp(20px,5vw,44px) clamp(8px,3vw,24px)" }}>
          {/* sol decorativo */}
          <div className="lg-anim-spin" style={{ position: "absolute", top: "6%", right: "6%", width: "clamp(54px,12vw,86px)", pointerEvents: "none" }}>
            <svg viewBox="0 0 100 100" style={{ width: "100%", overflow: "visible" }}>
              <g stroke="#ffae00" strokeWidth={7} strokeLinecap="round">
                <line x1="50" y1="4" x2="50" y2="18" /><line x1="50" y1="82" x2="50" y2="96" />
                <line x1="4" y1="50" x2="18" y2="50" /><line x1="82" y1="50" x2="96" y2="50" />
                <line x1="17" y1="17" x2="27" y2="27" /><line x1="73" y1="73" x2="83" y2="83" />
                <line x1="83" y1="17" x2="73" y2="27" /><line x1="27" y1="73" x2="17" y2="83" />
              </g>
              <circle cx="50" cy="50" r="22" fill="#ffd23f" stroke="#ffae00" strokeWidth={5} />
            </svg>
          </div>
          <div className="lg-marker" style={{ color: "#ff5ca8", fontSize: "clamp(14px,3.6vw,20px)", transform: "rotate(-3deg)", margin: "0 0 6px 4px" }}>
            el cuaderno de las lagartijas de…
          </div>

          <h1 className="lg-display" style={{ fontWeight: 800, fontSize: "clamp(46px,14vw,128px)", lineHeight: 0.9, margin: 0, letterSpacing: "-1.5px", textWrap: "balance" }}>
            <span style={{ display: "inline-block", transform: "rotate(-2deg)" }}>¡Hola!</span><br />
            <span style={{ color: "#29c2c9", display: "inline-block", transform: "rotate(1deg)" }}>Soy Lucas</span><br />
            <span style={{ color: "#ff8a3d", display: "inline-block", transform: "rotate(-2deg)" }}>y hago lagartijas</span>
          </h1>

          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: "clamp(20px,5vw,44px)", marginTop: "clamp(20px,4vw,30px)" }}>
            <div style={{ flex: "1 1 300px", minWidth: 260 }}>
              <p style={{ fontSize: "clamp(19px,4.6vw,27px)", lineHeight: 1.45, margin: 0, maxWidth: 520 }}>
                Tengo <span className="lg-marker" style={{ background: "#ffe14d", padding: "0 8px", borderRadius: 7, display: "inline-block", transform: "rotate(-1.5deg)" }}>{edad} años</span> y las hago a mano, una a una, con cuentas de colores. <strong style={{ color: "#ff5ca8" }}>Ninguna es igual a otra.</strong> Algunas llevan anilla para usarlas de llavero.
              </p>

              <div
                onClick={() => setHeroOpen((v) => !v)}
                className="lg-hero-target"
                style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 26, cursor: "pointer", width: "fit-content" }}
              >
                <div style={{ width: "clamp(86px,20vw,120px)", position: "relative" }}>
                  <Lizard color="#7bd13a" width="100%" tongue={heroOpen} />
                  {heroOpen && (
                    <div className="lg-marker lg-anim-popin" style={{ position: "absolute", top: -30, right: -58, background: "#fff", border: "3px solid #2b2b2b", borderRadius: "18px 18px 18px 4px", padding: "5px 13px", fontSize: 20, color: "#ff3b5c", whiteSpace: "nowrap" }}>
                      ¡bleeeh!
                    </div>
                  )}
                </div>
                <div className="lg-marker" style={{ fontSize: "clamp(13px,3.4vw,16px)", color: "#9b5de5", transform: "rotate(-4deg)", lineHeight: 1.2 }}>¡tócame<br />la lengua!</div>
              </div>
            </div>

            {/* Polaroid de la favorita */}
            <div style={{ flex: "0 0 auto", position: "relative", margin: "6px auto 0", transform: "rotate(4deg)" }}>
              <div className="lg-marker" style={{ position: "absolute", top: -22, left: -20, color: "#ff5ca8", fontSize: "clamp(15px,4vw,21px)", transform: "rotate(-9deg)", zIndex: 3 }}>¡mi favorita!</div>
              <div className="lg-polaroid" style={{ padding: "13px 13px 0", boxShadow: "0 14px 30px rgba(0,0,0,.2)" }}>
                <div className="lg-washi" style={{ width: 118, background: "rgba(41,194,201,.78)" }} />
                <Image src="/lagartijas/sample-verde-amarilla.webp" alt="Lagartija verde y amarilla, mi favorita" width={316} height={316} className="lg-photo" style={{ width: "clamp(228px,64vw,316px)", height: "clamp(228px,64vw,316px)" }} />
                <div style={{ textAlign: "center", padding: "11px 6px 16px" }}>
                  <div className="lg-display" style={{ fontWeight: 700, fontSize: 22 }}>Verde y amarilla</div>
                  <div style={{ fontSize: 16, color: "#7a7466" }}>con anilla de plata</div>
                </div>
              </div>
            </div>
          </div>

          <div className="lg-marker" style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "center", marginTop: "clamp(20px,5vw,34px)", color: "#29c2c9", fontSize: "clamp(15px,4vw,20px)" }}>
            <span>baja y mira mis lagartijas</span>
            <span className="lg-anim-bob" style={{ display: "inline-block", fontSize: 28 }}>↓</span>
          </div>
        </section>

        <BeadRow />

        {/* ── EL GÉNERO (galería) ── */}
        <section className="lg-section" style={{ maxWidth: 1040, padding: "clamp(14px,3vw,26px) clamp(16px,4vw,40px) clamp(20px,5vw,40px)" }}>
          <div className="lg-anim-crawl" style={{ position: "absolute", top: -6, right: "2%", width: "clamp(58px,13vw,92px)", ["--r" as string]: "24deg", pointerEvents: "none", zIndex: 2 }}>
            <Lizard color="#ff5ca8" width="100%" />
          </div>

          <h2 className="lg-display" style={{ fontWeight: 800, fontSize: "clamp(38px,9vw,72px)", margin: 0, transform: "rotate(-1.5deg)", color: "#9b5de5" }}>Mis lagartijas</h2>
          <p style={{ fontSize: "clamp(18px,4.4vw,24px)", margin: "8px 0 0", maxWidth: 560, color: "#3a3a3a" }}>Estas son las que tengo ahora mismo. Cada una es única: no hay dos iguales, porque las hago de una en una.</p>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "clamp(20px,4.5vw,40px)", justifyContent: "center", marginTop: "clamp(26px,6vw,46px)" }}>
            {LAGARTIJAS.map((liz) => (
              <figure key={liz.src} className={"lg-card" + (liz.ocultarEnMovil ? " lg-hide-mobile" : "")} style={{ transform: `rotate(${liz.giro}deg)` }}>
                <div className="lg-washi" style={{ width: 94, background: liz.cinta }} />
                <Image src={liz.src} alt={liz.nombre} width={244} height={244} className="lg-photo" style={{ height: "clamp(196px,70vw,244px)" }} />
                <figcaption style={{ textAlign: "center", padding: "10px 4px 15px" }}>
                  <div className="lg-display" style={{ fontWeight: 700, fontSize: 20, lineHeight: 1.15 }}>{liz.nombre}</div>
                  <div style={{ fontSize: 16, color: "#7a7466" }}>{liz.nota}</div>
                  <div className="lg-badge" style={{ background: liz.cinta }}>{liz.tipo}</div>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        <BeadRow />

        {/* ── QUÉ PUEDES PEDIR ── */}
        <section className="lg-section" style={{ maxWidth: 960, padding: "clamp(14px,3vw,26px) clamp(20px,5vw,44px) clamp(20px,5vw,40px)" }}>
          <div className="lg-anim-twinkle" style={{ position: "absolute", top: "8%", right: "2%", width: "clamp(26px,6vw,40px)", animationDelay: ".4s", pointerEvents: "none" }}>
            <svg viewBox="0 0 24 24" style={{ width: "100%" }}>
              <path d="M12 2l2.9 6.3 6.9.7-5.1 4.7 1.4 6.8L12 17.8 5.9 21.2 7.3 14.4 2.2 9.7l6.9-.7z" fill="#29c2c9" stroke="#2b2b2b" strokeWidth={1.4} strokeLinejoin="round" />
            </svg>
          </div>

          <h2 className="lg-display" style={{ fontWeight: 800, fontSize: "clamp(38px,9vw,72px)", margin: 0, transform: "rotate(1deg)", color: "#ff8a3d" }}>¿Cómo la quieres?</h2>
          <p style={{ fontSize: "clamp(18px,4.4vw,24px)", margin: "8px 0 0", color: "#3a3a3a" }}>Tú me dices dos cosas y yo te la hago:</p>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "clamp(20px,4.5vw,34px)", marginTop: "clamp(24px,5vw,38px)" }}>
            {/* 1 · El color */}
            <div className="lg-handcard" style={{ borderRadius: "18px 240px 22px 240px/240px 20px 240px 22px", transform: "rotate(-1deg)" }}>
              <div className="lg-display" style={{ fontWeight: 700, fontSize: "clamp(26px,6vw,36px)", color: "#29c2c9" }}>1 · El color</div>
              <p style={{ fontSize: "clamp(17px,4.2vw,22px)", margin: "8px 0 16px", lineHeight: 1.4 }}>Elige el color que más te guste. Yo la hago de ese color con mis cuentas.</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {PALETA.map((c) => <span key={c} className="lg-swatch" style={{ background: c }} />)}
              </div>
            </div>
            {/* 2 · La cola */}
            <div className="lg-handcard" style={{ borderRadius: "240px 20px 240px 22px/22px 240px 20px 240px", transform: "rotate(1.5deg)" }}>
              <div className="lg-display" style={{ fontWeight: 700, fontSize: "clamp(26px,6vw,36px)", color: "#ff5ca8" }}>2 · La cola</div>
              <p style={{ fontSize: "clamp(17px,4.2vw,22px)", margin: "8px 0 16px", lineHeight: 1.4 }}>En la cola te puedo poner tu <strong>nombre</strong>, o abalorios con forma especial:</p>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div className="lg-anim-twinkle" style={{ width: 42 }}>
                  <svg viewBox="0 0 24 24" style={{ width: "100%" }}><path d="M12 21s-7-4.6-9.3-9.1C1 8.6 2.7 5 6.1 5c2 0 3.3 1.1 3.9 2.2C10.6 6.1 11.9 5 13.9 5c3.4 0 5.1 3.6 3.4 6.9C19 16.4 12 21 12 21z" fill="#ff5ca8" stroke="#2b2b2b" strokeWidth={1.4} /></svg>
                </div>
                <div className="lg-anim-twinkle" style={{ width: 42, animationDelay: ".3s" }}>
                  <svg viewBox="0 0 24 24" style={{ width: "100%" }}><path d="M12 2l2.9 6.3 6.9.7-5.1 4.7 1.4 6.8L12 17.8 5.9 21.2 7.3 14.4 2.2 9.7l6.9-.7z" fill="#ffd23f" stroke="#2b2b2b" strokeWidth={1.4} strokeLinejoin="round" /></svg>
                </div>
                <div className="lg-marker" style={{ fontSize: 20, color: "#9b5de5", transform: "rotate(-3deg)" }}>corazón · estrella</div>
              </div>
            </div>
          </div>

          {/* precios */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "clamp(24px,7vw,60px)", justifyContent: "center", alignItems: "flex-start", marginTop: "clamp(34px,7vw,54px)" }}>
            <div style={{ position: "relative", transform: "rotate(-4deg)" }}>
              <div className="lg-pricehole" />
              <div className="lg-pricetag" style={{ background: "#a4e44b", borderRadius: "240px 18px 240px 20px/18px 240px 20px 240px" }}>
                <div style={{ fontSize: 18 }}>la normal</div>
                <div className="lg-marker" style={{ fontSize: "clamp(44px,11vw,62px)", lineHeight: 0.95 }}>2€</div>
              </div>
            </div>
            <div style={{ position: "relative", transform: "rotate(3deg)" }}>
              <div className="lg-pricehole" />
              <div className="lg-pricetag" style={{ background: "#ff5ca8", borderRadius: "18px 240px 20px 240px/240px 18px 240px 20px" }}>
                <div style={{ fontSize: 18 }}>con nombre o forma</div>
                <div className="lg-marker" style={{ fontSize: "clamp(44px,11vw,62px)", lineHeight: 0.95 }}>3€</div>
              </div>
            </div>
          </div>
        </section>

        <BeadRow />

        {/* ── CÓMO SE PIDE ── */}
        <section className="lg-section" style={{ maxWidth: 880, padding: "clamp(14px,3vw,26px) clamp(20px,5vw,44px) clamp(40px,8vw,70px)" }}>
          <div className="lg-anim-crawl" style={{ position: "absolute", bottom: 18, left: "3%", width: "clamp(56px,13vw,88px)", ["--r" as string]: "-18deg", animationDelay: ".5s", pointerEvents: "none" }}>
            <Lizard color="#29c2c9" width="100%" />
          </div>

          <h2 className="lg-display" style={{ fontWeight: 800, fontSize: "clamp(38px,9vw,72px)", margin: 0, transform: "rotate(-1deg)", color: "#4cc3ff" }}>¿Cómo te la pido?</h2>

          <div style={{ position: "relative", marginTop: "clamp(22px,5vw,34px)", background: "#fff", border: "3px solid #2b2b2b", borderRadius: 30, padding: "clamp(22px,5vw,38px)", boxShadow: "6px 6px 0 rgba(43,43,43,.14)", transform: "rotate(.6deg)" }}>
            <div style={{ position: "absolute", bottom: -18, left: 54, width: 0, height: 0, borderLeft: "18px solid transparent", borderTop: "24px solid #2b2b2b" }} />
            <div style={{ position: "absolute", bottom: -13, left: 58, width: 0, height: 0, borderLeft: "13px solid transparent", borderTop: "18px solid #fff" }} />
            <p style={{ fontSize: "clamp(19px,4.8vw,28px)", lineHeight: 1.5, margin: 0 }}>
              No hay carrito, ni botón de comprar, ni nada de eso. Yo las hago a mano cuando me las encargas. <strong style={{ color: "#ff8a3d" }}>Búscame por La Manga en la playa o la piscina</strong> y dime dos cosas: <strong style={{ color: "#29c2c9" }}>de qué color</strong> la quieres y <strong style={{ color: "#ff5ca8" }}>qué le pongo en la cola</strong>. ¡Y yo te la hago! Tardo un poquito, porque van una a una.
            </p>
          </div>

          <div style={{ textAlign: "center", marginTop: "clamp(34px,7vw,52px)" }}>
            <div className="lg-marker" style={{ fontSize: "clamp(20px,5vw,28px)", color: "#9b5de5", transform: "rotate(-2deg)" }}>hecho a mano por Lucas, {edad} años</div>
            <div style={{ fontSize: 16, color: "#7a7466", marginTop: 6 }}>pídemelas en persona · una a una · ninguna igual</div>
            <div style={{ marginTop: 28 }}>
              <Link href="/" style={{ fontSize: 14, color: "#7a7466", textDecoration: "none" }}>pacr.es</Link>
            </div>
          </div>
        </section>

      </div>
    </>
  );
}
