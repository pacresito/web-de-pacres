"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";

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

const RECS = [
  {
    quote: "I had the privilege of working Pablo, a dynamic and proactive colleague. Pablo is a hands-on problem solver, consistently driving solutions and fostering collaboration across departments. His exceptional interpersonal skills create a positive work environment. I highly recommend Pablo for his dedication, teamwork, and ability to navigate challenges seamlessly.",
    author: "Kerem Kocak",
    role: "Head of Product · ex-OLX, CAFU, Turkcell",
    photo: "/recomendadores/kerem.jpg",
    url: "https://www.linkedin.com/in/kerem-product/",
  },
  {
    quote: "Pablo and I worked together on letgo. I must say he is one of the best product managers I have worked with. His communication and prioritization skills, help team going forward a lot faster. He takes ownership on initiatives and deliveres valuable outcomes. Besides, he is very fun to work with. I believe he will be a great addition to any team.",
    author: "Yeliz Ustabas Lopez",
    role: "Risk and Fraud · Sr. Product Manager at Eventbrite",
    photo: "/recomendadores/yeliz.jpg",
    url: "https://www.linkedin.com/in/yeliz-ustabas/",
  },
  {
    quote: "I've had the pleasure of working closely with Pablo for several years, and I can confidently say that he is an exceptional professional. Pablo possesses a unique skill set that makes him a valuable asset to any team. I want to highlight his exceptional ability to solve complex problems and find practical solutions, as well as his remarkable adaptability when taking on new assignments. Above all, what sets Pablo apart is his positive attitude and friendly demeanor, which not only make working with him enjoyable but also foster a collaborative and welcoming work environment.",
    author: "David Adalid",
    role: "QA Specialist · ISTQB Certified",
    photo: "/recomendadores/david.jpg",
    url: "https://www.linkedin.com/in/david-adalid/",
  },
  {
    quote: "Pablo is a high-skilled one-man band. He is able to perform so many different roles but, at the same time, able to lead by example a group of ICs so they go the extra mile. He is easy-going, happy to negotiate and to reach agreements. He is not pure-techie, but you can throw him any kind of ball and he will be ready for it. I'd say of Pablo that he is one of a kind and I'd be delighted to work with him again.",
    author: "Jesús Rodríguez",
    role: "Agile Facilitator / People Developer",
    photo: "/recomendadores/jesus.jpg",
    url: "https://www.linkedin.com/in/jesusrh/",
  },
  {
    quote: "I had the privilege of working with Pablo for several years at the hyper-fast-growing startup letgo. Pablo is not only incredibly smart but also exceptionally hardworking. He's the kind of guy who's there to get the job done, no matter the challenge. ANY, really! Throw him a challenge and he will solve it. His fantastic sense of humor and positive attitude also make working with him a breeze.",
    author: "Adrià Vallès",
    role: "Engineering Manager · Lingokids",
    photo: "/recomendadores/adria.jpg",
    url: "https://www.linkedin.com/in/adriavalles/",
  },
  {
    quote: "Pablo showed unique skills for approaching challenges with pragmatism and out-of-the-box thinking that consistently resulted in innovative and effective solutions. Guided by Pablo's leadership, the team has had great business impact using complex technical initiatives like Home personalization and Search relevance. I have learned a lot from Pablo during this period, especially from his ability to quickly adapt to business changes.",
    author: "Julien Meynet",
    role: "AI/ML Leader · Search & Recommender Systems · PhD",
    photo: "/recomendadores/julien.jpg",
    url: "https://www.linkedin.com/in/julienmeynet/",
  },
  {
    quote: "You need something done and you need it quick... but you also need to align many stakeholders, while understanding the customers' pains and keeping in mind the technical limitations... Then Pablo is your man! He gets things done. He gets features shipped. And all while keeping a smile on... I miss working with him!",
    author: "Arnau Tibau Puig",
    role: "Data & AI for climate · PhD",
    photo: "/recomendadores/arnau.jpg",
    url: "https://www.linkedin.com/in/atibaup/",
  },
  {
    quote: "Es un honor recomendar a Pablo, una mente brillante con una habilidad asombrosa para simplificar problemas complejos y encontrar soluciones efectivas. Su curiosidad insaciable, proactividad y enfoque implacable en los objetivos hacen que sea un compañero excepcional. Gran líder y mentor, destaco su disposición constante para compartir conocimientos y desafiar ideas para encontrar las mejores soluciones.",
    author: "Janna Ubach",
    role: "Trust & Safety PM · N26 · ex-TikTok, ex-OLX",
    photo: "/recomendadores/janna.jpg",
    url: "https://www.linkedin.com/in/jannaubach/",
  },
  {
    quote: "Lo que más aprendí de Pablo es que siempre tenía actitud positiva, te daba mucha confianza y te ayudaba a tener todo bajo control. Otra de las virtudes de Pablo es que es muy multidisciplinar. Sin duda una de las cosas que más aprendí fue todo el tema de metodologías Agile, teníamos unas metodologías muy dinámicas en los procesos de trabajo.",
    author: "Dani Cruz",
    role: "AI Advertising",
    photo: "/recomendadores/dani.jpg",
    url: "https://www.linkedin.com/in/danicruzpaidsocial/",
  },
  {
    quote: "Pablo is a tenacious Product Owner and drives towards the best solutions with great efficiency. He considers all the possible outcomes and effects and will often think of issues in a solution that others will not. He's a great collaborator as well and will challenge you in your assumptions. He's also well versed technically and can get comfortably into the details with engineers.",
    author: "Mark Leung",
    role: "Principal Solution Strategist · Datavisor",
    photo: "/recomendadores/mark.jpg",
    url: "https://www.linkedin.com/in/mark-leung-8524105/",
  },
  {
    quote: "Pablo es una de las personas con las que mejor he trabajado. Su capacidad de comunicación es excepcional. Su organización es envidiable, siempre mantiene un enfoque claro y estructurado y sobretodo, muy pragmático. Lo que más me impresiona de Pablo es su adaptabilidad. Siempre se muestra alegre y con energía, contagiando a todos los que están a su alrededor y creando una atmósfera de colaboración y buen rollo como muy pocas personas son capaces de generar.",
    author: "Cristian Martin Mouat",
    role: "From tech strategy to hands-on development",
    photo: "/recomendadores/cristian.jpg",
    url: "https://www.linkedin.com/in/cristian-martin-mouat/",
  },
  {
    quote: "I thoroughly enjoyed meeting and working with Pablo for two years. He is an energetic, upbeat person who always lightens up any room he enters. Pablo has an inquisitive mind and sharp intellect and is a versatile problem solver. He has successfully found external providers, managed business operations, written SQL queries, and led mid-sized multidisciplinary teams. If this sounds too good to be true, just hop on a call with him and see for yourself.",
    author: "Jordi Escrich",
    role: "Data Specialist",
    photo: "/recomendadores/jordi.jpg",
    url: "https://www.linkedin.com/in/jordiescrich/",
  },
  {
    quote: "Pablo gets straight to the point, simplifies what is difficult and focuses on what is important. He makes the way easier for everyone to deliver the task while listening to all points of view. Nothing escapes him. As a designer I recommend Pablo 100%.",
    author: "Iván Bayo",
    role: "Designing impactful user experiences",
    photo: "/recomendadores/ivan.jpg",
    url: "https://www.linkedin.com/in/ivanbayo/",
  },
  {
    quote: "Pablo is a great professional. His strong analytical skills make him ready and able to solve every problem he has to face. He is able to manage huge work-load and to perform perfectly in stressful situations always keeping a smile on his face. I am sure he would be the perfect element for every team!",
    author: "Daniela Servi",
    role: "ESL Teacher · SCUOLA INTERNAZIONALE DI PAVIA",
    photo: "/recomendadores/daniela.jpg",
    url: "https://www.linkedin.com/in/danielaservi/",
  },
  {
    quote: "Pablo, es sin duda, una de las personas más inteligentes, trabajadoras y profesionales con las que he tenido el placer de trabajar. Además de gestionar la logística de Nonabox de forma soberbia, aplica sus conocimientos de forma práctica y antepone lo que juzga es mejor para la empresa. Siempre he intentado tener en cuenta su opinión para cualquier desarrollo, pues sabe abstraerse y pensar siempre de la forma correcta.",
    author: "Mario Pérez Pereira",
    role: "Head of Product",
    photo: "/recomendadores/mario.jpg",
    url: "https://www.linkedin.com/in/marioperezpereira/",
  },
];

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
        <div className="job-desc" style={{
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
        height: "320px",
        display: "flex", flexDirection: "column", justifyContent: "space-between",
        borderRadius: "4px",
        overflow: "hidden",
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
              style={{ fontSize: "0.85rem", fontWeight: 600, color: "#1e3a5f", textDecoration: "none", transition: "color 0.2s" }}
              onMouseEnter={e => (e.currentTarget.style.color = "var(--blue-accent)")}
              onMouseLeave={e => (e.currentTarget.style.color = "#1e3a5f")}
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
            <button key={i} onClick={() => setCurrent(i)} style={{
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
            <button key={label} onClick={fn} style={{
              background: "none", border: "1px solid rgba(96,165,250,0.25)",
              color: "#6b7280", width: 32, height: 32, cursor: "pointer",
              fontSize: "0.75rem", borderRadius: "2px", transition: "border-color 0.2s, color 0.2s",
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--blue-accent)"; e.currentTarget.style.color = "var(--blue-accent)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(96,165,250,0.25)"; e.currentTarget.style.color = "#6b7280"; }}
            >{label}</button>
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
  const [transformed, setTransformed] = useState(false);
  const transformedRef = useRef(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (cursorGlowRef.current) {
        cursorGlowRef.current.style.left = `${e.clientX}px`;
        cursorGlowRef.current.style.top = `${e.clientY}px`;
      }
      if (pressHaloRef.current) {
        pressHaloRef.current.style.left = `${e.clientX}px`;
        pressHaloRef.current.style.top = `${e.clientY}px`;
      }
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useEffect(() => {
    const handleMouseDown = () => {
      holdSecsRef.current = 0;
      holdTimerRef.current = setInterval(() => {
        holdSecsRef.current += 0.05;
        const secs = holdSecsRef.current;
        const isBlue = transformedRef.current;
        if (secs >= 5.5) {
          setTransformed(!isBlue);
          if (holdTimerRef.current) clearInterval(holdTimerRef.current);
          if (pressHaloRef.current) { pressHaloRef.current.style.opacity = "0"; }
          return;
        }
        if (pressHaloRef.current) {
          // 0–1s: nada. 1–5s: crece. 5–5.5s: máximo
          const progress = secs < 1 ? 0 : Math.min((secs - 1) / 4, 1);
          const size = 80 + progress * 1000;
          const opacity = progress * 0.85;
          pressHaloRef.current.style.width = `${size}px`;
          pressHaloRef.current.style.height = `${size}px`;
          pressHaloRef.current.style.opacity = `${opacity}`;
          // Color del halo según estado actual
          const color = isBlue ? "255,255,255" : "59,130,246";
          pressHaloRef.current.style.background = `radial-gradient(circle, rgba(${color},0.7) 0%, rgba(${color},0.3) 40%, transparent 70%)`;
        }
      }, 50);
    };
    const handleMouseUp = () => {
      if (holdTimerRef.current) clearInterval(holdTimerRef.current);
      holdSecsRef.current = 0;
      if (pressHaloRef.current) {
        pressHaloRef.current.style.width = "80px";
        pressHaloRef.current.style.height = "80px";
        pressHaloRef.current.style.opacity = "0";
      }
    };
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
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
      document.body.classList.add("page-transformed");
    } else {
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
          width: 80px; height: 80px; opacity: 0;
          transition: width 0.08s ease, height 0.08s ease, opacity 0.15s ease;
          filter: blur(18px);
        }

        body.page-transformed {
          background: #1e40af !important;
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
          transform: translate(-50%,-50%); pointer-events: none; z-index: 0;
          transition: left 0.12s ease, top 0.12s ease;
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
        .job-item:hover { border-color: rgba(96,165,250,0.3); }

        .job-title {
          font-size: 1rem; font-weight: 600; color: var(--text);
          position: relative; display: inline-block;
        }
        .job-title::after {
          content: ""; position: absolute; bottom: -2px; left: 0;
          width: 0; height: 1px; background: var(--blue-accent); transition: width 0.35s ease;
        }
        .job-item:hover .job-title::after { width: 100%; }

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
        .cert-tag:hover { border-color: var(--blue-accent); color: var(--blue-accent); background: rgba(96,165,250,0.05); }

        .skill-tag {
          display: inline-block; font-size: 0.72rem; color: var(--text-muted);
          border: 1px solid rgba(0,0,0,0.08); padding: 0.3rem 0.7rem;
          border-radius: 3px; font-family: var(--font-geist-mono), monospace;
          letter-spacing: 0.02em; background: #f9fafb;
          transition: border-color 0.2s, color 0.2s, background 0.2s; cursor: default;
        }
        .skill-tag:hover { border-color: rgba(96,165,250,0.4); color: var(--blue-accent); background: rgba(96,165,250,0.05); }

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
        .cta-button:hover { background: rgba(96,165,250,0.08); border-color: var(--blue-accent); }

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
          <p className="reveal reveal-delay-3" style={{marginTop:"1.5rem",maxWidth:"52ch",fontSize:"1rem",lineHeight:"1.8",color:"var(--text-dim)"}}>
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
          <div className="reveal reveal-delay-1">
            <RecsSlider />
          </div>
        </section>

        <hr className="divider" />

        {/* Certificaciones */}
        <section style={{padding:"5rem 0"}}>
          <p className="reveal section-label">Certificaciones</p>
          <div className="reveal reveal-delay-1" style={{display:"flex",flexWrap:"wrap",gap:"0.6rem"}}>
            {[
              {label:"Product Executive Certificate", issuer:"Product School", year:"nov. 2021"},
              {label:"Certified Scrum Product Owner", issuer:"Agilar Spain", year:"may. 2017"},
              {label:"Certified Scrum Master", issuer:"Agilar Spain", year:"abr. 2017"},
              {label:"Retention + Engagement Deep Dive", issuer:"Reforge", year:"nov. 2018"},
              {label:"Certified Mentor", issuer:"Mentorloop", year:"abr. 2022"},
              {label:"Diplôme d'Études en Langue Française", issuer:"Ministère de l'Éducation nationale", year:"jul. 2002"},
              {label:"First Certificate Exam", issuer:"University of Cambridge", year:"jun. 2002"},
              {label:"Advanced Open Water Diver", issuer:"PADI", year:"ago. 2009"},
            ].map((cert) => (
              <span key={cert.label} className="cert-tag" title={`${cert.issuer} · ${cert.year}`}>{cert.label}</span>
            ))}
          </div>
        </section>

        <hr className="divider" />

        {/* Idiomas */}
        <section style={{padding:"5rem 0"}}>
          <p className="reveal section-label">Idiomas</p>
          <div className="reveal reveal-delay-1">
            {[
              {lang:"Español", level:"Competencia bilingüe o nativa"},
              {lang:"Inglés", level:"Competencia bilingüe o nativa"},
              {lang:"Francés", level:"Competencia básica profesional"},
              {lang:"Lengua de signos", level:"Competencia básica"},
            ].map((l) => (
              <div key={l.lang} className="lang-row">
                <span style={{fontWeight:600,fontSize:"0.95rem"}}>{l.lang}</span>
                <span style={{fontSize:"0.72rem",color:"var(--text-muted)",fontFamily:"var(--font-geist-mono),monospace"}}>{l.level}</span>
              </div>
            ))}
          </div>
        </section>

        <hr className="divider" />

        {/* Reconocimientos */}
        <section style={{padding:"5rem 0"}}>
          <p className="reveal section-label">Reconocimientos</p>
          <div className="reveal reveal-delay-1">
            {[
              {title:"Best Startup Products & Services. Early Stage", issuer:"Spain Startup & Investor Summit", note:"Nonabox", year:"oct. 2013"},
              {title:"Finalista StartCamp Madrid 2013", issuer:"Wayra — Telefónica", note:"Proyecto iVecinos", year:"mar. 2013"},
              {title:"Tercer puesto campeonato nacional de capoeira", issuer:"", note:"", year:"may. 2009"},
              {title:"Primer puesto campeonato local de ajedrez", issuer:"", note:"", year:"jun. 1995"},
            ].map((award) => (
              <div key={award.title} className="award-item">
                <div>
                  <p style={{fontWeight:600,fontSize:"0.95rem"}}>{award.title}</p>
                  {(award.issuer || award.note) && (
                    <p style={{fontSize:"0.75rem",color:"var(--text-muted)",marginTop:"0.2rem",fontFamily:"var(--font-geist-mono),monospace"}}>
                      {[award.issuer, award.note].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>
                <p style={{fontSize:"0.72rem",color:"var(--text-muted)",fontFamily:"var(--font-geist-mono),monospace",whiteSpace:"nowrap",paddingTop:"0.2rem"}}>{award.year}</p>
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
              "Para empresas (B2B)","Negociación","Trabajo en equipo",
            ].map((skill) => (
              <span key={skill} className="skill-tag">{skill}</span>
            ))}
            <a href="/juegos/espiral" className="skill-tag" style={{ textDecoration: "none" }}>Resolución de problemas</a>
          </div>
        </section>

        <hr className="divider" />

        {/* Footer */}
        <footer style={{padding:"2.5rem 0",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <span style={{fontSize:"0.78rem",color:"var(--text-muted)",fontFamily:"var(--font-geist-mono),monospace"}}>
            pacr.es
          </span>
          <a href="https://www.linkedin.com/in/pacres/" target="_blank" rel="noopener noreferrer"
            style={{fontSize:"0.78rem",color:"var(--text-muted)",fontFamily:"var(--font-geist-mono),monospace",textDecoration:"none",transition:"color 0.2s"}}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--blue-accent)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--text-muted)")}
          >LinkedIn →</a>
        </footer>

      </main>
    </>
  );
}
