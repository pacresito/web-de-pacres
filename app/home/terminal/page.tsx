"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import HomeNav from "../../components/HomeNav";

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

const RECOS = [
  { quote: "I had the privilege of working with Pablo, a dynamic and proactive colleague. Pablo is a hands-on problem solver, consistently driving solutions and fostering collaboration across departments. His exceptional interpersonal skills create a positive work environment. I highly recommend Pablo for his dedication, teamwork, and ability to navigate challenges seamlessly.", author: "Kerem Kocak", title: "Head of Product · ex-OLX, CAFU, Turkcell", relation: "managed Pablo directly", date: "mar 2023", photo: "/recomendadores/kerem.jpg", url: "https://www.linkedin.com/in/kerem-product/" },
  { quote: "Pablo and I worked together on letgo. I must say he is one of the best product managers I have worked with. His communication and prioritization skills, help team going forward a lot faster. He takes ownership on initiatives and delivers valuable outcomes. Besides, he is very fun to work with. I believe he will be a great addition to any team.", author: "Yeliz Ustabas Lopez", title: "Risk and Fraud · Sr. Product Manager at Eventbrite", relation: "worked with Pablo on the same team", date: "oct 2021", photo: "/recomendadores/yeliz.jpg", url: "https://www.linkedin.com/in/yeliz-ustabas/" },
  { quote: "I've had the pleasure of working closely with Pablo for several years, and I can confidently say that he is an exceptional professional. Pablo possesses a unique skill set that makes him a valuable asset to any team. I want to highlight his exceptional ability to solve complex problems and find practical solutions, as well as his remarkable adaptability when taking on new assignments. Above all, what sets Pablo apart is his positive attitude and friendly demeanor, which not only make working with him enjoyable but also foster a collaborative and welcoming work environment.", author: "David Adalid", title: "QA Specialist · ISTQB Certified", relation: "worked with Pablo on the same team", date: "may 2022", photo: "/recomendadores/david.jpg", url: "https://www.linkedin.com/in/david-adalid/" },
  { quote: "Pablo is a high-skilled one-man band. He is able to perform so many different roles but, at the same time, able to lead by example a group of ICs so they go the extra mile. He is easy-going, happy to negotiate and to reach agreements. He is not pure-techie, but you can throw him any kind of ball and he will be ready for it. I'd say of Pablo that he is one of a kind and I'd be delighted to work with him again.", author: "Jesús Rodríguez", title: "Agile Facilitator / People Developer", relation: "worked with Pablo on the same team", date: "ago 2020", photo: "/recomendadores/jesus.jpg", url: "https://www.linkedin.com/in/jesusrh/" },
  { quote: "I had the privilege of working with Pablo for several years at the hyper-fast-growing startup letgo. Pablo is not only incredibly smart but also exceptionally hardworking. He's the kind of guy who's there to get the job done, no matter the challenge. ANY, really! Throw him a challenge and he will solve it. His fantastic sense of humor and positive attitude also make working with him a breeze.", author: "Adrià Vallès", title: "Engineering Manager · Lingokids", relation: "worked with Pablo on different teams", date: "jun 2022", photo: "/recomendadores/adria.jpg", url: "https://www.linkedin.com/in/adriavalles/" },
  { quote: "Pablo showed unique skills for approaching challenges with pragmatism and out-of-the-box thinking that consistently resulted in innovative and effective solutions. Guided by Pablo's leadership, the team has had great business impact using complex technical initiatives like Home personalization and Search relevance. I have learned a lot from Pablo during this period, especially from his ability to quickly adapt to business changes.", author: "Julien Meynet", title: "AI/ML Leader · Search & Recommender Systems · PhD", relation: "worked with Pablo on different teams", date: "feb 2023", photo: "/recomendadores/julien.jpg", url: "https://www.linkedin.com/in/julienmeynet/" },
  { quote: "You need something done and you need it quick... but you also need to align many stakeholders, while understanding the customers' pains and keeping in mind the technical limitations... Then Pablo is your man! He gets things done. He gets features shipped. And all while keeping a smile on... I miss working with him!", author: "Arnau Tibau Puig", title: "Data & AI for climate · PhD", relation: "worked with Pablo on the same team", date: "nov 2021", photo: "/recomendadores/arnau.jpg", url: "https://www.linkedin.com/in/atibaup/" },
  { quote: "Es un honor recomendar a Pablo, una mente brillante con una habilidad asombrosa para simplificar problemas complejos y encontrar soluciones efectivas. Su curiosidad insaciable, proactividad y enfoque implacable en los objetivos hacen que sea un compañero excepcional. Gran líder y mentor, destaco su disposición constante para compartir conocimientos y desafiar ideas para encontrar las mejores soluciones.", author: "Janna Ubach", title: "Trust & Safety PM · N26 · ex-TikTok, ex-OLX", relation: "worked with Pablo on the same team", date: "sep 2022", photo: "/recomendadores/janna.jpg", url: "https://www.linkedin.com/in/jannaubach/" },
  { quote: "Lo que más aprendí de Pablo es que siempre tenía actitud positiva, te daba mucha confianza y te ayudaba a tener todo bajo control. Otra de las virtudes de Pablo es que es muy multidisciplinar. Sin duda una de las cosas que más aprendí fue todo el tema de metodologías Agile, teníamos unas metodologías muy dinámicas en los procesos de trabajo.", author: "Dani Cruz", title: "AI Advertising", relation: "reported to Pablo", date: "mar 2019", photo: "/recomendadores/dani.jpg", url: "https://www.linkedin.com/in/danicruzpaidsocial/" },
  { quote: "Pablo is a tenacious Product Owner and drives towards the best solutions with great efficiency. He considers all the possible outcomes and effects and will often think of issues in a solution that others will not. He's a great collaborator as well and will challenge you in your assumptions. He's also well versed technically and can get comfortably into the details with engineers.", author: "Mark Leung", title: "Principal Solution Strategist · Datavisor", relation: "Pablo was a client of mine", date: "dic 2022", photo: "/recomendadores/mark.jpg", url: "https://www.linkedin.com/in/mark-leung-8524105/" },
  { quote: "Pablo es una de las personas con las que mejor he trabajado. Su capacidad de comunicación es excepcional. Su organización es envidiable, siempre mantiene un enfoque claro y estructurado y sobretodo, muy pragmático. Lo que más me impresiona de Pablo es su adaptabilidad. Siempre se muestra alegre y con energía, contagiando a todos los que están a su alrededor y creando una atmósfera de colaboración y buen rollo como muy pocas personas son capaces de generar.", author: "Cristian Martin Mouat", title: "From tech strategy to hands-on development", relation: "worked with Pablo on the same team", date: "ene 2023", photo: "/recomendadores/cristian.jpg", url: "https://www.linkedin.com/in/cristian-martin-mouat/" },
  { quote: "I thoroughly enjoyed meeting and working with Pablo for two years. He is an energetic, upbeat person who always lightens up any room he enters. Pablo has an inquisitive mind and sharp intellect and is a versatile problem solver. He has successfully found external providers, managed business operations, written SQL queries, and led mid-sized multidisciplinary teams. If this sounds too good to be true, just hop on a call with him and see for yourself.", author: "Jordi Escrich", title: "Data Specialist", relation: "worked with Pablo on the same team", date: "jul 2021", photo: "/recomendadores/jordi.jpg", url: "https://www.linkedin.com/in/jordiescrich/" },
  { quote: "Pablo gets straight to the point, simplifies what is difficult and focuses on what is important. He makes the way easier for everyone to deliver the task while listening to all points of view. Nothing escapes him. As a designer I recommend Pablo 100%.", author: "Iván Bayo", title: "Designing impactful user experiences", relation: "worked with Pablo on the same team", date: "nov 2020", photo: "/recomendadores/ivan.jpg", url: "https://www.linkedin.com/in/ivanbayo/" },
  { quote: "Pablo is a great professional. His strong analytical skills make him ready and able to solve every problem he has to face. He is able to manage huge work-load and to perform perfectly in stressful situations always keeping a smile on his face. I am sure he would be the perfect element for every team!", author: "Daniela Servi", title: "ESL Teacher · SCUOLA INTERNAZIONALE DI PAVIA", relation: "worked with Pablo on the same team", date: "jun 2016", photo: "/recomendadores/daniela.jpg", url: "https://www.linkedin.com/in/danielaservi/" },
  { quote: "Pablo, es sin duda, una de las personas más inteligentes, trabajadoras y profesionales con las que he tenido el placer de trabajar. Además de gestionar la logística de Nonabox de forma soberbia, aplica sus conocimientos de forma práctica y antepone lo que juzga es mejor para la empresa. Siempre he intentado tener en cuenta su opinión para cualquier desarrollo, pues sabe abstraerse y pensar siempre de la forma correcta.", author: "Mario Pérez Pereira", title: "Head of Product", relation: "managed Pablo directly", date: "mar 2015", photo: "/recomendadores/mario.jpg", url: "https://www.linkedin.com/in/marioperezpereira/" },
];

const CERTS = [
  "Product Executive Certificate",
  "Certified Scrum Product Owner",
  "Certified Scrum Master",
  "Retention + Engagement Deep Dive",
  "Certified Mentor",
  "Diplôme d'Études en Langue Française",
  "First Certificate Exam",
  "Advanced Open Water Diver",
];

const LANGUAGES = [
  { lang: "Español", level: "nativa", dots: 5 },
  { lang: "Inglés", level: "bilingüe", dots: 5 },
  { lang: "Francés", level: "profesional", dots: 3 },
  { lang: "Lengua de signos", level: "básica", dots: 2 },
];

const AWARDS = [
  { title: "Best Startup Products & Services. Early Stage", org: "Spain Startup & Investor Summit · Nonabox", date: "oct. 2013" },
  { title: "Finalista StartCamp Madrid 2013", org: "Wayra — Telefónica · Proyecto iVecinos", date: "mar. 2013" },
  { title: "Tercer puesto campeonato nacional de capoeira", org: "", date: "may. 2009" },
  { title: "Primer puesto campeonato local de ajedrez", org: "", date: "jun. 1995" },
];

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

function WinIcon({ kind }: { kind: "close" | "minimize" | "maximize" | "restore" }) {
  const f = "rgba(0,0,0,0.4)";
  const s = { stroke: f, strokeWidth: 1.3, strokeLinecap: "round" as const, fill: "none" as const };
  if (kind === "close") return (
    <svg width="7" height="7" viewBox="0 0 8 8" style={{ display: "block" }}>
      <path d="M1.5 1.5l5 5M6.5 1.5l-5 5" {...s} />
    </svg>
  );
  if (kind === "minimize") return (
    <svg width="7" height="7" viewBox="0 0 8 8" style={{ display: "block" }}>
      <path d="M1.5 4h5" {...s} />
    </svg>
  );
  if (kind === "maximize") return (
    /* ◤ top-left + ◢ bottom-right → expandir hacia las esquinas */
    <svg width="7" height="7" viewBox="0 0 8 8" style={{ display: "block" }}>
      <polygon points="1,1 4.5,1 1,4.5" fill={f} />
      <polygon points="7,7 3.5,7 7,3.5" fill={f} />
    </svg>
  );
  /* restore: ◥ top-right + ◣ bottom-left → ángulos en esquinas, mismo gap que maximize */
  return (
    <svg width="7" height="7" viewBox="0 0 8 8" style={{ display: "block" }}>
      <polygon points="7,1 3.5,1 7,4.5" fill={f} />
      <polygon points="1,7 1,3.5 4.5,7" fill={f} />
    </svg>
  );
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

function WindowBtn({ color, onClick, title, kind, showIcon = false }: {
  color: string; onClick: () => void; title: string; kind: "close" | "minimize" | "maximize" | "restore"; showIcon?: boolean;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      style={{
        width: 12, height: 12, borderRadius: "50%",
        background: color,
        border: "none", cursor: "pointer", padding: 0,
        flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      {showIcon && <WinIcon kind={kind} />}
    </button>
  );
}

function ChromeBar({ onClose, onMinimize, onMaximize, isMaximized }: {
  onClose: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
  isMaximized: boolean;
}) {
  const [groupHot, setGroupHot] = useState(false);
  return (
    <div style={{
      background: "var(--t-paper2)",
      borderBottom: "1px solid var(--t-rule)",
      padding: "14px 18px",
      display: "grid",
      gridTemplateColumns: "140px 1fr 140px",
      alignItems: "center",
    }}>
      <div
        style={{ display: "flex", gap: 7, alignItems: "center" }}
        onMouseEnter={() => setGroupHot(true)}
        onMouseLeave={() => setGroupHot(false)}
      >
        <WindowBtn color="#ff5f57" onClick={onClose} title="Cerrar" kind="close" showIcon={groupHot} />
        <WindowBtn color="#febc2e" onClick={onMinimize} title="Minimizar" kind="minimize" showIcon={groupHot} />
        <WindowBtn color="#28c840" onClick={onMaximize} title={isMaximized ? "Restaurar" : "Maximizar"} kind={isMaximized ? "restore" : "maximize"} showIcon={groupHot} />
      </div>
      <div style={{ textAlign: "center", fontFamily: "var(--t-mono)", fontSize: 12, color: "var(--t-ink2)" }}>
        ⌘&nbsp;&nbsp;pacr.es — cv — 124×42&nbsp;
        <span style={{
          display: "inline-block",
          border: "1px solid var(--t-rule)",
          borderBottomWidth: 2,
          borderRadius: 2,
          background: "var(--t-paper)",
          padding: "1px 5px",
          fontSize: 10,
          color: "var(--t-ink3)",
          lineHeight: 1.4,
        }}>⌘K</span>
      </div>
      <div style={{ textAlign: "right", fontFamily: "var(--t-mono)", fontSize: 10, color: "var(--t-ink3)" }}>
        v4.0.0 · zsh
      </div>
    </div>
  );
}

function MinimizedBar({ onRestore, onMaximize, onClose }: { onRestore: () => void; onMaximize: () => void; onClose: () => void }) {
  const [groupHot, setGroupHot] = useState(false);
  return (
    <div style={{
      position: "fixed",
      bottom: 28,
      left: "50%",
      transform: "translateX(-50%)",
      background: "var(--t-paper2)",
      border: "1px solid var(--t-rule)",
      borderRadius: 10,
      padding: "10px 16px",
      display: "flex",
      alignItems: "center",
      gap: 12,
      boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
      fontFamily: "var(--t-mono)",
      fontSize: 12,
      color: "var(--t-ink2)",
      zIndex: 100,
      animation: "t-sectionIn 0.25s ease-out",
      whiteSpace: "nowrap",
    }}>
      <div
        style={{ display: "flex", gap: 6, alignItems: "center" }}
        onMouseEnter={() => setGroupHot(true)}
        onMouseLeave={() => setGroupHot(false)}
      >
        <WindowBtn color="#ff5f57" onClick={onClose} title="Cerrar" kind="close" showIcon={groupHot} />
        <WindowBtn color="#febc2e" onClick={onRestore} title="Restaurar" kind="minimize" showIcon={groupHot} />
        <WindowBtn color="#28c840" onClick={onMaximize} title="Maximizar" kind="maximize" showIcon={groupHot} />
      </div>
      <span>pacr.es — cv — 124×42</span>
      <span style={{ color: "var(--t-ink4)", fontSize: 10 }}>· minimizado</span>
    </div>
  );
}

function TabsBar() {
  const tabs = [
    { label: "~/cv", active: true, dot: false },
    { label: "~/lab", active: false, dot: true },
    { label: "~/contact", active: false, dot: false },
  ];
  return (
    <div style={{
      background: "var(--t-paper2)",
      borderBottom: "1px solid var(--t-rule)",
      padding: "0 14px",
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "space-between",
    }}>
      <div style={{ display: "flex" }}>
        {tabs.map((tab) => (
          <div key={tab.label} style={{
            padding: "8px 14px",
            fontFamily: "var(--t-mono)",
            fontSize: 11,
            color: tab.active ? "var(--t-ink)" : "var(--t-ink3)",
            borderTop: tab.active ? "2px solid var(--t-accent)" : "2px solid transparent",
            borderLeft: tab.active ? "1px solid var(--t-rule)" : "none",
            borderRight: tab.active ? "1px solid var(--t-rule)" : "none",
            background: tab.active ? "var(--t-paper)" : "transparent",
            marginBottom: tab.active ? -1 : 0,
            display: "flex",
            alignItems: "center",
            gap: 5,
            cursor: tab.active ? "default" : "pointer",
            userSelect: "none" as const,
          }}>
            {tab.dot && <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--t-accent)", display: "inline-block", flexShrink: 0 }} />}
            {tab.label}
          </div>
        ))}
      </div>
      <div style={{ fontFamily: "var(--t-mono)", fontSize: 10, color: "var(--t-ink3)", paddingBottom: 8 }} className="t-session-meta">
        session #04 — bitácora
      </div>
    </div>
  );
}

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
          const ms = Math.floor(Math.random() * 220 + 18);
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

function TimelineDesktop({ expandedId, setExpandedId }: { expandedId: string | null; setExpandedId: (id: string | null) => void }) {
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
        const hasContent = row.id === "letgo" || row.bullets.length > 0;
        const isCurrent = row.kind === "current";
        const isExpanded = expandedId === row.id;

        return (
          <div key={row.id}>
            <div
              onClick={hasContent ? () => setExpandedId(isExpanded ? null : row.id) : undefined}
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

      {!expandedId && (
        <div style={{ padding: "10px 18px", borderTop: "1px dashed var(--t-rule)", fontFamily: "var(--t-mono)", fontSize: 11, color: "var(--t-ink3)" }}>
          ↳ tip: click any row to expand details
        </div>
      )}
    </div>
  );
}

function TimelineMobile({ expandedRow, toggleExpanded }: { expandedRow: string | null; toggleExpanded: (id: string) => void }) {
  return (
    <div className="t-tl-mobile" style={{ flexDirection: "column", gap: 8 }}>
      {TIMELINE.map((row) => {
        const isExpanded = expandedRow === row.id;
        const hasContent = row.id === "letgo" || row.bullets.length > 0;
        const isCurrent = row.kind === "current";

        return (
          <div
            key={row.id}
            onClick={hasContent ? () => toggleExpanded(row.id) : undefined}
            style={{
              border: "1px solid var(--t-rule)",
              borderRadius: 8,
              background: isCurrent ? "var(--t-accent-bg)" : isExpanded ? "var(--t-paper2)" : "var(--t-paper)",
              cursor: hasContent ? "pointer" : "default",
              overflow: "hidden",
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

function RecoCarousel() {
  const [i, setI] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const prev = () => setI((c) => (c - 1 + RECOS.length) % RECOS.length);
  const next = () => setI((c) => (c + 1) % RECOS.length);
  const r = RECOS[i];
  const idStr = String(i + 1).padStart(2, "0");

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
        <div style={{ paddingLeft: 28, borderLeft: "2px solid var(--t-accent)", marginLeft: 16, paddingTop: 6, paddingBottom: 6 }}>
          <span style={{ fontFamily: "var(--t-serif)", fontStyle: "italic", fontSize: 20, lineHeight: 1.45, color: "var(--t-ink)" }} className="t-quote-mobile">
            &ldquo;{r.quote}&rdquo;
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

function StackSection() {
  const Bars = ({ dots }: { dots: number }) => (
    <>
      <span style={{ color: "var(--t-accent2)", letterSpacing: 1, fontFamily: "var(--t-mono)" }}>{"█".repeat(dots)}</span>
      <span style={{ color: "var(--t-ink4)", letterSpacing: 1, fontFamily: "var(--t-mono)" }}>{"░".repeat(5 - dots)}</span>
    </>
  );
  return (
    <div className="t-stack-grid">
      <div>
        <div style={{ fontFamily: "var(--t-mono)", fontSize: 11, color: "var(--t-accent2)", marginBottom: 10 }}>// langs.json</div>
        {LANGUAGES.map((l, i) => (
          <div key={l.lang} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderTop: i === 0 ? "none" : "1px dotted var(--t-rule)" }}>
            <span style={{ fontFamily: "var(--t-mono)", fontSize: 13, color: "var(--t-ink)" }}>{l.lang}</span>
            <span style={{ display: "inline-flex" }}><Bars dots={l.dots} /></span>
          </div>
        ))}
      </div>
      <div>
        <div style={{ fontFamily: "var(--t-mono)", fontSize: 11, color: "var(--t-accent2)", marginBottom: 10 }}>// certs.txt</div>
        {CERTS.map((cert, i) => (
          <div key={cert} style={{ display: "grid", gridTemplateColumns: "26px 1fr", padding: "5px 0", borderTop: i === 0 ? "none" : "1px dotted var(--t-rule)" }}>
            <span style={{ fontFamily: "var(--t-mono)", fontSize: 12.5, color: "var(--t-ink3)" }}>{String(i + 1).padStart(2, "0")}.</span>
            <span style={{ fontFamily: "var(--t-mono)", fontSize: 12.5, color: "var(--t-ink)" }}>{cert}</span>
          </div>
        ))}
      </div>
      <div>
        <div style={{ fontFamily: "var(--t-mono)", fontSize: 11, color: "var(--t-accent2)", marginBottom: 10 }}>// awards.log</div>
        {AWARDS.map((a, i) => (
          <div key={a.title} style={{ padding: "8px 0", borderTop: i === 0 ? "none" : "1px dotted var(--t-rule)" }}>
            <div style={{ fontFamily: "var(--t-mono)", fontSize: 10, color: "var(--t-accent2)", marginBottom: 3 }}>[{a.date}]</div>
            <div style={{ fontFamily: "var(--t-sans)", fontSize: 13, color: "var(--t-ink)", marginBottom: a.org ? 2 : 0 }}>{a.title}</div>
            {a.org && <div style={{ fontFamily: "var(--t-mono)", fontSize: 10, color: "var(--t-ink3)" }}>{a.org}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

function SkillsSection() {
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
      {SKILLS.map((skill) => <span key={skill} style={pillStyle}>{skill}</span>)}
    </div>
  );
}

function ContactSection() {
  return (
    <div>
      <div style={{ fontFamily: "var(--t-mono)", fontSize: 14, lineHeight: 1.8 }}>
        <div style={{ marginBottom: 4 }}>
          <span style={{ color: "var(--t-accent2)" }}>→ </span>
          <a href="mailto:crespovelasco@gmail.com" style={{ color: "var(--t-accent2)", textDecoration: "none" }}>
            crespovelasco@gmail.com
          </a>
        </div>
        <div>
          <span style={{ color: "var(--t-accent2)" }}>→ </span>
          <a href="https://www.linkedin.com/in/pacres/" target="_blank" rel="noopener noreferrer" style={{ color: "var(--t-accent2)", textDecoration: "none" }}>
            linkedin.com/in/pacres
          </a>
        </div>
      </div>
    </div>
  );
}

function FooterSection() {
  const { ref, inView } = useInView();
  return (
    <div style={{ borderTop: "1px solid var(--t-rule)" }}>
      <div ref={ref} className={`t-section-wrap${inView ? " t-in" : ""}`}
        style={{ padding: "1.2rem 28px 4rem 86px", textAlign: "center" }}>
        <span style={{ fontFamily: "var(--t-mono)", fontSize: 10, color: "var(--t-ink4)" }}>
          ↳ created: 24 de mayo de 2026
        </span>
      </div>
    </div>
  );
}

function Section({ n, cmd, highlight = false, children, contentStyle, noBorder = false }: {
  n: string; cmd: string; highlight?: boolean; children: React.ReactNode; contentStyle?: React.CSSProperties; noBorder?: boolean;
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
          {children}
        </div>
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function TerminalHome() {
  const router = useRouter();
  const [expandedDesktopId, setExpandedDesktopId] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [windowState, setWindowState] = useState<"normal" | "minimized" | "maximized">("normal");
  const toggleExpanded = (id: string) => setExpandedRow((prev) => prev === id ? null : id);

  const handleClose = () => router.push("/");
  const handleMinimize = () => setWindowState("minimized");
  const handleMaximize = () => setWindowState((s) => s === "maximized" ? "normal" : "maximized");

  const CONTENT_STYLE: React.CSSProperties = { padding: "0 28px 32px 86px" };

  const isMax = windowState === "maximized";
  const isMin = windowState === "minimized";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500;600;700&display=swap');

        :root {
          --t-paper:       #fafaf7;
          --t-paper2:      #f4f1ea;
          --t-ink:         #16140f;
          --t-ink2:        #3a382f;
          --t-ink3:        #7a766b;
          --t-ink4:        #b8b3a6;
          --t-rule:        #d9d4c7;
          --t-rule2:       #ebe6d9;
          --t-accent:      #00b87a;
          --t-accent2:     #009764;
          --t-accent-soft: #d4f5e6;
          --t-accent-bg:   #e8faf1;
          --t-sans:  "Inter", ui-sans-serif, system-ui, sans-serif;
          --t-serif: "Instrument Serif", "Times New Roman", Georgia, serif;
          --t-mono:  "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
        }

        .t-bg { background: #ece9e0 !important; }

        @keyframes t-blink { 50% { opacity: 0; } }
        @keyframes t-slideDown {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .t-slide-down { animation: t-slideDown 0.22s ease-out; }
        @keyframes t-sectionIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .t-section-wrap {
          opacity: 0;
          transform: translateY(12px);
          transition: opacity 0.4s ease-out, transform 0.4s ease-out;
        }
        .t-section-wrap.t-in {
          opacity: 1;
          transform: none;
        }
        @media (prefers-reduced-motion: reduce) {
          .t-section-wrap { opacity: 1 !important; transform: none !important; transition: none !important; }
        }

        .t-ibtn {
          width: 30px; height: 30px; background: var(--t-paper);
          border: 1px solid var(--t-rule); border-radius: 6px;
          cursor: pointer; font-size: 16px; color: var(--t-ink3);
          display: inline-flex; align-items: center; justify-content: center;
          transition: background 0.12s, border-color 0.12s, color 0.12s;
          font-family: var(--t-mono); padding: 0; line-height: 1;
        }
        .t-ibtn:hover { background: var(--t-paper2); border-color: var(--t-ink4); color: var(--t-ink); }

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

      {isMin && <MinimizedBar onRestore={() => setWindowState("normal")} onMaximize={() => setWindowState("maximized")} onClose={handleClose} />}

      <div className="t-bg" style={{
        minHeight: "100vh",
        padding: isMax ? 0 : "2rem 1rem 3rem",
        display: isMin ? "none" : "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        fontFamily: "var(--t-sans)",
      }}>
        <div style={{
          width: "100%",
          maxWidth: isMax ? "none" : 920,
          background: "var(--t-paper)",
          borderRadius: isMax ? 0 : 12,
          border: isMax ? "none" : "1px solid var(--t-rule)",
          boxShadow: isMax ? "none" : "0 30px 80px -40px rgba(0,0,0,0.25), 0 2px 6px rgba(0,0,0,0.04)",
          overflow: "hidden",
          marginBottom: isMax ? 0 : "3rem",
          transition: "border-radius 0.25s ease, box-shadow 0.25s ease",
        }}>
          <ChromeBar onClose={handleClose} onMinimize={handleMinimize} onMaximize={handleMaximize} isMaximized={isMax} />
          <TabsBar />

          {/* 000 — whoami */}
          <Section n="000" cmd="whoami --pretty" contentStyle={CONTENT_STYLE} noBorder>
            <WhoamiSection />
          </Section>

          {/* 001 — timeline */}
          <Section n="001" cmd="cv timeline --since=2004 --format=pretty | head -n 7" contentStyle={CONTENT_STYLE}>
            <TimelineDesktop expandedId={expandedDesktopId} setExpandedId={setExpandedDesktopId} />
            <TimelineMobile expandedRow={expandedRow} toggleExpanded={toggleExpanded} />
          </Section>

          {/* 002 — recos */}
          <Section n="002" cmd="curl https://pacr.es/api/reco | jq" contentStyle={CONTENT_STYLE}>
            <RecoCarousel />
          </Section>

          {/* 003 — stack */}
          <Section n="003" cmd="cv stack --include=langs,certs,awards" contentStyle={CONTENT_STYLE}>
            <StackSection />
          </Section>

          {/* 004 — skills */}
          <Section n="004" cmd="cv skills | sort -R" contentStyle={CONTENT_STYLE}>
            <SkillsSection />
          </Section>

          {/* 005 — contact */}
          <Section n="005" cmd="contact --reply" highlight contentStyle={CONTENT_STYLE}>
            <ContactSection />
          </Section>

          {/* Footer */}
          <FooterSection />
        </div>
      </div>

      <HomeNav />
    </>
  );
}
