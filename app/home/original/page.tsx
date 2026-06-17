"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import { RECOMENDACIONES, CERTIFICACIONES, PREMIOS } from "@/lib/perfil";

const JOBS = [
  {
    title: "Partner",
    company: "CARPA Financieros · Autónomo",
    period: "ene. 2023 — actualidad",
    description: (
      <p>Invierte en el sector inmobiliario de forma sencilla. Obtén buenas rentabilidades sin preocuparte.</p>
    ),
  },
  {
    title: "Launch Manager / Senior Product Manager",
    company: "Letgo · Jornada completa",
    period: "jun. 2015 — ago. 2023",
    description: (
      <>
        <p>Implementación y gestión de nuevos proyectos estratégicos:</p>
        <p className="job-subsection">Senior Product Manager</p>
        <ul>
          <li>Comunicación y coordinación de diferentes equipos: &ldquo;Growth&rdquo;, &ldquo;Platform&rdquo;, &ldquo;B2B&rdquo;, &ldquo;Search and Discovery&rdquo;</li>
          <li>Conceptualización y desarrollo de nuevas ideas en todas las plataformas (Android, iOS y Web)</li>
          <li>Priorización según valor de negocio y principales KPI</li>
          <li>Definición de especificaciones técnicas en proyectos de alto impacto</li>
          <li>Responsable de los A/B tests: construir los dashboards y dar visibilidad de los resultados</li>
          <li>Definición de los OKR y asegurarse que todos los KPI tienen los valores esperados</li>
        </ul>
        <p className="job-subsection">Expansión internacional</p>
        <ul>
          <li>Gestión inicial del contenido (23 países)</li>
          <li>Implementación del sistema de traducción, contratación de los traductores y coordinación del QA inicial (18 idiomas)</li>
        </ul>
        <p className="job-subsection">Trust and Safety</p>
        <ul>
          <li>Definición e implementación de distintos proyectos y reglas contra el fraude (spam / scam)</li>
        </ul>
        <p className="job-subsection">Reconocimiento de imágenes con IA</p>
        <ul>
          <li>Coordinación de la implantación del sistema</li>
          <li>Regulación de su aprendizaje y estudio de los resultados para el ajuste de los valores óptimos</li>
        </ul>
        <p className="job-subsection">Customer Care</p>
        <ul>
          <li>Contratación y training del equipo freelance de Customer Care (20 personas)</li>
          <li>Implementación del sistema de tickets y programación de los reports y automatismos</li>
        </ul>
      </>
    ),
  },
  {
    title: "Co-founder",
    company: "Makai - Make an impact · Jornada parcial",
    period: "dic. 2018 — dic. 2022",
    description: (
      <p>Una marca optimista y positiva que crea prendas femeninas icónicas con un enfoque práctico para poder llevarlas en cualquier ocasión y ayuda a cambiar la vida de los niños más desfavorecidos, proporcionándoles alimento diario en su escuela. En MAKAI, por cada prenda vendida, se dona lo necesario para alimentar a un niño durante un mes en su escuela combatiendo así el hambre y fomentando la educación de la comunidad.</p>
    ),
  },
  {
    title: "Mentor",
    company: "Fastísimo / IE Business School · Jornada parcial",
    period: "abr. 2015 — may. 2015",
    description: (
      <p>Mentor de Fastísimo en el Area 31 del IE Business School. La App nació con el fin de facilitar la vida a las personas llevándoles lo que quieran, donde y cuando quieran mediante una red de repartidores freelance. Bernardo Hernández se unió al proyecto y Fastísimo pasó a llamarse Ermes basando sus operaciones en Nueva York.</p>
    ),
  },
  {
    title: "Director de Operaciones",
    company: "Nonabox · Jornada completa",
    period: "feb. 2012 — abr. 2015",
    description: (
      <ul>
        <li>Gestión de más de 100.000 envíos realizados en 6 países</li>
        <li>Organización de la estrategia de internacionalización</li>
        <li>Posterior centralización de las operaciones en Madrid</li>
        <li>Planificación de nuevos modelos de negocio como la Tienda Online y la Suscripción de Pañales</li>
        <li>Diseño de cohortes y otras herramientas para el análisis de resultados</li>
        <li>Scrum Master de un equipo de 30 personas con 6 Product Owners</li>
        <li>Negociación con proveedores y operadores logísticos</li>
        <li>Gestión del equipo de Atención al Cliente y Desarrollo de la web</li>
      </ul>
    ),
  },
  {
    title: "Operaciones y Logística",
    company: "GLOSSYBOX · Jornada completa",
    period: "sept. 2011 — ene. 2012",
    description: (
      <ul>
        <li>Gestión de miles de envíos mensuales</li>
        <li>Relación con proveedores y operadores logísticos</li>
        <li>Optimización del sistema logístico on-line y el CRM</li>
        <li>Alineación entre el departamento de operaciones y atención al cliente</li>
      </ul>
    ),
  },
];

const RECS = RECOMENDACIONES;

function JobItem({ job, index }: { job: typeof JOBS[0]; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="job-item reveal"
      style={{ transitionDelay: `${index * 0.08}s`, cursor: "pointer" }}
      onClick={() => setOpen((v) => !v)}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "0.6rem" }}>
          <span className="job-title">{job.title}</span>
          <span style={{
            fontSize: "0.6rem", color: "var(--blue-accent)", opacity: 0.7,
            fontFamily: "var(--font-geist-mono),monospace", flexShrink: 0,
            transition: "transform 0.25s", display: "inline-block",
            transform: open ? "rotate(90deg)" : "rotate(0deg)",
          }}>▶</span>
        </div>
        <p className="job-company">{job.company}</p>
        <div className="job-desc" data-no-physics style={{
          maxHeight: open ? "700px" : "0",
          overflow: "hidden",
          transition: "max-height 0.4s ease, opacity 0.3s ease",
          opacity: open ? 1 : 0,
          marginTop: open ? "0.6rem" : 0,
        }}>
          {job.description}
        </div>
      </div>
      <p className="job-period">{job.period}</p>
    </div>
  );
}

function RecsSlider() {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const next = useCallback(() => setCurrent((c) => (c + 1) % RECS.length), []);
  const prev = useCallback(() => setCurrent((c) => (c - 1 + RECS.length) % RECS.length), []);

  useEffect(() => {
    if (paused) return;
    timerRef.current = setTimeout(next, 4000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [current, paused, next]);

  const rec = RECS[current];

  return (
    <div onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} style={{ position: "relative" }}>
      <div key={current} onClick={next} style={{
        padding: "2rem",
        border: "1px solid rgba(96,165,250,0.15)",
        background: "rgba(239,246,255,0.6)",
        animation: "fadeSlide 0.35s ease",
        minHeight: "320px",
        display: "flex", flexDirection: "column", justifyContent: "space-between",
        borderRadius: "4px",
        cursor: "pointer",
      }}>
        <p style={{
          fontSize: "0.95rem", color: "#374151",
          lineHeight: 1.8, fontStyle: "italic", maxWidth: "60ch",
        }}>
          &ldquo;{rec.quote}&rdquo;
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: "0.9rem", marginTop: "1.5rem" }}>
          <a href={rec.url} target="_blank" rel="noopener noreferrer"
            style={{ flexShrink: 0, display: "block", borderRadius: "50%", overflow: "hidden", width: 44, height: 44, border: "2px solid rgba(96,165,250,0.3)" }}>
            <Image src={rec.photo} alt={rec.author} width={44} height={44} style={{ objectFit: "cover", display: "block" }} />
          </a>
          <div>
            <a href={rec.url} target="_blank" rel="noopener noreferrer"
              className="rec-author"
              style={{ fontSize: "0.85rem", fontWeight: 600, textDecoration: "none" }}
            >
              {rec.author}
            </a>
            <p style={{ fontSize: "0.72rem", color: "#6b7280", marginTop: "0.15rem", fontFamily: "var(--font-geist-mono),monospace" }}>
              {rec.role}
            </p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "1rem" }}>
        <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", maxWidth: "75%" }}>
          {RECS.map((_, i) => (
            <button key={i} onClick={() => setCurrent(i)} aria-label={`Ir a la recomendación ${i + 1}`} style={{
              width: i === current ? "1.4rem" : "0.45rem",
              height: "0.45rem", borderRadius: "2px", border: "none",
              background: i === current ? "var(--blue-accent)" : "rgba(96,165,250,0.25)",
              cursor: "pointer", padding: 0,
              transition: "width 0.3s, background 0.3s",
            }} />
          ))}
        </div>
        <div style={{ display: "flex", gap: "0.4rem" }}>
          {([["←", prev], ["→", next]] as [string, () => void][]).map(([label, fn]) => (
            <button key={label} onClick={fn} className="rec-arrow">{label}</button>
          ))}
        </div>
      </div>

      {!paused && (
        <div style={{ position: "absolute", bottom: "calc(2.1rem)", left: 0, right: 0, height: "1px", background: "rgba(96,165,250,0.1)" }}>
          <div key={`bar-${current}`} style={{
            height: "100%", background: "rgba(96,165,250,0.4)",
            animation: "progress 4s linear", transformOrigin: "left",
          }} />
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const cursorGlowRef = useRef<HTMLDivElement>(null);
  const pressHaloRef = useRef<HTMLDivElement>(null);
  const holdTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdSecsRef = useRef(0);
  const haloRafRef = useRef<number>(0);
  const [transformed, setTransformed] = useState(false);
  const transformedRef = useRef(false);
  const hueRef = useRef(217);
  const chosenHueRef = useRef(217);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (cursorGlowRef.current) {
        cursorGlowRef.current.style.transform = `translate(${e.clientX - 240}px,${e.clientY - 240}px)`;
      }
      if (pressHaloRef.current) {
        pressHaloRef.current.style.left = `${e.clientX}px`;
        pressHaloRef.current.style.top = `${e.clientY}px`;
      }
    };
    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      if (pressHaloRef.current) {
        pressHaloRef.current.style.left = `${touch.clientX}px`;
        pressHaloRef.current.style.top = `${touch.clientY}px`;
      }
      if (holdSecsRef.current > 0) e.preventDefault();
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchmove", handleTouchMove);
    };
  }, []);

  useEffect(() => {
    const startHold = (isMobile = false) => {
      cancelAnimationFrame(haloRafRef.current);
      holdSecsRef.current = 0;
      hueRef.current = 217;
      if (holdTimerRef.current) clearInterval(holdTimerRef.current);
      holdTimerRef.current = setInterval(() => {
        holdSecsRef.current += 0.05;
        const secs = holdSecsRef.current;
        const isBlue = transformedRef.current;
        if (pressHaloRef.current) {
          let progress, size, opacity;
          if (isMobile) {
            // mobile: 1s en mínimo (como desktop), luego crece de 480→1080px
            progress = secs < 1 ? 0 : Math.min((secs - 1) / 3, 1);
            size = 480 + progress * 600;
            opacity = 0.25 + progress * 0.6;
          } else {
            // desktop: 1s de espera, luego crece
            progress = secs < 1 ? 0 : Math.min((secs - 1) / 4, 1);
            size = 80 + progress * 1000;
            opacity = progress * 0.85;
          }
          pressHaloRef.current.style.width = `${size}px`;
          pressHaloRef.current.style.height = `${size}px`;
          pressHaloRef.current.style.opacity = `${opacity}`;
          if (!isBlue && progress >= 1) {
            hueRef.current = (hueRef.current + 1.8) % 360;
            const h = hueRef.current;
            pressHaloRef.current.style.background = `radial-gradient(circle, hsla(${h},90%,60%,0.7) 0%, hsla(${h},90%,60%,0.3) 40%, transparent 70%)`;
          } else {
            const color = isBlue ? "255,255,255" : "59,130,246";
            pressHaloRef.current.style.background = `radial-gradient(circle, rgba(${color},0.7) 0%, rgba(${color},0.3) 40%, transparent 70%)`;
          }
        }
      }, 50);
    };
    const endHold = (secs: number, isMobile = false) => {
      if (holdTimerRef.current) clearInterval(holdTimerRef.current);
      holdSecsRef.current = 0;
      const halo = pressHaloRef.current;
      if (halo) {
        const fromOpacity = parseFloat(halo.style.opacity || "0");
        const fromSize = parseFloat(halo.style.width || "80");
        if (fromOpacity > 0) {
          const duration = isMobile ? 420 : 500;
          const startTime = performance.now();
          cancelAnimationFrame(haloRafRef.current);
          const fade = (now: number) => {
            const t = Math.min((now - startTime) / duration, 1);
            halo.style.opacity = `${fromOpacity * (1 - t)}`;
            if (!isMobile) {
              // desktop: contrae hacia 480px (tamaño del cursor-glow) mientras desaparece
              const targetSize = Math.min(fromSize, 480);
              halo.style.width = `${fromSize + (targetSize - fromSize) * t}px`;
              halo.style.height = `${fromSize + (targetSize - fromSize) * t}px`;
            }
            if (t < 1) haloRafRef.current = requestAnimationFrame(fade);
            else { halo.style.opacity = "0"; halo.style.width = "80px"; halo.style.height = "80px"; halo.style.left = "-9999px"; halo.style.top = "-9999px"; }
          };
          haloRafRef.current = requestAnimationFrame(fade);
        }
      }
      if (secs >= 5) {
        if (!transformedRef.current) chosenHueRef.current = hueRef.current;
        setTransformed(!transformedRef.current);
      }
    };
    const handleMouseDown = () => startHold();
    const handleMouseUp = () => endHold(holdSecsRef.current, false);
    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      if (pressHaloRef.current) {
        pressHaloRef.current.style.left = `${touch.clientX}px`;
        pressHaloRef.current.style.top = `${touch.clientY}px`;
      }
      startHold(true);
    };
    const handleTouchEnd = () => endHold(holdSecsRef.current, true);
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("touchstart", handleTouchStart);
    window.addEventListener("touchend", handleTouchEnd);
    window.addEventListener("touchcancel", handleTouchEnd);
    return () => {
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("touchcancel", handleTouchEnd);
      if (holdTimerRef.current) clearInterval(holdTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => { entries.forEach((entry) => { if (entry.isIntersecting) entry.target.classList.add("revealed"); }); },
      { threshold: 0.1 }
    );
    document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    transformedRef.current = transformed;
    if (transformed) {
      const h = chosenHueRef.current;
      document.body.style.setProperty("--transform-bg-color", `hsl(${h}, 80%, 42%)`);
      document.body.classList.add("page-transformed");
    } else {
      document.body.style.removeProperty("--transform-bg-color");
      document.body.classList.remove("page-transformed");
    }
  }, [transformed]);

  return (
    <>
      <style>{`
        :root {
          --blue-accent: #3b82f6;
          --blue-light: rgba(96,165,250,0.18);
          --bg: #ffffff;
          --text: #111827;
          --text-muted: #9ca3af;
          --text-dim: #374151;
          --border: rgba(0,0,0,0.07);
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: var(--bg); color: var(--text); font-family: var(--font-geist-sans), sans-serif; }

        .press-halo {
          position: fixed; border-radius: 50%;
          background: radial-gradient(circle, rgba(59,130,246,0.7) 0%, rgba(59,130,246,0.3) 40%, transparent 70%);
          transform: translate(-50%,-50%); pointer-events: none; z-index: 9999;
          width: 80px; height: 80px; opacity: 0; left: -9999px; top: -9999px;
          filter: blur(18px);
        }

        @media (pointer: coarse) {
          .cursor-glow { display: none !important; }
        }

        body.page-transformed {
          background: var(--transform-bg-color, #1e40af) !important;
          transition: background 0.6s ease;
        }
        body.page-transformed * { color: #ffffff !important; border-color: rgba(255,255,255,0.2) !important; }
        body.page-transformed .hero-name span.gradient {
          background: linear-gradient(135deg, #93c5fd 0%, #ffffff 100%) !important;
          -webkit-background-clip: text !important; background-clip: text !important;
        }
        body.page-transformed .cursor-glow { background: radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%) !important; }
        body.page-transformed .skill-tag,
        body.page-transformed .cert-tag {
          background: rgba(255,255,255,0.15) !important;
          border-color: rgba(255,255,255,0.35) !important;
          color: #ffffff !important;
        }

        .cursor-glow {
          position: fixed; width: 480px; height: 480px; border-radius: 50%;
          background: radial-gradient(circle, rgba(96,165,250,0.18) 0%, rgba(96,165,250,0.07) 40%, transparent 70%);
          left: 0; top: 0; transform: translate(-9999px,-9999px);
          pointer-events: none; z-index: 0;
          transition: transform 0.12s ease;
        }

        .reveal { opacity: 0; transform: translateY(24px); transition: opacity 0.6s ease, transform 0.6s ease; }
        .reveal.revealed { opacity: 1; transform: translateY(0); }
        .reveal-delay-1 { transition-delay: 0.1s; }
        .reveal-delay-2 { transition-delay: 0.2s; }
        .reveal-delay-3 { transition-delay: 0.3s; }
        .reveal-delay-4 { transition-delay: 0.4s; }

        .hero-name {
          font-size: clamp(3rem, 9vw, 7.5rem);
          font-weight: 800; line-height: 0.95; letter-spacing: -0.03em; color: var(--text);
        }
        .hero-name span.gradient {
          display: block;
          background: linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #93c5fd 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }
        .hero-name span.plain { display: block; color: var(--text); }

        .section-label {
          font-size: 0.62rem; font-weight: 600; letter-spacing: 0.2em;
          text-transform: uppercase; color: var(--blue-accent); opacity: 0.8;
          margin-bottom: 2.5rem; font-family: var(--font-geist-mono), monospace;
        }
        .divider { border: none; border-top: 1px solid var(--border); margin: 0 auto; max-width: 900px; }

        .job-item {
          display: flex; justify-content: space-between; gap: 2rem;
          padding: 1.5rem 0; border-bottom: 1px solid var(--border);
          transition: border-color 0.25s;
        }
        .job-item:last-child { border-bottom: none; }
        .job-item:active { border-color: rgba(96,165,250,0.3); }
        @media (hover: hover) { .job-item:hover { border-color: rgba(96,165,250,0.3); } }

        .job-title {
          font-size: 1rem; font-weight: 600; color: var(--text);
          position: relative; display: inline-block;
        }
        .job-title::after {
          content: ""; position: absolute; bottom: -2px; left: 0;
          width: 0; height: 1px; background: var(--blue-accent); transition: width 0.35s ease;
        }
        .job-item:active .job-title::after { width: 100%; }
        @media (hover: hover) { .job-item:hover .job-title::after { width: 100%; } }

        .job-company {
          font-size: 0.78rem; color: var(--text-muted); margin-top: 0.2rem;
          font-family: var(--font-geist-mono), monospace; letter-spacing: 0.03em;
        }
        .job-desc { font-size: 0.875rem; color: var(--text-dim); line-height: 1.7; max-width: 55ch; }
        .job-desc p { margin-bottom: 0.3rem; }
        .job-desc ul { list-style: none; padding: 0; margin: 0; }
        .job-desc ul li { padding-left: 1.2em; position: relative; margin-bottom: 0.3rem; }
        .job-desc ul li::before { content: "–"; position: absolute; left: 0; color: var(--blue-accent); opacity: 0.6; }
        .job-desc .job-subsection {
          margin-top: 0.8rem; margin-bottom: 0.3rem; font-size: 0.75rem; font-weight: 600;
          color: var(--blue-accent); letter-spacing: 0.06em; text-transform: uppercase;
          font-family: var(--font-geist-mono), monospace;
        }
        .job-period {
          font-size: 0.72rem; color: var(--text-muted); white-space: nowrap;
          font-family: var(--font-geist-mono), monospace; padding-top: 0.25rem; flex-shrink: 0;
        }
        @media (max-width: 600px) {
          .job-item { flex-direction: column; gap: 0.3rem; }
          .job-period { padding-top: 0; order: -1; }
        }

        .cert-tag {
          display: inline-block; font-size: 0.74rem; color: var(--text-dim);
          border: 1px solid rgba(96,165,250,0.25); padding: 0.35rem 0.8rem;
          border-radius: 3px; font-family: var(--font-geist-mono), monospace;
          letter-spacing: 0.02em; transition: border-color 0.2s, color 0.2s, background 0.2s; cursor: default;
        }
        .cert-tag:active { border-color: var(--blue-accent); color: var(--blue-accent); background: rgba(96,165,250,0.05); }
        @media (hover: hover) { .cert-tag:hover { border-color: var(--blue-accent); color: var(--blue-accent); background: rgba(96,165,250,0.05); } }

        .skill-tag {
          display: inline-block; font-size: 0.72rem; color: var(--text-muted);
          border: 1px solid rgba(0,0,0,0.08); padding: 0.3rem 0.7rem;
          border-radius: 3px; font-family: var(--font-geist-mono), monospace;
          letter-spacing: 0.02em; background: #f9fafb;
          transition: border-color 0.2s, color 0.2s, background 0.2s; cursor: default;
        }
        .skill-tag:active { border-color: rgba(96,165,250,0.4); color: var(--blue-accent); background: rgba(96,165,250,0.05); }
        @media (hover: hover) { .skill-tag:hover { border-color: rgba(96,165,250,0.4); color: var(--blue-accent); background: rgba(96,165,250,0.05); } }
        .skill-tag.skill-shine {
          text-decoration: none;
          position: relative;
          overflow: hidden;
          cursor: pointer;
        }
        .skill-tag.skill-shine::after {
          content: "";
          position: absolute;
          top: -50%; left: -75%;
          width: 50%; height: 200%;
          background: linear-gradient(120deg, transparent 0%, rgba(59,130,246,0.1) 40%, rgba(59,130,246,0.45) 50%, rgba(59,130,246,0.1) 60%, transparent 100%);
          transform: skewX(-20deg);
          animation: blueSweep 10s ease-in-out infinite;
        }
        body.page-transformed .skill-tag.skill-shine::after {
          background: linear-gradient(120deg, transparent 0%, rgba(255,255,255,0.1) 40%, rgba(255,255,255,0.45) 50%, rgba(255,255,255,0.1) 60%, transparent 100%);
        }
        @keyframes blueSweep {
          0%, 88%   { left: -75%; opacity: 1; }
          97%       { left: 150%; opacity: 1; }
          98%, 100% { left: 150%; opacity: 0; }
        }

        .lang-row {
          display: flex; justify-content: space-between; align-items: baseline;
          padding: 0.9rem 0; border-bottom: 1px solid var(--border);
        }
        .lang-row:last-child { border-bottom: none; }

        .award-item {
          display: grid; grid-template-columns: 1fr auto; gap: 0 2rem;
          padding: 1.2rem 0; border-bottom: 1px solid var(--border);
        }
        .award-item:last-child { border-bottom: none; }

        .cta-button {
          display: inline-flex; align-items: center; gap: 0.5rem;
          margin-top: 2.5rem; padding: 0.85rem 2rem;
          border: 1.5px solid rgba(59,130,246,0.4); color: var(--blue-accent);
          font-size: 0.85rem; font-weight: 500; letter-spacing: 0.05em;
          text-decoration: none; border-radius: 3px;
          transition: background 0.2s, border-color 0.2s;
          font-family: var(--font-geist-mono), monospace;
        }
        .cta-button:active { background: rgba(96,165,250,0.08); border-color: var(--blue-accent); }
        @media (hover: hover) { .cta-button:hover { background: rgba(96,165,250,0.08); border-color: var(--blue-accent); } }

        .bg-blobs { position: fixed; inset: 0; pointer-events: none; z-index: 0; overflow: hidden; }
        .blob { position: absolute; border-radius: 50%; filter: blur(90px); }

        @keyframes fadeSlide {
          from { opacity: 0; transform: translateX(14px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes progress {
          from { width: 0; }
          to   { width: 100%; }
        }
        /* Base en la clase (no inline) para que :hover/:active ganen sin
           !important. :hover gateado a puntero real; :active da el equivalente
           táctil. */
        .rec-author { color: #1e3a5f; transition: color 0.2s; }
        .rec-arrow {
          background: none; border: 1px solid rgba(96,165,250,0.25); color: #6b7280;
          width: 32px; height: 32px; cursor: pointer; font-size: 0.75rem;
          border-radius: 2px; transition: border-color 0.2s, color 0.2s;
        }
        .footer-ln { color: var(--text-muted); transition: color 0.2s; }
        .rec-author:active, .footer-ln:active { color: var(--blue-accent); }
        .rec-arrow:active { border-color: var(--blue-accent); color: var(--blue-accent); }
        @media (hover: hover) {
          .rec-author:hover { color: var(--blue-accent); }
          .rec-arrow:hover { border-color: var(--blue-accent); color: var(--blue-accent); }
          .footer-ln:hover { color: var(--blue-accent); }
        }
      `}</style>

      <div ref={cursorGlowRef} className="cursor-glow" />
      <div ref={pressHaloRef} className="press-halo" />
      <div className="bg-blobs">
        <div className="blob" style={{width:"55vw",height:"45vh",top:"-10%",right:"-10%",background:"radial-gradient(ellipse, rgba(96,165,250,0.07) 0%, transparent 70%)"}} />
        <div className="blob" style={{width:"40vw",height:"40vh",bottom:"5%",left:"-5%",background:"radial-gradient(ellipse, rgba(147,197,253,0.06) 0%, transparent 70%)"}} />
      </div>

      <main style={{position:"relative",zIndex:1,maxWidth:"900px",margin:"0 auto",padding:"0 2rem"}}>

        {/* Hero */}
        <section style={{paddingTop:"clamp(5rem,12vh,9rem)",paddingBottom:"clamp(4rem,10vh,7rem)"}}>
          <h1 className="hero-name reveal reveal-delay-1">
            <span className="gradient">Pablo</span>
            <span className="plain">Crespo</span>
            <span className="plain">Velasco</span>
          </h1>
          <p className="reveal reveal-delay-2" style={{marginTop:"1.8rem",fontSize:"0.88rem",color:"var(--text-muted)",fontFamily:"var(--font-geist-mono),monospace",letterSpacing:"0.05em"}}>
            Director de Operaciones · Senior Product Manager · Troubleshooter
          </p>
          <p data-no-physics className="reveal reveal-delay-3" style={{marginTop:"1.5rem",maxWidth:"52ch",fontSize:"1rem",lineHeight:"1.8",color:"var(--text-dim)"}}>
            Ingeniero Industrial con curiosidad por el funcionamiento de todo y gran capacidad para comprender y resolver cualquier problema que se presente. Siempre con una sonrisa, los grandes retos me hacen feliz: organizar el caos, solucionar lo imposible, gestionar lo inmanejable.
          </p>
          <div className="reveal reveal-delay-4">
            <a href="mailto:crespovelasco@gmail.com" className="cta-button">Contactar →</a>
          </div>
        </section>

        <hr className="divider" />

        {/* Experiencia */}
        <section style={{padding:"5rem 0"}}>
          <p className="reveal section-label">Experiencia</p>
          {JOBS.map((job, i) => <JobItem key={job.title} job={job} index={i} />)}
        </section>

        <hr className="divider" />

        {/* Educación */}
        <section style={{padding:"5rem 0"}}>
          <p className="reveal section-label">Educación</p>
          <div className="reveal reveal-delay-1" style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",gap:"2rem"}}>
            <div>
              <p style={{fontWeight:600,fontSize:"1rem"}}>Ingeniería Industrial</p>
              <p style={{fontSize:"0.78rem",color:"var(--text-muted)",marginTop:"0.25rem",fontFamily:"var(--font-geist-mono),monospace"}}>Universidad Pontificia Comillas ICAI-ICADE</p>
            </div>
            <p style={{fontSize:"0.72rem",color:"var(--text-muted)",fontFamily:"var(--font-geist-mono),monospace",whiteSpace:"nowrap"}}>2004 – 2012</p>
          </div>
        </section>

        <hr className="divider" />

        {/* Recomendaciones */}
        <section style={{padding:"5rem 0"}}>
          <p className="reveal section-label">Recomendaciones</p>
          <div data-no-physics className="reveal reveal-delay-1">
            <RecsSlider />
          </div>
        </section>

        <hr className="divider" />

        {/* Certificaciones */}
        <section style={{padding:"5rem 0"}}>
          <p className="reveal section-label">Certificaciones</p>
          <div className="reveal reveal-delay-1" style={{display:"flex",flexWrap:"wrap",gap:"0.6rem"}}>
            {CERTIFICACIONES.map((cert) => (
              <span key={cert.label} className="cert-tag" title={`${cert.issuer} · ${cert.year}`}>{cert.label}</span>
            ))}
          </div>
        </section>

        <hr className="divider" />

        {/* Idiomas */}
        <section style={{padding:"5rem 0"}}>
          <p className="reveal section-label">Idiomas</p>
          <div className="reveal reveal-delay-1">
            {PREMIOS.map((award) => (
              <div key={award.title} className="award-item">
                <div>
                  <p style={{fontWeight:600,fontSize:"0.95rem"}}>{award.title}</p>
                  {(award.issuer || award.note) && (
                    <p style={{fontSize:"0.75rem",color:"var(--text-muted)",marginTop:"0.2rem",fontFamily:"var(--font-geist-mono),monospace"}}>
                      {[award.issuer, award.note].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>
                <p style={{fontSize:"0.72rem",color:"var(--text-muted)",fontFamily:"var(--font-geist-mono),monospace",whiteSpace:"nowrap",paddingTop:"0.2rem"}}>{award.date}</p>
              </div>
            ))}
          </div>
        </section>

        <hr className="divider" />

        {/* Aptitudes */}
        <section style={{padding:"5rem 0"}}>
          <p className="reveal section-label">Aptitudes</p>
          <div className="reveal reveal-delay-1" style={{display:"flex",flexWrap:"wrap",gap:"0.5rem"}}>
            {[
              "Gestión de productos","Gestión de proyectos","Gestión de personas","Gestión de crisis",
              "Liderazgo de equipos","Liderazgo de equipos multidisciplinarios","Habilidades sociales",
              "Comunicación","Toma de decisiones","Mejora continua","Mejora de procesos",
              "Metodologías ágiles","Estrategia empresarial","Estrategia del producto","Estrategia digital",
              "Analítica de datos","Análisis de negocio","Toma de decisiones basadas en datos",
              "Experiencia de usuario","Diseño de la interfaz de usuario","Investigación de mercado",
              "Comportamiento del usuario","Requisitos de productos","Lanzamiento de productos",
              "Para empresas (B2B)","Negociación",
            ].map((skill) => (
              <span key={skill} className="skill-tag">{skill}</span>
            ))}
            <span className="skill-tag">Trabajo en equipo</span>
            <a href="https://pacr.es/designs" className="skill-tag skill-shine">Resolución de problemas</a>
          </div>
        </section>

        <hr className="divider" />

        {/* Footer */}
        <footer style={{padding:"2.5rem 0 4rem",display:"flex",flexDirection:"column",gap:"0.75rem"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",position:"relative"}}>
            <a href="/designs" style={{fontSize:"0.78rem",color:"var(--text-muted)",fontFamily:"var(--font-geist-mono),monospace",textDecoration:"none"}}>
              pacr.es
            </a>
            <a href="https://www.linkedin.com/in/pacres/" target="_blank" rel="noopener noreferrer"
              className="footer-ln"
              style={{fontSize:"0.78rem",fontFamily:"var(--font-geist-mono),monospace",textDecoration:"none"}}
            >LinkedIn →</a>
          </div>
          <p style={{textAlign:"center",fontSize:"0.72rem",color:"var(--text-muted)",fontFamily:"var(--font-geist-mono),monospace",margin:0}}>
            Creado el 30 de abril de 2026
          </p>
        </footer>

      </main>
    </>
  );
}
