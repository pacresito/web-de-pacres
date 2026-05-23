"use client";

import { useState } from "react";
import Image from "next/image";
import HomeNav from "../../components/HomeNav";
import "./editorial.css";

// ─── Data ──────────────────────────────────────────────────────────────────

const DATA = {
  roles: ["Director de Operaciones", "Senior Product Manager", "Troubleshooter"],
  bio: "Ingeniero Industrial con curiosidad por el funcionamiento de todo y gran capacidad para comprender y resolver cualquier problema que se presente.",
  email: "crespovelasco@gmail.com",
  linkedin: "linkedin.com/in/pacres",
  linkedinUrl: "https://www.linkedin.com/in/pacres/",

  timeline: [
    {
      id: "carpa",
      from: "2023",
      to: "hoy",
      fromFull: "ene. 2023",
      toFull: "actualidad",
      role: "Partner",
      company: "CARPA Financieros",
      type: "Autónomo",
      kind: "current",
      summary:
        "Invierte en el sector inmobiliario de forma sencilla. Obtén buenas rentabilidades sin preocuparte.",
      bullets: [] as string[],
      blocks: [] as { title: string; bullets: string[] }[],
    },
    {
      id: "letgo",
      from: "2015",
      to: "2023",
      fromFull: "jun. 2015",
      toFull: "ago. 2023",
      role: "Launch Manager / Senior Product Manager",
      company: "Letgo",
      type: "Jornada completa",
      kind: "fulltime",
      summary: "Implementación y gestión de nuevos proyectos estratégicos:",
      bullets: [] as string[],
      blocks: [
        {
          title: "Senior Product Manager",
          bullets: [
            "Comunicación y coordinación de diferentes equipos: \"Growth\", \"Platform\", \"B2B\", \"Search and Discovery\"",
            "Conceptualización y desarrollo de nuevas ideas en todas las plataformas (Android, iOS y Web)",
            "Priorización según valor de negocio y principales KPI",
            "Definición de especificaciones técnicas en proyectos de alto impacto",
            "Responsable de los A/B tests: construir los dashboards y dar visibilidad de los resultados",
            "Definición de los OKR y asegurarse que todos los KPI tienen los valores esperados",
          ],
        },
        {
          title: "Expansión internacional",
          bullets: [
            "Gestión inicial del contenido (23 países)",
            "Implementación del sistema de traducción, contratación de los traductores y coordinación del QA inicial (18 idiomas)",
          ],
        },
        {
          title: "Trust and Safety",
          bullets: [
            "Definición e implementación de distintos proyectos y reglas contra el fraude (spam / scam)",
          ],
        },
        {
          title: "Reconocimiento de imágenes con IA",
          bullets: [
            "Coordinación de la implantación del sistema",
            "Regulación de su aprendizaje y estudio de los resultados para el ajuste de los valores óptimos",
          ],
        },
        {
          title: "Customer Care",
          bullets: [
            "Contratación y training del equipo freelance de Customer Care (20 personas)",
            "Implementación del sistema de tickets y programación de los reports y automatismos",
          ],
        },
      ],
    },
    {
      id: "makai",
      from: "2018",
      to: "2022",
      fromFull: "dic. 2018",
      toFull: "dic. 2022",
      role: "Co-founder",
      company: "Makai — Make an impact",
      type: "Jornada parcial",
      kind: "side",
      summary:
        "Una marca optimista y positiva que crea prendas femeninas icónicas con un enfoque práctico para poder llevarlas en cualquier ocasión y ayuda a cambiar la vida de los niños más desfavorecidos, proporcionándoles alimento diario en su escuela. En MAKAI, por cada prenda vendida, se dona lo necesario para alimentar a un niño durante un mes en su escuela combatiendo así el hambre y fomentando la educación de la comunidad.",
      bullets: [] as string[],
      blocks: [] as { title: string; bullets: string[] }[],
    },
    {
      id: "fastisimo",
      from: "2015",
      to: "2015",
      fromFull: "abr. 2015",
      toFull: "may. 2015",
      role: "Mentor",
      company: "Fastísimo / IE Business School",
      type: "Jornada parcial",
      kind: "mentor",
      summary:
        "Mentor de Fastísimo en el Area 31 del IE Business School. La App nació con el fin de facilitar la vida a las personas llevándoles lo que quieran, donde y cuando quieran mediante una red de repartidores freelance. Bernardo Hernández se unió al proyecto y Fastísimo pasó a llamarse Ermes basando sus operaciones en Nueva York.",
      bullets: [] as string[],
      blocks: [] as { title: string; bullets: string[] }[],
    },
    {
      id: "nonabox",
      from: "2012",
      to: "2015",
      fromFull: "feb. 2012",
      toFull: "abr. 2015",
      role: "Director de Operaciones",
      company: "Nonabox",
      type: "Jornada completa",
      kind: "fulltime",
      summary: "Suscripción de cajas para bebés. De cero a operación internacional.",
      bullets: [
        "Gestión de más de 100.000 envíos realizados en 6 países.",
        "Organización de la estrategia de internacionalización",
        "Posterior centralización de las operaciones en Madrid",
        "Planificación de nuevos modelos de negocio como la Tienda Online y la Suscripción de Pañales",
        "Diseño de cohortes y otras herramientas para el análisis de resultados",
        "Scrum Master de un equipo de 30 personas con 6 Product Owners",
        "Negociación con proveedores y operadores logísticos",
        "Gestión del equipo de Atención al Cliente y Desarrollo de la web",
      ],
      blocks: [] as { title: string; bullets: string[] }[],
    },
    {
      id: "glossybox",
      from: "2011",
      to: "2012",
      fromFull: "sept. 2011",
      toFull: "ene. 2012",
      role: "Operaciones y Logística",
      company: "GLOSSYBOX",
      type: "Jornada completa",
      kind: "fulltime",
      summary: "",
      bullets: [
        "Gestión de miles de envíos mensuales.",
        "Relación con proveedores y operadores logísticos.",
        "Optimización del sistema logístico on-line y el CRM.",
        "Alineación entre el departamento de operaciones y atención al cliente",
      ],
      blocks: [] as { title: string; bullets: string[] }[],
    },
    {
      id: "icai",
      from: "2004",
      to: "2012",
      fromFull: "2004",
      toFull: "2012",
      role: "Ingeniería Industrial",
      company: "Universidad Pontificia Comillas — ICAI-ICADE",
      type: "Educación",
      kind: "edu",
      summary: "",
      bullets: [] as string[],
      blocks: [] as { title: string; bullets: string[] }[],
    },
  ],

  recos: [
    {
      quote: "I had the privilege of working Pablo, a dynamic and proactive colleague. Pablo is a hands-on problem solver, consistently driving solutions and fostering collaboration across departments. His exceptional interpersonal skills create a positive work environment. I highly recommend Pablo for his dedication, teamwork, and ability to navigate challenges seamlessly.",
      author: "Kerem Kocak",
      title: "Head of Product · ex-OLX, CAFU, Turkcell",
      photo: "/recomendadores/kerem.jpg",
      url: "https://www.linkedin.com/in/kerem-product/",
    },
    {
      quote: "Pablo and I worked together on letgo. I must say he is one of the best product managers I have worked with. His communication and prioritization skills, help team going forward a lot faster. He takes ownership on initiatives and deliveres valuable outcomes. Besides, he is very fun to work with. I believe he will be a great addition to any team.",
      author: "Yeliz Ustabas Lopez",
      title: "Risk and Fraud · Sr. Product Manager at Eventbrite",
      photo: "/recomendadores/yeliz.jpg",
      url: "https://www.linkedin.com/in/yeliz-ustabas/",
    },
    {
      quote: "I've had the pleasure of working closely with Pablo for several years, and I can confidently say that he is an exceptional professional. Pablo possesses a unique skill set that makes him a valuable asset to any team. I want to highlight his exceptional ability to solve complex problems and find practical solutions, as well as his remarkable adaptability when taking on new assignments. Above all, what sets Pablo apart is his positive attitude and friendly demeanor, which not only make working with him enjoyable but also foster a collaborative and welcoming work environment.",
      author: "David Adalid",
      title: "QA Specialist · ISTQB Certified",
      photo: "/recomendadores/david.jpg",
      url: "https://www.linkedin.com/in/david-adalid/",
    },
    {
      quote: "Pablo is a high-skilled one-man band. He is able to perform so many different roles but, at the same time, able to lead by example a group of ICs so they go the extra mile. He is easy-going, happy to negotiate and to reach agreements. He is not pure-techie, but you can throw him any kind of ball and he will be ready for it. I'd say of Pablo that he is one of a kind and I'd be delighted to work with him again.",
      author: "Jesús Rodríguez",
      title: "Agile Facilitator / People Developer",
      photo: "/recomendadores/jesus.jpg",
      url: "https://www.linkedin.com/in/jesusrh/",
    },
    {
      quote: "I had the privilege of working with Pablo for several years at the hyper-fast-growing startup letgo. Pablo is not only incredibly smart but also exceptionally hardworking. He's the kind of guy who's there to get the job done, no matter the challenge. ANY, really! Throw him a challenge and he will solve it. His fantastic sense of humor and positive attitude also make working with him a breeze.",
      author: "Adrià Vallès",
      title: "Engineering Manager · Lingokids",
      photo: "/recomendadores/adria.jpg",
      url: "https://www.linkedin.com/in/adriavalles/",
    },
    {
      quote: "Pablo showed unique skills for approaching challenges with pragmatism and out-of-the-box thinking that consistently resulted in innovative and effective solutions. Guided by Pablo's leadership, the team has had great business impact using complex technical initiatives like Home personalization and Search relevance. I have learned a lot from Pablo during this period, especially from his ability to quickly adapt to business changes.",
      author: "Julien Meynet",
      title: "AI/ML Leader · Search & Recommender Systems · PhD",
      photo: "/recomendadores/julien.jpg",
      url: "https://www.linkedin.com/in/julienmeynet/",
    },
    {
      quote: "You need something done and you need it quick... but you also need to align many stakeholders, while understanding the customers' pains and keeping in mind the technical limitations... Then Pablo is your man! He gets things done. He gets features shipped. And all while keeping a smile on... I miss working with him!",
      author: "Arnau Tibau Puig",
      title: "Data & AI for climate · PhD",
      photo: "/recomendadores/arnau.jpg",
      url: "https://www.linkedin.com/in/atibaup/",
    },
    {
      quote: "Es un honor recomendar a Pablo, una mente brillante con una habilidad asombrosa para simplificar problemas complejos y encontrar soluciones efectivas. Su curiosidad insaciable, proactividad y enfoque implacable en los objetivos hacen que sea un compañero excepcional. Gran líder y mentor, destaco su disposición constante para compartir conocimientos y desafiar ideas para encontrar las mejores soluciones.",
      author: "Janna Ubach",
      title: "Trust & Safety PM · N26 · ex-TikTok, ex-OLX",
      photo: "/recomendadores/janna.jpg",
      url: "https://www.linkedin.com/in/jannaubach/",
    },
    {
      quote: "Lo que más aprendí de Pablo es que siempre tenía actitud positiva, te daba mucha confianza y te ayudaba a tener todo bajo control. Otra de las virtudes de Pablo es que es muy multidisciplinar. Sin duda una de las cosas que más aprendí fue todo el tema de metodologías Agile, teníamos unas metodologías muy dinámicas en los procesos de trabajo.",
      author: "Dani Cruz",
      title: "AI Advertising",
      photo: "/recomendadores/dani.jpg",
      url: "https://www.linkedin.com/in/danicruzpaidsocial/",
    },
    {
      quote: "Pablo is a tenacious Product Owner and drives towards the best solutions with great efficiency. He considers all the possible outcomes and effects and will often think of issues in a solution that others will not. He's a great collaborator as well and will challenge you in your assumptions. He's also well versed technically and can get comfortably into the details with engineers.",
      author: "Mark Leung",
      title: "Principal Solution Strategist · Datavisor",
      photo: "/recomendadores/mark.jpg",
      url: "https://www.linkedin.com/in/mark-leung-8524105/",
    },
    {
      quote: "Pablo es una de las personas con las que mejor he trabajado. Su capacidad de comunicación es excepcional. Su organización es envidiable, siempre mantiene un enfoque claro y estructurado y sobretodo, muy pragmático. Lo que más me impresiona de Pablo es su adaptabilidad. Siempre se muestra alegre y con energía, contagiando a todos los que están a su alrededor y creando una atmósfera de colaboración y buen rollo como muy pocas personas son capaces de generar.",
      author: "Cristian Martin Mouat",
      title: "From tech strategy to hands-on development",
      photo: "/recomendadores/cristian.jpg",
      url: "https://www.linkedin.com/in/cristian-martin-mouat/",
    },
    {
      quote: "I thoroughly enjoyed meeting and working with Pablo for two years. He is an energetic, upbeat person who always lightens up any room he enters. Pablo has an inquisitive mind and sharp intellect and is a versatile problem solver. He has successfully found external providers, managed business operations, written SQL queries, and led mid-sized multidisciplinary teams. If this sounds too good to be true, just hop on a call with him and see for yourself.",
      author: "Jordi Escrich",
      title: "Data Specialist",
      photo: "/recomendadores/jordi.jpg",
      url: "https://www.linkedin.com/in/jordiescrich/",
    },
    {
      quote: "Pablo gets straight to the point, simplifies what is difficult and focuses on what is important. He makes the way easier for everyone to deliver the task while listening to all points of view. Nothing escapes him. As a designer I recommend Pablo 100%.",
      author: "Iván Bayo",
      title: "Designing impactful user experiences",
      photo: "/recomendadores/ivan.jpg",
      url: "https://www.linkedin.com/in/ivanbayo/",
    },
    {
      quote: "Pablo is a great professional. His strong analytical skills make him ready and able to solve every problem he has to face. He is able to manage huge work-load and to perform perfectly in stressful situations always keeping a smile on his face. I am sure he would be the perfect element for every team!",
      author: "Daniela Servi",
      title: "ESL Teacher · SCUOLA INTERNAZIONALE DI PAVIA",
      photo: "/recomendadores/daniela.jpg",
      url: "https://www.linkedin.com/in/danielaservi/",
    },
    {
      quote: "Pablo, es sin duda, una de las personas más inteligentes, trabajadoras y profesionales con las que he tenido el placer de trabajar. Además de gestionar la logística de Nonabox de forma soberbia, aplica sus conocimientos de forma práctica y antepone lo que juzga es mejor para la empresa. Siempre he intentado tener en cuenta su opinión para cualquier desarrollo, pues sabe abstraerse y pensar siempre de la forma correcta.",
      author: "Mario Pérez Pereira",
      title: "Head of Product",
      photo: "/recomendadores/mario.jpg",
      url: "https://www.linkedin.com/in/marioperezpereira/",
    },
  ],

  certs: [
    "Product Executive Certificate",
    "Certified Scrum Product Owner",
    "Certified Scrum Master",
    "Retention + Engagement Deep Dive",
    "Certified Mentor",
    "Diplôme d'Études en Langue Française",
    "First Certificate Exam",
    "Advanced Open Water Diver",
  ],

  languages: [
    { lang: "Español", level: "Competencia bilingüe o nativa", dots: 5 },
    { lang: "Inglés", level: "Competencia bilingüe o nativa", dots: 5 },
    { lang: "Francés", level: "Competencia básica profesional", dots: 3 },
    { lang: "Lengua de signos", level: "Competencia básica", dots: 2 },
  ],

  awards: [
    {
      title: "Best Startup Products & Services. Early Stage",
      org: "Spain Startup & Investor Summit · Nonabox",
      date: "oct. 2013",
    },
    {
      title: "Finalista StartCamp Madrid 2013",
      org: "Wayra — Telefónica · Proyecto iVecinos",
      date: "mar. 2013",
    },
    {
      title: "Tercer puesto campeonato nacional de capoeira",
      org: "",
      date: "may. 2009",
    },
    {
      title: "Primer puesto campeonato local de ajedrez",
      org: "",
      date: "jun. 1995",
    },
  ],

  skills: [
    "Gestión de productos",
    "Gestión de proyectos",
    "Gestión de personas",
    "Gestión de crisis",
    "Liderazgo de equipos",
    "Liderazgo de equipos multidisciplinarios",
    "Habilidades sociales",
    "Comunicación",
    "Toma de decisiones",
    "Mejora continua",
    "Mejora de procesos",
    "Metodologías ágiles",
    "Estrategia empresarial",
    "Estrategia del producto",
    "Estrategia digital",
    "Analítica de datos",
    "Análisis de negocio",
    "Toma de decisiones basadas en datos",
    "Experiencia de usuario",
    "Diseño de la interfaz de usuario",
    "Investigación de mercado",
    "Comportamiento del usuario",
    "Requisitos de productos",
    "Lanzamiento de productos",
    "Para empresas (B2B)",
    "Negociación",
    "Trabajo en equipo",
  ],

  skillSecret: {
    label: "Resolución de problemas",
    href: "/lab",
    title: "shhh",
  },
};

// ─── Section components ────────────────────────────────────────────────────

function Hero() {
  return (
    <header className="hero">
      <div className="hero-grid">
        <div className="hero-left">
          <div
            className="mono"
            style={{ marginBottom: 14, fontSize: 10 }}
          >
            PACR.ES &nbsp;·&nbsp; CURRÍCULUM &nbsp;·&nbsp; ED. 2026
          </div>
          <h1 className="display hero-name">
            Pablo
            <br />
            <span className="display-italic">Crespo</span>
            <span style={{ color: "var(--accent)" }}>.</span>
          </h1>
          <div className="hero-roles">{DATA.roles.join(" · ")}</div>
        </div>
        <figure className="hero-photo" style={{ margin: 0 }}>
          <div className="photo-tint" style={{ aspectRatio: "1 / 1" }}>
            <Image
              src="/pablo.png"
              alt="Pablo Crespo"
              width={500}
              height={500}
              priority
              style={{ objectFit: "cover" }}
            />
          </div>
        </figure>
      </div>
    </header>
  );
}

function Manifesto() {
  return (
    <section className="manifesto">
      <hr className="rule-strong" style={{ marginBottom: 18 }} />
      <div className="manifesto-grid">
        <div className="mono manifesto-label">SOBRE</div>
        <div>
          <p className="lede">{DATA.bio}</p>
          <p
            style={{
              marginTop: 14,
              fontSize: 17,
              lineHeight: 1.5,
              color: "var(--ink-2)",
              maxWidth: 760,
            }}
          >
            Siempre con una sonrisa, los grandes retos me hacen feliz:{" "}
            <span style={{ color: "var(--ink)" }}>organizar el caos</span>,{" "}
            <span style={{ color: "var(--ink)" }}>solucionar lo imposible</span>
            ,{" "}
            <span style={{ color: "var(--ink)" }}>gestionar lo inmanejable</span>
            .
          </p>
          <div
            style={{
              marginTop: 20,
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <a className="btn fill" href={`mailto:${DATA.email}`}>
              Contactar →
            </a>
            <a className="btn" href={DATA.linkedinUrl}>
              LinkedIn ↗
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function RoleEntry({
  entry,
  index,
  open,
  onToggle,
}: {
  entry: (typeof DATA.timeline)[0];
  index: number;
  open: boolean;
  onToggle: () => void;
}) {
  const total = DATA.timeline.length;
  const hasContent = entry.summary || entry.bullets.length > 0 || entry.blocks.length > 0;
  return (
    <article className="role-entry" style={{ cursor: hasContent ? "pointer" : "default" }} onClick={hasContent ? onToggle : undefined}>
      {/* Mobile: compact year header */}
      <div className="role-header-mobile">
        <div className="role-year-mobile">
          {entry.from}
          <span
            className="display-italic"
            style={{
              fontStyle: "italic",
              color: "var(--ink-3)",
              fontSize: 18,
            }}
          >
            {" "}
            — {entry.to}
          </span>
        </div>
        {entry.kind === "current" && (
          <span
            style={{ display: "inline-flex", alignItems: "center", gap: 5 }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "var(--accent)",
              }}
            />
            <span
              className="mono"
              style={{ color: "var(--accent)", fontSize: 9 }}
            >
              EN CURSO
            </span>
          </span>
        )}
      </div>

      {/* Desktop: year rail column (shown via grid) */}
      <aside className="role-grid">
        <div className="rail-year">{entry.from}</div>
        <div className="mono" style={{ marginTop: 6 }}>
          {entry.fromFull} →<br />
          {entry.toFull}
        </div>
        {entry.kind === "current" && (
          <div
            style={{
              marginTop: 14,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "var(--accent)",
              }}
            />
            <span className="mono" style={{ color: "var(--accent)" }}>
              EN CURSO
            </span>
          </div>
        )}
      </aside>

      {/* Content */}
      <div className="role-content">
        <div
          className="mono"
          style={{ color: "var(--ink-3)", marginBottom: 6, fontSize: 9 }}
        >
          {String(index + 1).padStart(2, "0")} / {total} · {entry.fromFull} →{" "}
          {entry.toFull}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
          <h3
            className="display"
            style={{ fontSize: 22, margin: 0, lineHeight: 1.15, fontWeight: 500 }}
          >
            {entry.role}
          </h3>
          {hasContent && (
            <span className="mono" style={{ fontSize: 10, color: "var(--ink-3)", flexShrink: 0, transition: "transform 0.2s", display: "inline-block", transform: open ? "rotate(90deg)" : "none" }}>
              ▶
            </span>
          )}
        </div>
        <div style={{ marginTop: 4, fontSize: 13.5, color: "var(--ink-2)" }}>
          <span style={{ color: "var(--ink)" }}>{entry.company}</span>
          {entry.type && (
            <>
              {" "}
              ·{" "}
              <span className="display-italic" style={{ fontSize: 12.5 }}>
                {entry.type}
              </span>
            </>
          )}
        </div>
        <div style={{
          maxHeight: open ? "3000px" : "0",
          overflow: "hidden",
          transition: "max-height 0.4s ease, opacity 0.3s ease",
          opacity: open ? 1 : 0,
        }}>
          {entry.summary && (
            <p
              style={{
                marginTop: 10,
                fontSize: 13.5,
                lineHeight: 1.5,
                color: "var(--ink-2)",
              }}
            >
              {entry.summary}
            </p>
          )}
          {entry.bullets.length > 0 && (
            <ul
              style={{
                marginTop: 10,
                paddingLeft: 16,
                fontSize: 12.5,
                lineHeight: 1.55,
                color: "var(--ink-2)",
              }}
            >
              {entry.bullets.map((b, i) => (
                <li key={i} style={{ marginBottom: 3 }}>
                  {b}
                </li>
              ))}
            </ul>
          )}
          {entry.blocks.length > 0 && (
            <div style={{ marginTop: 12 }}>
              {entry.blocks.map((blk, i) => (
                <div
                  key={i}
                  style={{
                    borderTop: "1px solid var(--rule)",
                    paddingTop: 10,
                    marginTop: 10,
                  }}
                >
                  <div
                    className="display"
                    style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 6 }}
                  >
                    {blk.title}
                  </div>
                  <ul
                    style={{
                      margin: 0,
                      paddingLeft: 14,
                      fontSize: 12,
                      lineHeight: 1.5,
                      color: "var(--ink-2)",
                    }}
                  >
                    {blk.bullets.map((b, j) => (
                      <li key={j} style={{ marginBottom: 2 }}>
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function Timeline() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  return (
    <section className="timeline-section">
      <div className="section-header">
        <h2 className="display section-title">
          Trayectoria
        </h2>
        <div className="mono" style={{ fontSize: 9 }}>
          7 PARADAS
        </div>
      </div>
      <hr className="rule-strong" />
      {DATA.timeline.map((entry, i) => (
        <RoleEntry
          key={entry.id}
          entry={entry}
          index={i}
          open={openIdx === i}
          onToggle={() => setOpenIdx(openIdx === i ? null : i)}
        />
      ))}
      <hr className="rule" />
    </section>
  );
}

function Recos() {
  const recos = DATA.recos;
  const total = recos.length;
  const [idx, setIdx] = useState(0);
  const r = recos[idx];
  const prev = () => setIdx((i) => (i - 1 + total) % total);
  const next = () => setIdx((i) => (i + 1) % total);

  return (
    <section className="recos-section">
      <div className="recos-header">
        <div className="mono" style={{ fontSize: 9 }}>
          RECOMENDACIONES · {String(idx + 1).padStart(2, "0")} /{" "}
          {String(total).padStart(2, "0")}
        </div>
        <div className="reco-arrows">
          <button
            type="button"
            className="reco-arrow"
            onClick={prev}
            disabled={total <= 1}
            aria-label="Anterior"
          >
            ←
          </button>
          <button
            type="button"
            className="reco-arrow"
            onClick={next}
            disabled={total <= 1}
            aria-label="Siguiente"
          >
            →
          </button>
        </div>
      </div>

      <blockquote>
        <span
          style={{
            fontSize: 36,
            color: "var(--accent)",
            lineHeight: 0,
            verticalAlign: "-12px",
            marginRight: 3,
          }}
        >
          &ldquo;
        </span>
        {r.quote}
        <span
          style={{
            fontSize: 36,
            color: "var(--accent)",
            lineHeight: 0,
            verticalAlign: "-12px",
            marginLeft: 3,
          }}
        >
          &rdquo;
        </span>
      </blockquote>

      <div className="reco-author">
        <a href={r.url} style={{ flexShrink: 0, borderRadius: "50%", overflow: "hidden", display: "block", width: 48, height: 48, border: "1px solid var(--ink-4)" }}>
          <Image src={r.photo} alt={r.author} width={48} height={48} style={{ objectFit: "cover", display: "block" }} />
        </a>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>
            <a href={r.url} className="link-underline">
              {r.author} ↗
            </a>
          </div>
          <div className="small" style={{ fontSize: 11 }}>
            {r.title}
          </div>
        </div>
      </div>

      {total > 1 && (
        <div style={{ marginTop: 16, display: "flex", gap: 5 }}>
          {recos.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIdx(i)}
              aria-label={`Recomendación ${i + 1}`}
              style={{
                width: i === idx ? 22 : 7,
                height: 7,
                borderRadius: 4,
                border: "none",
                padding: 0,
                background:
                  i === idx ? "var(--accent)" : "var(--ink-4)",
                cursor: "pointer",
                transition: "all .25s ease",
              }}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function Skills() {
  return (
    <section className="skills-section" style={{ opacity: 0.6 }}>
      <hr className="rule" style={{ marginBottom: 12 }} />
      <div className="mono" style={{ fontSize: 10, marginBottom: 10, color: "var(--ink-3)" }}>Aptitudes</div>
      <div className="chips-wrap" style={{ gap: 5 }}>
        {DATA.skills.map((s, i) => (
          <span key={i} className="chip" style={{ fontSize: 10, padding: "2px 7px", color: "var(--ink-3)" }}>
            {s}
          </span>
        ))}
        <a
          className="chip lab"
          href={DATA.skillSecret.href}
          title={DATA.skillSecret.title}
          style={{ fontSize: 10, padding: "2px 7px" }}
        >
          {DATA.skillSecret.label}
        </a>
      </div>
    </section>
  );
}

function Misc() {
  return (
    <section className="misc-section">
      <div className="misc-grid">
        {/* Columna izq (desktop) / primero en mobile: Idiomas */}
        <div>
          <h2
            className="display"
            style={{ fontSize: 22, margin: "20px 0 8px", fontWeight: 400 }}
          >
            Idiomas
          </h2>
          <hr className="rule" style={{ marginBottom: 4 }} />
          {DATA.languages.map((l, i) => (
            <div key={i} className="lang-row">
              <span style={{ fontSize: 13, fontWeight: 500 }}>{l.lang}</span>
              <span className="small" style={{ fontSize: 10.5 }}>
                {l.level}
              </span>
              <span className="lang-dots">
                {[1, 2, 3, 4, 5].map((n) => (
                  <span key={n} className={n <= l.dots ? "on" : ""} />
                ))}
              </span>
            </div>
          ))}

          <h2
            className="display"
            style={{ fontSize: 22, margin: "28px 0 8px", fontWeight: 400 }}
          >
            Reconocimientos
          </h2>
          <hr className="rule" style={{ marginBottom: 4 }} />
          {DATA.awards.map((a, i) => (
            <div key={i} className="award-row">
              <span
                className="mono"
                style={{ color: "var(--accent)", whiteSpace: "nowrap", fontSize: 10 }}
              >
                {a.date}
              </span>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 500, lineHeight: 1.3 }}>
                  {a.title}
                </div>
                {a.org && (
                  <div className="small" style={{ fontSize: 11 }}>
                    {a.org}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Columna der (desktop) / segundo en mobile: Certificaciones */}
        <div>
          <h2
            className="display"
            style={{ fontSize: 22, margin: "20px 0 8px", fontWeight: 400 }}
          >
            Certificaciones
          </h2>
          <hr className="rule" style={{ marginBottom: 4 }} />
          <ul className="cert-list">
            {DATA.certs.map((c, i) => (
              <li key={i} className="cert-item">
                <span className="mono" style={{ color: "var(--ink-3)", fontSize: 10 }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span style={{ fontSize: 13 }}>{c}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer style={{ padding: "2.5rem var(--pad-x, 22px) 4rem", borderTop: "3px double var(--ink)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span className="mono" style={{ fontSize: 11 }}>pacr.es</span>
        <a
          href={DATA.linkedinUrl}
          className="mono link-underline"
          style={{ fontSize: 11 }}
        >
          LinkedIn →
        </a>
      </div>
      <p className="mono" style={{ textAlign: "center", marginTop: "0.75rem", fontSize: 11 }}>
        Creado el 30 de abril de 2026
      </p>
    </footer>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function EditorialPage() {
  return (
    <div className="editorial">
      <Hero />
      <Manifesto />
      <Timeline />
      <Recos />
      <Misc />
      <Skills />
      <Footer />
      <HomeNav />
    </div>
  );
}
