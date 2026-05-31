"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import { ChromeBar, MinimizedBar, TabsBar } from "../components/Chrome";
import { RECOMENDACIONES, CERTIFICACIONES, PREMIOS, premioOrg } from "@/lib/perfil";

// ─── Data ─────────────────────────────────────────────────────────────────────

const TIMELINE = [
  {
    id: "carpa", lineId: "L.0100", tPlus: "+19y",
    span: "2023—…", role: "Partner", company: "CARPA Financieros",
    type: "live", kind: "current",
    summary: "Invierte en el sector inmobiliario de forma sencilla. Obtén buenas rentabilidades sin preocuparte.",
    bullets: [] as string[],
    blocks: [] as { title: string; bullets: string[] }[],
  },
  {
    id: "letgo", lineId: "L.0200", tPlus: "+11y",
    span: "2015–23", role: "Launch Manager / Senior Product Manager", company: "Letgo",
    type: "ft", kind: "fulltime",
    summary: "Implementación y gestión de nuevos proyectos estratégicos en una de las apps de marketplace más grandes de su tiempo.",
    bullets: [] as string[],
    blocks: [
      {
        title: "Senior Product Manager",
        bullets: [
          "Comunicación y coordinación de equipos: Growth, Platform, B2B, Search and Discovery.",
          "Conceptualización y desarrollo de nuevas ideas en todas las plataformas (Android, iOS y Web).",
          "Priorización según valor de negocio y principales KPI.",
          "Definición de especificaciones técnicas en proyectos de alto impacto.",
          "Responsable de los A/B tests: construir dashboards y dar visibilidad de los resultados.",
          "Definición de OKR y verificación de que los KPI alcanzan los valores esperados.",
        ],
      },
      {
        title: "Expansión internacional",
        bullets: [
          "Gestión inicial del contenido en 23 países.",
          "Implementación del sistema de traducción, contratación de traductores y coordinación del QA inicial (18 idiomas).",
        ],
      },
      {
        title: "Trust and Safety",
        bullets: [
          "Definición e implementación de proyectos y reglas contra el fraude (spam / scam).",
        ],
      },
      {
        title: "Reconocimiento de imágenes con IA",
        bullets: [
          "Coordinación de la implantación del sistema.",
          "Regulación del aprendizaje y estudio de resultados para el ajuste de los valores óptimos.",
        ],
      },
      {
        title: "Customer Care",
        bullets: [
          "Contratación y training del equipo freelance de Customer Care (20 personas).",
          "Implementación del sistema de tickets y programación de reports y automatismos.",
        ],
      },
    ],
  },
  {
    id: "makai", lineId: "L.0300", tPlus: "+14y",
    span: "2018–22", role: "Co-founder", company: "Makai — Make an impact",
    type: "side", kind: "side",
    summary: "Marca optimista de prendas femeninas con propósito: por cada prenda vendida, se dona lo necesario para alimentar a un niño durante un mes en su escuela.",
    bullets: [] as string[],
    blocks: [] as { title: string; bullets: string[] }[],
  },
  {
    id: "fastisimo", lineId: "L.0400", tPlus: "+11y",
    span: "2015", role: "Mentor", company: "Fastísimo / IE Business School",
    type: "mentor", kind: "mentor",
    summary: "Mentor de Fastísimo en el Area 31 del IE Business School. La app, después renombrada Ermes con Bernardo Hernández, opera en Nueva York.",
    bullets: [] as string[],
    blocks: [] as { title: string; bullets: string[] }[],
  },
  {
    id: "nonabox", lineId: "L.0500", tPlus: "+08y",
    span: "2012–15", role: "Director de Operaciones", company: "Nonabox",
    type: "ft", kind: "fulltime",
    summary: "Suscripción de cajas para bebés. De cero a operación internacional.",
    bullets: [
      "Gestión de más de 100.000 envíos realizados en 6 países.",
      "Organización de la estrategia de internacionalización y posterior centralización de operaciones en Madrid.",
      "Planificación de nuevos modelos: Tienda Online y Suscripción de Pañales.",
      "Diseño de cohortes y herramientas para el análisis de resultados.",
      "Scrum Master de un equipo de 30 personas con 6 Product Owners.",
      "Negociación con proveedores y operadores logísticos.",
      "Gestión del equipo de Atención al Cliente y desarrollo de la web.",
    ],
    blocks: [] as { title: string; bullets: string[] }[],
  },
  {
    id: "glossybox", lineId: "L.0600", tPlus: "+07y",
    span: "2011–12", role: "Operaciones y Logística", company: "GLOSSYBOX",
    type: "ft", kind: "fulltime",
    summary: "Las primeras manos en cajas, proveedores y CRM.",
    bullets: [
      "Gestión de miles de envíos mensuales.",
      "Relación con proveedores y operadores logísticos.",
      "Optimización del sistema logístico on-line y el CRM.",
      "Alineación entre operaciones y atención al cliente.",
    ],
    blocks: [] as { title: string; bullets: string[] }[],
  },
  {
    id: "icai", lineId: "L.0700", tPlus: "+00y",
    span: "2004–12", role: "Ingeniería Industrial", company: "Univ. Pontificia Comillas — ICAI",
    type: "edu", kind: "edu",
    summary: "La caja de herramientas. Sistemas, procesos, decisiones bajo incertidumbre.",
    bullets: [] as string[],
    blocks: [] as { title: string; bullets: string[] }[],
  },
];

const RECOS = RECOMENDACIONES.map((r) => ({ ...r, title: r.role }));

const CERTS = CERTIFICACIONES.map((c) => c.label);

const LANGUAGES = [
  { lang: "Español", level: "nativa", dots: 5 },
  { lang: "Inglés", level: "bilingüe", dots: 5 },
  { lang: "Francés", level: "profesional", dots: 3 },
  { lang: "Lengua de signos", level: "básica", dots: 2 },
];

const AWARDS = PREMIOS.map((p) => ({ title: p.title, org: premioOrg(p), date: p.date }));

const SKILLS = [
  "gestión de productos", "gestión de proyectos", "gestión de personas", "gestión de crisis",
  "liderazgo de equipos", "liderazgo multidisciplinario", "habilidades sociales",
  "comunicación", "toma de decisiones", "mejora continua", "mejora de procesos",
  "metodologías ágiles", "estrategia empresarial", "estrategia del producto", "estrategia digital",
  "analítica de datos", "análisis de negocio", "decisiones basadas en datos",
  "experiencia de usuario", "diseño de interfaz", "investigación de mercado",
  "comportamiento del usuario", "requisitos de productos", "lanzamiento de productos",
  "b2b", "negociación", "trabajo en equipo", "resolución de problemas",
];

// ─── Subcomponents ────────────────────────────────────────────────────────────

function useInView(delay = 180) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let timer: ReturnType<typeof setTimeout>;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        timer = setTimeout(() => { setInView(true); io.disconnect(); }, delay);
      }
    }, { threshold: 0.2, rootMargin: "0px 0px -80px 0px" });
    io.observe(el);
    return () => { io.disconnect(); clearTimeout(timer); };
  }, [delay]);
  return { ref, inView };
}

function Pill({ type }: { type: string }) {
  const isLive = type === "live";
  return (
    <span style={{
      display: "inline-block",
      fontSize: 10,
      fontFamily: "var(--t-mono)",
      textTransform: "uppercase",
      letterSpacing: "0.05em",
      padding: "2px 8px",
      borderRadius: 999,
      border: `1px solid ${isLive ? "color-mix(in srgb, var(--t-accent) 35%, transparent)" : "var(--t-rule)"}`,
      background: isLive ? "color-mix(in srgb, var(--t-accent) 12%, var(--t-paper))" : "var(--t-paper)",
      color: isLive ? "var(--t-accent2)" : "var(--t-ink3)",
    }}>
      {type}
    </span>
  );
}

// El cromo de ventana (WinIcon, WindowBtn, ChromeBar, MinimizedBar, TabsBar)
// vive ahora en components/Chrome.tsx, compartido con lab y designs (I5).

function PromptRow({ n, cmd, highlight = false, active = false }: { n: string; cmd: string; highlight?: boolean; active?: boolean }) {
  const [displayed, setDisplayed] = useState("");
  const [execMs, setExecMs] = useState<number | null>(null);

  useEffect(() => {
    if (!active) return;
    let i = 0;
    const t = setTimeout(() => {
      const iv = setInterval(() => {
        i++;
        setDisplayed(cmd.slice(0, i));
        if (i >= cmd.length) {
          clearInterval(iv);
          const ms = cmd.length * 3 + Math.floor(Math.random() * 31) - 15;
          setTimeout(() => setExecMs(ms), 90);
        }
      }, 26);
      return () => clearInterval(iv);
    }, 120);
    return () => clearTimeout(t);
  }, [active, cmd]);

  const done = displayed.length >= cmd.length;

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "44px 1fr auto",
      gap: "0 12px",
      padding: "18px 28px 8px",
      alignItems: "baseline",
    }} className="t-prompt">
      <span style={{ fontFamily: "var(--t-mono)", fontSize: 11, color: "var(--t-ink4)" }} className="t-prompt-num">
        {n}
      </span>
      <span style={{ fontFamily: "var(--t-mono)", fontSize: 13.5 }} className="t-prompt-cmd">
        <span style={{ color: "var(--t-accent2)" }}>pacres</span>
        <span style={{ color: "var(--t-ink3)" }}>@resume</span>
        <span style={{ color: "var(--t-ink2)" }}>:~/cv</span>
        <span style={{ color: "var(--t-ink3)" }}>$ </span>
        {highlight ? (
          <>
            <span style={{ background: "var(--t-accent)", color: "white", borderRadius: 2, padding: "0 4px" }}>{displayed}</span>
            {done && <span style={{ color: "var(--t-accent)", animation: "t-blink 1s steps(1) infinite", marginLeft: 2 }}>▍</span>}
          </>
        ) : (
          <span style={{ color: "var(--t-ink)" }}>{displayed}</span>
        )}
      </span>
      <span style={{ fontFamily: "var(--t-mono)", fontSize: 10, color: "var(--t-ink3)", visibility: execMs !== null ? "visible" : "hidden" }}>
        ↳ {execMs ?? 0}ms
      </span>
    </div>
  );
}

function WhoamiSection() {
  return (
    <>
      {/* Mobile avatar */}
      <div className="t-avatar-mobile" style={{ marginBottom: 16 }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", overflow: "hidden", border: "1px solid var(--t-rule)" }}>
          <Image src="/pablo.png" alt="Pablo Crespo" width={64} height={64} style={{ objectFit: "cover", display: "block" }} />
        </div>
      </div>

      <div style={{ display: "flex", gap: 36, alignItems: "flex-start" }} className="t-whoami-row">
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{
            fontFamily: "var(--t-serif)",
            fontSize: "clamp(44px, 7vw, 72px)",
            lineHeight: 0.95,
            letterSpacing: "-0.015em",
            fontWeight: 400,
            color: "var(--t-ink)",
            margin: 0,
          }}>
            Pablo Crespo Velasco
            <span style={{ color: "var(--t-accent)", animation: "t-blink 1s steps(1) infinite" }}>_</span>
          </h1>

          <div style={{ marginTop: 20, fontFamily: "var(--t-mono)", fontSize: 13, color: "var(--t-ink)" }}>
            <span style={{ color: "var(--t-accent2)" }}>→ roles: </span>
            <span style={{ color: "var(--t-ink2)" }}>[</span>
            {["Director de Operaciones", "Senior Product Manager", "Troubleshooter"].map((r, i, arr) => (
              <span key={r}>&ldquo;{r}&rdquo;{i < arr.length - 1 ? ", " : ""}</span>
            ))}
            <span style={{ color: "var(--t-ink2)" }}>]</span>
          </div>

          <div style={{ marginTop: 10, fontFamily: "var(--t-mono)", fontSize: 13, display: "flex", flexWrap: "wrap", gap: "0 8px", alignItems: "center", color: "var(--t-ink3)" }}>
            <span style={{ color: "var(--t-accent2)" }}>→ </span>
            <span>est: <span style={{ color: "var(--t-ink)" }}>1986</span></span>
            <span style={{ color: "var(--t-ink4)" }}>·</span>
            <span>loc: <span style={{ color: "var(--t-ink)" }}>madrid</span></span>
            <span style={{ color: "var(--t-ink4)" }}>·</span>
            <span>status: <span style={{ background: "var(--t-accent)", color: "white", borderRadius: 999, padding: "1px 9px", fontSize: 11 }}>● available</span></span>
          </div>

          <p style={{
            marginTop: 20,
            fontFamily: "var(--t-sans)",
            fontSize: 16,
            lineHeight: 1.6,
            color: "var(--t-ink2)",
            maxWidth: 760,
          }}>
            Ingeniero Industrial con curiosidad por el funcionamiento de todo y gran capacidad para comprender y resolver cualquier problema que se presente.{" "}
            Siempre con una sonrisa, los grandes retos me hacen feliz: organizar el caos, solucionar lo imposible, gestionar lo inmanejable.
          </p>
        </div>

        {/* Desktop avatar */}
        <div className="t-avatar-desktop" style={{ flexShrink: 0 }}>
          <div style={{ width: 220, height: 220, border: "1px solid var(--t-rule)", borderRadius: 8, overflow: "hidden" }}>
            <Image src="/pablo.png" alt="Pablo Crespo" width={220} height={220} style={{ objectFit: "cover", display: "block", width: "100%", height: "100%" }} />
          </div>
        </div>
      </div>
    </>
  );
}

function TimelineDesktop({ expandedId, onToggle, active = false }: {
  expandedId: string | null;
  onToggle: (id: string | null, el: HTMLElement) => void;
  active?: boolean;
}) {
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    if (!active) return;
    const timers = TIMELINE.map((_, idx) =>
      setTimeout(() => setVisibleCount(idx + 1), idx * 70)
    );
    return () => timers.forEach(clearTimeout);
  }, [active]);

  return (
    <div className="t-tl-desktop" style={{ border: "1px solid var(--t-rule)", borderRadius: 10, overflow: "hidden" }}>
      <div style={{
        display: "grid",
        gridTemplateColumns: "70px 60px 76px 1fr 1fr 96px 24px",
        gap: "0 16px",
        padding: "10px 18px",
        background: "var(--t-paper2)",
        borderBottom: "1px dashed var(--t-rule)",
        fontFamily: "var(--t-mono)",
        fontSize: 10,
        color: "var(--t-ink3)",
        textTransform: "uppercase",
        letterSpacing: "0.05em",
      }}>
        <span>id</span><span>t+</span><span>type</span><span>role</span><span>@ company</span>
        <span style={{ textAlign: "right" }}>span</span><span />
      </div>

      {TIMELINE.map((row, idx) => {
        const revealed = idx < visibleCount;
        const hasContent = row.id === "letgo" || row.bullets.length > 0;
        const isCurrent = row.kind === "current";
        const isExpanded = expandedId === row.id;

        return (
          <div key={row.id} className={revealed ? "t-row-in" : undefined} style={{ visibility: revealed ? undefined : "hidden" }}>
            <div
              onClick={hasContent ? (e) => onToggle(isExpanded ? null : row.id, e.currentTarget) : undefined}
              style={{
                display: "grid",
                gridTemplateColumns: "70px 60px 76px 1fr 1fr 96px 24px",
                gap: "0 16px",
                padding: "10px 18px",
                borderTop: idx === 0 ? "none" : "1px dashed var(--t-rule)",
                background: isExpanded ? "var(--t-paper2)" : isCurrent ? "var(--t-accent-bg)" : "transparent",
                cursor: hasContent ? "pointer" : "default",
                alignItems: "center",
                transition: "background 0.15s",
              }}
            >
              <span style={{ fontFamily: "var(--t-mono)", fontSize: 12, color: "var(--t-ink3)" }}>{row.lineId}</span>
              <span style={{ fontFamily: "var(--t-mono)", fontSize: 12, color: "var(--t-accent2)" }}>{row.tPlus}</span>
              <span><Pill type={row.type} /></span>
              <span style={{ fontFamily: "var(--t-sans)", fontSize: 14, fontWeight: 500, color: "var(--t-ink)" }}>{row.role}</span>
              <span style={{ fontFamily: "var(--t-sans)", fontSize: 14, color: "var(--t-ink2)" }}>
                <span style={{ color: "var(--t-accent2)", fontFamily: "var(--t-mono)" }}>@</span> {row.company}
              </span>
              <span style={{ fontFamily: "var(--t-mono)", fontSize: 12, color: "var(--t-ink3)", textAlign: "right" }}>{row.span}</span>
              <span style={{
                fontFamily: "var(--t-mono)", fontSize: 11,
                color: hasContent ? "var(--t-accent2)" : "transparent",
                display: "block", textAlign: "center",
                transition: "transform 0.2s",
                transform: isExpanded ? "rotate(90deg)" : "none",
              }}>▸</span>
            </div>

            {isExpanded && (
              <div className="t-slide-down" style={{
                borderTop: "1px dashed var(--t-rule)",
                padding: "16px 24px 20px",
                background: "var(--t-paper2)",
              }}>
                <div style={{ fontFamily: "var(--t-mono)", fontSize: 11, color: "var(--t-ink3)", marginBottom: 12 }}>
                  ↳ pacres@resume:~/cv${" "}
                  <span style={{ color: "var(--t-accent2)" }}>cv timeline --expand {row.id}</span>
                </div>
                <div style={{
                  border: "1px solid var(--t-accent)",
                  borderLeft: "3px solid var(--t-accent)",
                  borderRadius: 8,
                  background: "color-mix(in oklab, var(--t-accent-soft) 60%, var(--t-paper))",
                  padding: "20px 24px",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10, gap: 16 }}>
                    <h3 style={{ fontFamily: "var(--t-serif)", fontSize: 28, fontWeight: 400, color: "var(--t-ink)", margin: 0, lineHeight: 1.1 }}>
                      {row.role}{" "}
                      <span style={{ color: "var(--t-accent2)", fontFamily: "var(--t-mono)", fontSize: 22 }}>@</span>{" "}
                      <em>{row.company.split(" —")[0]}</em>
                    </h3>
                    <span style={{ fontFamily: "var(--t-mono)", fontSize: 11, color: "var(--t-ink3)", flexShrink: 0, paddingTop: 6 }}>
                      {row.span} · {row.type} · {row.lineId}
                    </span>
                  </div>
                  {row.summary && (
                    <p style={{ fontFamily: "var(--t-sans)", fontSize: 14.5, color: "var(--t-ink2)", lineHeight: 1.55, marginBottom: 16 }}>
                      {row.summary}
                    </p>
                  )}
                  {row.blocks.length > 0 && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", border: "1px solid var(--t-rule)", background: "var(--t-paper)", borderRadius: 6, overflow: "hidden" }}>
                      {row.blocks.map((block, bi) => {
                        const isRight = bi % 2 === 1;
                        const totalRows = Math.ceil(row.blocks.length / 2);
                        const currentRow = Math.floor(bi / 2);
                        const isLastRow = currentRow === totalRows - 1;
                        return (
                          <div key={block.title} style={{
                            padding: 16,
                            borderRight: !isRight ? "1px solid var(--t-rule)" : "none",
                            borderBottom: !isLastRow ? "1px solid var(--t-rule)" : "none",
                          }}>
                            <div style={{ fontFamily: "var(--t-mono)", fontSize: 10, color: "var(--t-accent2)", marginBottom: 4 }}>
                              $ {block.title.toLowerCase().replace(/\s+/g, "-")}
                            </div>
                            <div style={{ fontFamily: "var(--t-sans)", fontSize: 13, fontWeight: 500, color: "var(--t-ink)", marginBottom: 6 }}>
                              {block.title}
                            </div>
                            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                              {block.bullets.slice(0, 3).map((b, i) => (
                                <li key={i} style={{ fontFamily: "var(--t-sans)", fontSize: 12.5, color: "var(--t-ink2)", marginBottom: 3, paddingLeft: 14, position: "relative" }}>
                                  <span style={{ position: "absolute", left: 0, color: "var(--t-accent2)", fontFamily: "var(--t-mono)" }}>›</span>
                                  {b}
                                </li>
                              ))}
                              {block.bullets.length > 3 && (
                                <li style={{ fontFamily: "var(--t-mono)", fontSize: 11, color: "var(--t-ink4)", marginTop: 2 }}>
                                  … +{block.bullets.length - 3} more
                                </li>
                              )}
                            </ul>
                          </div>
                        );
                      })}
                      {row.blocks.length % 2 === 1 && <div />}
                    </div>
                  )}
                  {row.bullets.length > 0 && row.blocks.length === 0 && (
                    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                      {row.bullets.map((b, i) => (
                        <li key={i} style={{ fontFamily: "var(--t-sans)", fontSize: 13.5, color: "var(--t-ink2)", marginBottom: 6, paddingLeft: 18, position: "relative", lineHeight: 1.5 }}>
                          <span style={{ position: "absolute", left: 0, color: "var(--t-accent2)", fontFamily: "var(--t-mono)" }}>›</span>
                          {b}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {!expandedId && visibleCount >= TIMELINE.length && (
        <div style={{ padding: "10px 18px", borderTop: "1px dashed var(--t-rule)", fontFamily: "var(--t-mono)", fontSize: 11, color: "var(--t-ink3)" }}>
          ↳ tip: click any row to expand details
        </div>
      )}
    </div>
  );
}

function TimelineMobile({ expandedRow, toggleExpanded, active = false }: {
  expandedRow: string | null;
  toggleExpanded: (id: string, el?: HTMLElement) => void;
  active?: boolean;
}) {
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    if (!active) return;
    const timers = TIMELINE.map((_, idx) =>
      setTimeout(() => setVisibleCount(idx + 1), idx * 70)
    );
    return () => timers.forEach(clearTimeout);
  }, [active]);

  return (
    <div className="t-tl-mobile" style={{ flexDirection: "column", gap: 8 }}>
      {TIMELINE.map((row, idx) => {
        const revealed = idx < visibleCount;
        const isExpanded = expandedRow === row.id;
        const hasContent = row.id === "letgo" || row.bullets.length > 0;
        const isCurrent = row.kind === "current";

        return (
          <div
            key={row.id}
            className={revealed ? "t-row-in" : undefined}
            onClick={hasContent ? (e) => toggleExpanded(row.id, e.currentTarget) : undefined}
            style={{
              border: "1px solid var(--t-rule)",
              borderRadius: 8,
              background: isCurrent ? "var(--t-accent-bg)" : isExpanded ? "var(--t-paper2)" : "var(--t-paper)",
              cursor: hasContent ? "pointer" : "default",
              overflow: "hidden",
              visibility: revealed ? undefined : "hidden",
            }}
          >
            <div style={{ padding: "10px 14px 8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontFamily: "var(--t-mono)", fontSize: 10.5, color: "var(--t-ink3)", display: "flex", gap: 8, alignItems: "center" }}>
                <span>{row.lineId}</span>
                <span style={{ color: "var(--t-accent2)" }}>{row.tPlus}</span>
                <Pill type={row.type} />
              </div>
              <span style={{ fontFamily: "var(--t-mono)", fontSize: 10.5, color: "var(--t-ink3)" }}>{row.span}</span>
            </div>
            <div style={{ padding: "0 14px 12px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontFamily: "var(--t-sans)", fontSize: 14.5, fontWeight: 500, color: "var(--t-ink)" }}>{row.role}</div>
                <div style={{ fontFamily: "var(--t-sans)", fontSize: 13, color: "var(--t-ink2)", marginTop: 2 }}>
                  <span style={{ color: "var(--t-accent2)", fontFamily: "var(--t-mono)" }}>@</span> {row.company}
                </div>
              </div>
              {hasContent && (
                <span style={{
                  color: "var(--t-accent2)", fontFamily: "var(--t-mono)", fontSize: 12,
                  display: "block", transition: "transform 0.2s",
                  transform: isExpanded ? "rotate(90deg)" : "none",
                  paddingTop: 4, flexShrink: 0,
                }}>▸</span>
              )}
            </div>

            {isExpanded && (
              <div className="t-slide-down" style={{ padding: "0 14px 14px", borderTop: "1px solid var(--t-rule2)" }}>
                {row.id === "letgo" ? (
                  <div style={{ marginTop: 12 }}>
                    <p style={{ fontFamily: "var(--t-sans)", fontSize: 13.5, color: "var(--t-ink2)", lineHeight: 1.55, marginBottom: 12 }}>{row.summary}</p>
                    {row.blocks.map((block) => (
                      <div key={block.title} style={{ borderLeft: "3px solid var(--t-accent)", borderRadius: 6, padding: "10px 14px", marginBottom: 8, background: "var(--t-paper)" }}>
                        <div style={{ fontFamily: "var(--t-mono)", fontSize: 10, color: "var(--t-accent2)", marginBottom: 3 }}>
                          $ {block.title.toLowerCase().replace(/\s+/g, "-")}
                        </div>
                        <div style={{ fontFamily: "var(--t-sans)", fontSize: 13, fontWeight: 500, color: "var(--t-ink)", marginBottom: 5 }}>{block.title}</div>
                        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                          {block.bullets.map((b, i) => (
                            <li key={i} style={{ fontFamily: "var(--t-sans)", fontSize: 12, color: "var(--t-ink2)", marginBottom: 3, paddingLeft: 12, position: "relative" }}>
                              <span style={{ position: "absolute", left: 0, color: "var(--t-accent2)", fontFamily: "var(--t-mono)" }}>›</span>{b}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ marginTop: 12 }}>
                    {row.summary && <p style={{ fontFamily: "var(--t-sans)", fontSize: 13, color: "var(--t-ink2)", lineHeight: 1.55, marginBottom: 8 }}>{row.summary}</p>}
                    {row.bullets.length > 0 && (
                      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                        {row.bullets.map((b, i) => (
                          <li key={i} style={{ fontFamily: "var(--t-sans)", fontSize: 12, color: "var(--t-ink2)", marginBottom: 4, paddingLeft: 14, position: "relative" }}>
                            <span style={{ position: "absolute", left: 0, color: "var(--t-accent2)", fontFamily: "var(--t-mono)" }}>›</span>{b}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function RecoCarousel({ active = false }: { active?: boolean }) {
  const [i, setI] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const [displayedQuote, setDisplayedQuote] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const prev = () => setI((c) => (c - 1 + RECOS.length) % RECOS.length);
  const next = () => setI((c) => (c + 1) % RECOS.length);

  useEffect(() => {
    if (!active) return;
    setDisplayedQuote("");
    setIsTyping(true);
    const quote = RECOS[i].quote;
    let charIdx = 0;
    const iv = setInterval(() => {
      charIdx++;
      setDisplayedQuote(quote.slice(0, charIdx));
      if (charIdx >= quote.length) {
        clearInterval(iv);
        setIsTyping(false);
      }
    }, 8);
    return () => clearInterval(iv);
  }, [active, i]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
      if (e.key === "ArrowRight") { e.preventDefault(); next(); }
    };
    el.addEventListener("keydown", handleKey);
    return () => el.removeEventListener("keydown", handleKey);
  });

  const r = RECOS[i];
  const idStr = String(i + 1).padStart(2, "0");
  const shownQuote = isTyping ? displayedQuote : r.quote;

  return (
    <div ref={rootRef} tabIndex={0} style={{ outline: "none" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontFamily: "var(--t-mono)", fontSize: 11, color: "var(--t-ink3)" }}>
          <span style={{ color: "var(--t-accent2)" }}>► {RECOS.length} entries</span>
          {" · GET /api/reco?id="}{idStr}{" · "}
          <span style={{ color: "var(--t-ink)" }}>200 OK</span>
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={prev} className="t-ibtn">‹</button>
          <span style={{ fontFamily: "var(--t-mono)", fontSize: 11, color: "var(--t-ink3)" }}>
            <span style={{ color: "var(--t-ink)" }}>{idStr}</span> / {RECOS.length}
          </span>
          <button onClick={next} className="t-ibtn">›</button>
        </div>
      </div>

      <div key={i} className="t-slide-down" style={{
        border: "1px solid var(--t-rule)", borderRadius: 10, background: "var(--t-paper2)",
        fontFamily: "var(--t-mono)", fontSize: 12, lineHeight: 1.7, padding: "18px 22px",
      }}>
        <div>{"{"}</div>
        {[
          { k: "id", v: idStr },
          { k: "source", v: "linkedin" },
          { k: "author", v: r.author },
          { k: "title", v: r.title },
          { k: "relation", v: r.relation },
          { k: "date", v: r.date },
        ].map(({ k, v }) => (
          <div key={k} style={{ paddingLeft: 16 }}>
            <span style={{ color: "var(--t-accent2)" }}>&quot;{k}&quot;</span>
            <span style={{ color: "var(--t-ink3)" }}>: </span>
            <span style={{ color: "var(--t-ink)" }}>&quot;{v}&quot;</span>,
          </div>
        ))}
        <div style={{ paddingLeft: 16 }}>
          <span style={{ color: "var(--t-accent2)" }}>&quot;quote&quot;</span>
          <span style={{ color: "var(--t-ink3)" }}>:</span>
        </div>
        <div style={{ paddingLeft: 28, borderLeft: "2px solid var(--t-accent)", marginLeft: 16, paddingTop: 6, paddingBottom: 6, position: "relative" }}>
          {/* full quote — invisible, only for height reservation */}
          <span style={{ fontFamily: "var(--t-serif)", fontStyle: "italic", fontSize: 20, lineHeight: 1.45, color: "transparent", userSelect: "none" }} className="t-quote-mobile" aria-hidden="true">
            &ldquo;{r.quote}&rdquo;
          </span>
          {/* typed text overlaid */}
          <span style={{ fontFamily: "var(--t-serif)", fontStyle: "italic", fontSize: 20, lineHeight: 1.45, color: "var(--t-ink)", position: "absolute", top: 6, left: 28, right: 0 }} className="t-quote-mobile">
            &ldquo;{shownQuote}{isTyping && <span style={{ animation: "t-blink 0.7s steps(1) infinite" }}>▍</span>}&rdquo;
          </span>
        </div>
        <div>{"}"}</div>
      </div>

      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 12 }}>
        {RECOS.map((_, idx) => (
          <button key={idx} onClick={() => setI(idx)} style={{
            width: idx === i ? 18 : 8, height: 8, borderRadius: 4,
            border: "none", background: idx === i ? "var(--t-accent)" : "var(--t-rule)",
            cursor: "pointer", padding: 0,
            transition: "width 0.15s ease, background 0.15s ease",
          }} />
        ))}
      </div>
    </div>
  );
}

function StackSection({ active = false }: { active?: boolean }) {
  const [langsVisible, setLangsVisible] = useState(0);
  const [langDots, setLangDots] = useState<number[]>(LANGUAGES.map(() => 0));
  const [certsVisible, setCertsVisible] = useState(0);
  const [awardsVisible, setAwardsVisible] = useState(0);

  useEffect(() => {
    if (!active) return;
    const actions: (() => void)[] = [];

    LANGUAGES.forEach((lang, li) => {
      actions.push(() => setLangsVisible(li + 1));
      for (let d = 1; d <= lang.dots; d++) {
        const dd = d, lli = li;
        actions.push(() => setLangDots(prev => { const n = [...prev]; n[lli] = dd; return n; }));
      }
    });
    CERTS.forEach((_, ci) => actions.push(() => setCertsVisible(ci + 1)));
    AWARDS.forEach((_, ai) => actions.push(() => setAwardsVisible(ai + 1)));

    const timers = actions.map((action, idx) => setTimeout(action, idx * 50));
    return () => timers.forEach(clearTimeout);
  }, [active]);

  const Bars = ({ shown }: { shown: number }) => (
    <>
      <span style={{ color: "var(--t-accent2)", letterSpacing: 1, fontFamily: "var(--t-mono)" }}>{"█".repeat(shown)}</span>
      <span style={{ color: "var(--t-ink4)", letterSpacing: 1, fontFamily: "var(--t-mono)" }}>{"░".repeat(5 - shown)}</span>
    </>
  );

  return (
    <div className="t-stack-grid">
      <div>
        <div style={{ fontFamily: "var(--t-mono)", fontSize: 11, color: "var(--t-accent2)", marginBottom: 10, visibility: langsVisible > 0 ? undefined : "hidden" }}>// langs.json</div>
        {LANGUAGES.map((l, idx) => {
          const revealed = idx < langsVisible;
          return (
            <div key={l.lang} className={revealed ? "t-row-in" : undefined} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderTop: idx === 0 ? "none" : "1px dotted var(--t-rule)", visibility: revealed ? undefined : "hidden" }}>
              <span style={{ fontFamily: "var(--t-mono)", fontSize: 13, color: "var(--t-ink)" }}>{l.lang}</span>
              <span style={{ display: "inline-flex" }}><Bars shown={langDots[idx] ?? 0} /></span>
            </div>
          );
        })}
      </div>
      <div>
        <div style={{ fontFamily: "var(--t-mono)", fontSize: 11, color: "var(--t-accent2)", marginBottom: 10, visibility: certsVisible > 0 ? undefined : "hidden" }}>// certs.txt</div>
        {CERTS.map((cert, i) => {
          const revealed = i < certsVisible;
          return (
            <div key={cert} className={revealed ? "t-row-in" : undefined} style={{ display: "grid", gridTemplateColumns: "26px 1fr", padding: "5px 0", borderTop: i === 0 ? "none" : "1px dotted var(--t-rule)", visibility: revealed ? undefined : "hidden" }}>
              <span style={{ fontFamily: "var(--t-mono)", fontSize: 12.5, color: "var(--t-ink3)" }}>{String(i + 1).padStart(2, "0")}.</span>
              <span style={{ fontFamily: "var(--t-mono)", fontSize: 12.5, color: "var(--t-ink)" }}>{cert}</span>
            </div>
          );
        })}
      </div>
      <div>
        <div style={{ fontFamily: "var(--t-mono)", fontSize: 11, color: "var(--t-accent2)", marginBottom: 10, visibility: awardsVisible > 0 ? undefined : "hidden" }}>// awards.log</div>
        {AWARDS.map((a, i) => {
          const revealed = i < awardsVisible;
          return (
            <div key={a.title} className={revealed ? "t-row-in" : undefined} style={{ padding: "8px 0", borderTop: i === 0 ? "none" : "1px dotted var(--t-rule)", visibility: revealed ? undefined : "hidden" }}>
              <div style={{ fontFamily: "var(--t-mono)", fontSize: 10, color: "var(--t-accent2)", marginBottom: 3 }}>[{a.date}]</div>
              <div style={{ fontFamily: "var(--t-sans)", fontSize: 13, color: "var(--t-ink)", marginBottom: a.org ? 2 : 0 }}>{a.title}</div>
              {a.org && <div style={{ fontFamily: "var(--t-mono)", fontSize: 10, color: "var(--t-ink3)" }}>{a.org}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SkillsSection({ active = false }: { active?: boolean }) {
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    if (!active) return;
    let count = 0;
    const iv = setInterval(() => {
      count++;
      setVisibleCount(count);
      if (count >= SKILLS.length) clearInterval(iv);
    }, 35);
    return () => clearInterval(iv);
  }, [active]);

  const pillStyle: React.CSSProperties = {
    display: "inline-block",
    fontFamily: "var(--t-mono)",
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    padding: "2px 8px",
    borderRadius: 999,
    border: "1px solid var(--t-rule2)",
    background: "transparent",
    color: "var(--t-ink4)",
  };

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
      {SKILLS.map((skill, idx) => {
        const revealed = idx < visibleCount;
        return (
          <span key={skill} className={revealed ? "t-skill-in" : undefined} style={{ ...pillStyle, visibility: revealed ? undefined : "hidden" }}>{skill}</span>
        );
      })}
    </div>
  );
}

function ContactSection({ active = false, onDone }: { active?: boolean; onDone?: () => void }) {
  const LINE1 = "crespovelasco@gmail.com";
  const LINE2 = "linkedin.com/in/pacres";
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");

  useEffect(() => {
    if (!active) return;
    let idx = 0;
    const total = LINE1.length + LINE2.length;
    const iv = setInterval(() => {
      idx++;
      if (idx <= LINE1.length) {
        setLine1(LINE1.slice(0, idx));
      } else {
        setLine2(LINE2.slice(0, idx - LINE1.length));
      }
      if (idx >= total) { clearInterval(iv); onDone?.(); }
    }, 25);
    return () => clearInterval(iv);
  }, [active]);

  return (
    <div>
      <div style={{ fontFamily: "var(--t-mono)", fontSize: 14, lineHeight: 1.8 }}>
        <div style={{ marginBottom: 4, visibility: active ? undefined : "hidden" }}>
          <span style={{ color: "var(--t-accent2)" }}>→ </span>
          <a href="mailto:crespovelasco@gmail.com" style={{ color: "var(--t-accent2)", textDecoration: "none" }}>
            {line1}
          </a>
          {active && line1.length < LINE1.length && (
            <span style={{ color: "var(--t-accent2)", animation: "t-blink 0.7s steps(1) infinite" }}>▍</span>
          )}
        </div>
        <div style={{ visibility: active ? undefined : "hidden" }}>
          <span style={{ color: "var(--t-accent2)" }}>→ </span>
          <a href="https://www.linkedin.com/in/pacres/" target="_blank" rel="noopener noreferrer" style={{ color: "var(--t-accent2)", textDecoration: "none" }}>
            {line2}
          </a>
          {active && line1.length >= LINE1.length && line2.length < LINE2.length && (
            <span style={{ color: "var(--t-accent2)", animation: "t-blink 0.7s steps(1) infinite" }}>▍</span>
          )}
        </div>
      </div>
    </div>
  );
}

function FooterSection({ startAfter = false, text = "↳ Bienvenido a la web de Pacres" }: { startAfter?: boolean; text?: string }) {
  const TEXT = text;
  const [displayed, setDisplayed] = useState("");
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!startAfter) return;
    const t = setTimeout(() => setStarted(true), 200);
    return () => clearTimeout(t);
  }, [startAfter]);

  useEffect(() => {
    if (!started) return;
    let idx = 0;
    const iv = setInterval(() => {
      idx++;
      setDisplayed(TEXT.slice(0, idx));
      if (idx >= TEXT.length) clearInterval(iv);
    }, 100);
    return () => clearInterval(iv);
  }, [started]);

  return (
    <div>
      <div style={{ padding: "0.4rem 28px 1.5rem", textAlign: "center" }}>
        <span style={{ fontFamily: "var(--t-mono)", fontSize: 10, color: "var(--t-ink4)", visibility: started ? undefined : "hidden" }}>
          {started ? displayed : TEXT}
          {started && displayed.length < TEXT.length && (
            <span style={{ animation: "t-blink 0.7s steps(1) infinite" }}>▍</span>
          )}
        </span>
      </div>
    </div>
  );
}

function Section({ n, cmd, highlight = false, children, contentStyle, noBorder = false }: {
  n: string; cmd: string; highlight?: boolean;
  children: React.ReactNode | ((active: boolean) => React.ReactNode);
  contentStyle?: React.CSSProperties; noBorder?: boolean;
}) {
  const { ref, inView } = useInView();
  const [contentVisible, setContentVisible] = useState(false);
  useEffect(() => {
    if (!inView) return;
    const t = setTimeout(() => setContentVisible(true), 120 + cmd.length * 26 + 200);
    return () => clearTimeout(t);
  }, [inView, cmd.length]);
  return (
    <div ref={ref} style={noBorder ? undefined : { borderTop: "1px solid var(--t-rule)" }}>
      <PromptRow n={n} cmd={cmd} highlight={highlight} active={inView} />
      <div className={`t-section-wrap${contentVisible ? " t-in" : ""}`}>
        <div style={contentStyle} className="t-content">
          {typeof children === "function" ? children(contentVisible) : children}
        </div>
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function TerminalHome() {
  const router = useRouter();
  const pathname = usePathname();
  const [expandedDesktopId, setExpandedDesktopId] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [contactDone, setContactDone] = useState(false);

  const handleExpandDesktop = (id: string | null, el: HTMLElement) => {
    setExpandedDesktopId(id);
    if (id !== null) {
      requestAnimationFrame(() => {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  };
  const [windowState, setWindowState] = useState<"normal" | "minimized" | "maximized">("normal");
  const [animClass, setAnimClass] = useState("");
  const [dockAnimOut, setDockAnimOut] = useState(false);
  const toggleExpanded = (id: string, el?: HTMLElement) => {
    const isExpanding = expandedRow !== id;
    setExpandedRow((prev) => prev === id ? null : id);
    if (isExpanding && el) {
      requestAnimationFrame(() => {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  };

  const handleClose = () => {
    const nav = () => {
      if ("startViewTransition" in document) {
        (document as unknown as { startViewTransition: (cb: () => void) => void }).startViewTransition(() => router.push("/"));
      } else {
        router.push("/");
      }
    };
    if (windowState === "minimized") {
      setDockAnimOut(true);
      setTimeout(() => {
        document.body.style.transition = "background 0.3s ease";
        document.body.style.background = "#f7f4ed";
        setTimeout(nav, 300);
      }, 220);
      return;
    }
    document.body.style.background = "#f7f4ed";
    setAnimClass("t-win-closing");
    setTimeout(nav, 500);
  };
  const handleMinimize = () => {
    setAnimClass("t-win-minimizing");
    setTimeout(() => { setWindowState("minimized"); setAnimClass(""); }, 390);
  };
  const handleMaximize = () => {
    if (animClass.includes("maximiz")) return;
    if (windowState !== "maximized") {
      setAnimClass("t-win-maximizing");
      setTimeout(() => { setWindowState("maximized"); setAnimClass(""); }, 1020);
    } else {
      setAnimClass("t-win-unmaximizing");
      setTimeout(() => { setWindowState("normal"); setAnimClass(""); }, 1020);
    }
  };
  const handleRestore = () => {
    setDockAnimOut(true);
    setTimeout(() => {
      setWindowState("normal");
      setAnimClass("t-win-restoring");
      setDockAnimOut(false);
      setTimeout(() => setAnimClass(""), 640);
    }, 220);
  };
  const handleRestoreMaximized = () => {
    setDockAnimOut(true);
    setTimeout(() => {
      setWindowState("maximized");
      setAnimClass("t-win-restoring");
      setDockAnimOut(false);
      setTimeout(() => setAnimClass(""), 640);
    }, 220);
  };

  const CONTENT_STYLE: React.CSSProperties = { padding: "0 28px 32px 86px" };

  const isMax = windowState === "maximized";
  const isMin = windowState === "minimized";

  return (
    <>
      <style>{`


        /* Desktop: show table, hide cards + mobile avatar */
        .t-tl-desktop { display: block; }
        .t-tl-mobile  { display: none; flex-direction: column; gap: 8px; }
        .t-avatar-desktop { display: block; }
        .t-avatar-mobile  { display: none; }
        .t-stack-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 28px; }
        .t-session-meta { display: block; }

        @media (max-width: 700px) {
          .t-tl-desktop { display: none !important; }
          .t-tl-mobile  { display: flex; }
          .t-avatar-desktop { display: none !important; }
          .t-avatar-mobile  { display: block; }
          .t-whoami-row { flex-direction: column !important; }
          .t-stack-grid { grid-template-columns: 1fr; gap: 22px; }
          .t-session-meta { display: none; }
          .t-content { padding: 0 16px 24px 16px !important; }
          .t-prompt { padding: 16px 16px 6px !important; }
          .t-prompt-num { font-size: 10px !important; }
          .t-prompt-cmd { font-size: 12px !important; }
          .t-quote-mobile { font-size: 16px !important; }
          .t-footer { padding: 1.8rem 16px 4rem 16px !important; }
        }
      `}</style>

      {isMin && <MinimizedBar title="cv" onRestore={handleRestore} onMaximize={handleRestoreMaximized} onClose={handleClose} animatingOut={dockAnimOut} />}

      <div className={`t-bg${animClass === "t-win-maximizing" ? " t-outer-maximizing" : animClass === "t-win-unmaximizing" ? " t-outer-unmaximizing" : ""}`} style={{
        minHeight: "100vh",
        padding: isMax ? 0 : "2rem 1rem 3rem",
        display: (isMin && !animClass) ? "none" : "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        fontFamily: "var(--t-sans)",
        transition: "padding 1.1s ease",
        animation:
          animClass === "t-win-closing"    ? "t-bg-fade-out 0.2s ease-out  forwards" :
          animClass === "t-win-minimizing" ? "t-bg-fade-out 0.38s ease-in   forwards" :
          animClass === "t-win-restoring"  ? "t-bg-fade-in  0.6s  ease-out"           :
          undefined,
      }}>
        <div className={animClass} style={{
          "--win-w": "100vw",
          width: isMax ? "100vw" : "min(920px, 100%)",
          maxWidth: "none",
          minHeight: isMax ? "100vh" : undefined,
          background: "var(--t-paper)",
          borderRadius: isMax ? 0 : 12,
          border: isMax ? "none" : "1px solid var(--t-rule)",
          boxShadow: isMax ? "none" : "0 30px 80px -40px rgba(0,0,0,0.25), 0 2px 6px rgba(0,0,0,0.04)",
          overflow: "hidden",
          marginBottom: isMax ? 0 : "3rem",
          transformOrigin: (animClass === "t-win-minimizing" || animClass === "t-win-restoring") ? "bottom center" : "center center",
        } as React.CSSProperties}>
          <ChromeBar title="cv" onClose={handleClose} onMinimize={handleMinimize} onMaximize={handleMaximize}
            isMaximized={windowState === "maximized" || animClass === "t-win-maximizing"} />
          <TabsBar
            tabs={[
              { label: "~/cv",      active: true },
              { label: "~/lab",     active: false, dot: true, onClick: () => router.push("/lab") },
              { label: "~/designs", active: false, onClick: () => router.push("/designs") },
            ]}
          />

          {/* 000 — whoami */}
          <Section n="000" cmd="whoami --pretty" contentStyle={CONTENT_STYLE} noBorder>
            <WhoamiSection />
          </Section>

          {/* 001 — timeline */}
          <Section n="001" cmd="cv timeline --since=2004 --format=pretty | head -n 7" contentStyle={CONTENT_STYLE}>
            {(active) => (
              <>
                <TimelineDesktop expandedId={expandedDesktopId} onToggle={handleExpandDesktop} active={active} />
                <TimelineMobile expandedRow={expandedRow} toggleExpanded={toggleExpanded} active={active} />
              </>
            )}
          </Section>

          {/* 002 — recos */}
          <Section n="002" cmd="curl https://pacr.es/api/reco | jq" contentStyle={CONTENT_STYLE}>
            {(active) => <RecoCarousel active={active} />}
          </Section>

          {/* 003 — stack */}
          <Section n="003" cmd="cv stack --include=langs,certs,awards" contentStyle={CONTENT_STYLE}>
            {(active) => <StackSection active={active} />}
          </Section>

          {/* 004 — skills */}
          <Section n="004" cmd="cv skills | sort -R" contentStyle={CONTENT_STYLE}>
            {(active) => <SkillsSection active={active} />}
          </Section>

          {/* 005 — contact */}
          <Section n="005" cmd="contact --reply" highlight contentStyle={CONTENT_STYLE}>
            {(active) => <ContactSection active={active} onDone={() => setContactDone(true)} />}
          </Section>

          {/* Footer */}
          <FooterSection startAfter={contactDone} text={pathname === "/home/terminal" ? "↳ Creado el 24 de mayo de 2026" : "↳ Bienvenido a la web de Pacres"} />
        </div>
      </div>

    </>
  );
}
