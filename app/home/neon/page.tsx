"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import HomeNav from "../../components/HomeNav";

// ─── DATA ────────────────────────────────────────────────────────────────────

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
        <p className="t-sub">Senior Product Manager</p>
        <ul>
          <li>Comunicación y coordinación de diferentes equipos: &ldquo;Growth&rdquo;, &ldquo;Platform&rdquo;, &ldquo;B2B&rdquo;, &ldquo;Search and Discovery&rdquo;</li>
          <li>Conceptualización y desarrollo de nuevas ideas en todas las plataformas (Android, iOS y Web)</li>
          <li>Priorización según valor de negocio y principales KPI</li>
          <li>Definición de especificaciones técnicas en proyectos de alto impacto</li>
          <li>Responsable de los A/B tests: construir los dashboards y dar visibilidad de los resultados</li>
          <li>Definición de los OKR y asegurarse que todos los KPI tienen los valores esperados</li>
        </ul>
        <p className="t-sub">Expansión internacional</p>
        <ul>
          <li>Gestión inicial del contenido (23 países)</li>
          <li>Implementación del sistema de traducción, contratación de los traductores y coordinación del QA inicial (18 idiomas)</li>
        </ul>
        <p className="t-sub">Trust and Safety</p>
        <ul>
          <li>Definición e implementación de distintos proyectos y reglas contra el fraude (spam / scam)</li>
        </ul>
        <p className="t-sub">Reconocimiento de imágenes con IA</p>
        <ul>
          <li>Coordinación de la implantación del sistema</li>
          <li>Regulación de su aprendizaje y estudio de los resultados para el ajuste de los valores óptimos</li>
        </ul>
        <p className="t-sub">Customer Care</p>
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

const SKILLS = [
  "Gestión de productos","Gestión de proyectos","Gestión de personas","Gestión de crisis",
  "Liderazgo de equipos","Liderazgo de equipos multidisciplinarios","Habilidades sociales",
  "Comunicación","Toma de decisiones","Mejora continua","Mejora de procesos",
  "Metodologías ágiles","Estrategia empresarial","Estrategia del producto","Estrategia digital",
  "Analítica de datos","Análisis de negocio","Toma de decisiones basadas en datos",
  "Experiencia de usuario","Diseño de la interfaz de usuario","Investigación de mercado",
  "Comportamiento del usuario","Requisitos de productos","Lanzamiento de productos",
  "Para empresas (B2B)","Negociación","Trabajo en equipo","Resolución de problemas",
];

// ─── STARFIELD ────────────────────────────────────────────────────────────────

function Starfield() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = document.documentElement.clientWidth;
      canvas.height = document.documentElement.clientHeight;
    };
    resize();

    const COLORS = ["#ff006e","#00ffff","#c8ff00","#bf5af2","#ff6b35","#ffffff"];
    const stars = Array.from({ length: 180 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.8 + 0.2,
      speed: Math.random() * 0.4 + 0.08,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      twinkle: Math.random() * Math.PI * 2,
    }));

    // Occasional shooting star
    const shooters: { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: string }[] = [];
    let shootTimer = 0;

    let raf: number;
    let frame = 0;

    const draw = () => {
      ctx.fillStyle = "rgba(10, 10, 15, 0.18)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      frame++;

      // Shooting stars
      shootTimer++;
      if (shootTimer > 120 + Math.random() * 200) {
        shootTimer = 0;
        shooters.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height * 0.5,
          vx: 4 + Math.random() * 6,
          vy: 1.5 + Math.random() * 3,
          life: 0,
          maxLife: 40 + Math.random() * 30,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
        });
      }

      for (let i = shooters.length - 1; i >= 0; i--) {
        const s = shooters[i];
        s.life++;
        const alpha = s.life < 10 ? s.life / 10 : (s.maxLife - s.life) / s.maxLife;
        const trail = 35;
        const grad = ctx.createLinearGradient(s.x - s.vx * trail, s.y - s.vy * trail, s.x, s.y);
        grad.addColorStop(0, "transparent");
        grad.addColorStop(1, s.color);
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(s.x - s.vx * trail, s.y - s.vy * trail);
        ctx.lineTo(s.x, s.y);
        ctx.stroke();
        ctx.globalAlpha = 1;
        s.x += s.vx;
        s.y += s.vy;
        if (s.life >= s.maxLife) shooters.splice(i, 1);
      }

      stars.forEach((star) => {
        star.twinkle += 0.03;
        const alpha = 0.4 + Math.sin(star.twinkle) * 0.4;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        ctx.fillStyle = star.color;
        ctx.fill();
        ctx.globalAlpha = 1;
        star.y += star.speed;
        if (star.y > canvas.height + 5) {
          star.y = -5;
          star.x = Math.random() * canvas.width;
        }
      });

      raf = requestAnimationFrame(draw);
    };
    draw();

    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}
    />
  );
}

// ─── CUSTOM CURSOR ────────────────────────────────────────────────────────────

function NeonCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate(${e.clientX - 20}px, ${e.clientY - 20}px)`;
      }
      if (dotRef.current) {
        dotRef.current.style.transform = `translate(${e.clientX - 3}px, ${e.clientY - 3}px)`;
      }
    };
    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, []);

  return (
    <>
      <div ref={cursorRef} style={{
        position: "fixed", top: 0, left: 0, width: 40, height: 40,
        border: "1px solid rgba(255,0,110,0.6)",
        borderRadius: "50%",
        pointerEvents: "none", zIndex: 9999,
        transition: "transform 0.08s ease",
        mixBlendMode: "screen",
      }} />
      <div ref={dotRef} style={{
        position: "fixed", top: 0, left: 0, width: 6, height: 6,
        background: "#ff006e",
        borderRadius: "50%",
        pointerEvents: "none", zIndex: 9999,
        transition: "transform 0.02s ease",
        boxShadow: "0 0 8px #ff006e",
      }} />
    </>
  );
}

// ─── JOB ITEM ─────────────────────────────────────────────────────────────────

function JobItem({ job, index }: { job: typeof JOBS[0]; index: number }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      onClick={() => setOpen((v) => !v)}
      style={{
        borderBottom: "1px solid rgba(255,0,110,0.2)",
        padding: "1.5rem 0",
        cursor: "pointer",
        transition: "border-color 0.3s, background 0.3s",
        paddingLeft: "1rem",
        borderLeft: open ? "2px solid #ff006e" : "2px solid transparent",
        background: open ? "rgba(255,0,110,0.03)" : "transparent",
        animationDelay: `${index * 0.08}s`,
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.borderLeftColor = "#ff006e";
        (e.currentTarget as HTMLDivElement).style.background = "rgba(255,0,110,0.04)";
      }}
      onMouseLeave={e => {
        if (!open) {
          (e.currentTarget as HTMLDivElement).style.borderLeftColor = "transparent";
          (e.currentTarget as HTMLDivElement).style.background = "transparent";
        }
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1.5rem" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <span style={{
              fontFamily: "var(--font-geist-mono), monospace",
              fontSize: "0.6rem",
              color: "#ff006e",
              transition: "transform 0.25s",
              display: "inline-block",
              transform: open ? "rotate(90deg)" : "rotate(0deg)",
            }}>▶</span>
            <span style={{
              fontSize: "1rem", fontWeight: 700,
              color: "#fff",
              fontFamily: "var(--font-geist-mono), monospace",
              letterSpacing: "0.02em",
            }}>{job.title}</span>
          </div>
          <p style={{
            fontSize: "0.72rem", color: "rgba(255,0,110,0.7)",
            marginTop: "0.3rem", marginLeft: "1.1rem",
            fontFamily: "var(--font-geist-mono), monospace",
            letterSpacing: "0.04em",
          }}>{job.company}</p>
          <div style={{
            maxHeight: open ? "800px" : "0",
            overflow: "hidden",
            transition: "max-height 0.45s ease, opacity 0.35s ease",
            opacity: open ? 1 : 0,
            marginTop: open ? "0.8rem" : 0,
            marginLeft: "1.1rem",
          }}>
            <div className="job-desc-inner">{job.description}</div>
          </div>
        </div>
        <p style={{
          fontSize: "0.65rem", color: "rgba(0,255,255,0.6)",
          fontFamily: "var(--font-geist-mono), monospace",
          whiteSpace: "nowrap", paddingTop: "0.15rem", flexShrink: 0,
          letterSpacing: "0.04em",
        }}>{job.period}</p>
      </div>
    </div>
  );
}

// ─── RECS SLIDER ──────────────────────────────────────────────────────────────

function RecsSlider() {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const next = useCallback(() => setCurrent((c) => (c + 1) % RECS.length), []);
  const prev = useCallback(() => setCurrent((c) => (c - 1 + RECS.length) % RECS.length), []);

  useEffect(() => {
    if (paused) return;
    timerRef.current = setTimeout(next, 4500);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [current, paused, next]);

  const rec = RECS[current];

  return (
    <div onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} style={{ position: "relative" }}>
      <div key={current} onClick={next} style={{
        padding: "2rem",
        border: "1px solid rgba(191,90,242,0.4)",
        background: "rgba(191,90,242,0.05)",
        position: "relative",
        overflow: "hidden",
        cursor: "pointer",
        animation: "recSlideIn 0.4s ease",
        minHeight: "260px",
        display: "flex", flexDirection: "column", justifyContent: "space-between",
      }}>
        {/* corner decoration */}
        <div style={{ position: "absolute", top: 0, left: 0, width: 20, height: 20,
          borderTop: "2px solid #bf5af2", borderLeft: "2px solid #bf5af2" }} />
        <div style={{ position: "absolute", top: 0, right: 0, width: 20, height: 20,
          borderTop: "2px solid #bf5af2", borderRight: "2px solid #bf5af2" }} />
        <div style={{ position: "absolute", bottom: 0, left: 0, width: 20, height: 20,
          borderBottom: "2px solid #bf5af2", borderLeft: "2px solid #bf5af2" }} />
        <div style={{ position: "absolute", bottom: 0, right: 0, width: 20, height: 20,
          borderBottom: "2px solid #bf5af2", borderRight: "2px solid #bf5af2" }} />

        <div style={{
          position: "absolute", top: "0.6rem", right: "1.5rem",
          fontSize: "0.48rem", letterSpacing: "0.22em",
          color: "rgba(191,90,242,0.45)",
          fontFamily: "var(--font-geist-mono), monospace",
          animation: "blink 2.2s ease-in-out infinite",
        }}>INCOMING TRANSMISSION</div>

        <p style={{
          fontSize: "0.9rem", color: "rgba(255,255,255,0.82)",
          lineHeight: 1.85, fontStyle: "italic",
          fontFamily: "var(--font-geist-mono), monospace",
          letterSpacing: "0.01em",
        }}>
          &ldquo;{rec.quote}&rdquo;
        </p>

        <div style={{ display: "flex", alignItems: "center", gap: "0.9rem", marginTop: "1.5rem" }}>
          <a href={rec.url} target="_blank" rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            style={{
              flexShrink: 0, borderRadius: "50%", overflow: "hidden",
              width: 46, height: 46, display: "block",
              border: "2px solid rgba(191,90,242,0.5)",
              boxShadow: "0 0 12px rgba(191,90,242,0.3)",
            }}>
            <Image src={rec.photo} alt={rec.author} width={46} height={46} style={{ objectFit: "cover", display: "block" }} />
          </a>
          <div>
            <a href={rec.url} target="_blank" rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              style={{
                fontSize: "0.85rem", fontWeight: 700, color: "#bf5af2",
                textDecoration: "none", fontFamily: "var(--font-geist-mono), monospace",
                letterSpacing: "0.04em",
                textShadow: "0 0 8px rgba(191,90,242,0.5)",
              }}>
              {rec.author}
            </a>
            <p style={{
              fontSize: "0.68rem", color: "rgba(255,255,255,0.4)",
              marginTop: "0.15rem", fontFamily: "var(--font-geist-mono), monospace",
            }}>{rec.role}</p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "0.9rem" }}>
        <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap", maxWidth: "75%" }}>
          {RECS.map((_, i) => (
            <button key={i} onClick={() => setCurrent(i)} style={{
              width: i === current ? "1.6rem" : "0.4rem",
              height: "0.35rem", borderRadius: "2px", border: "none",
              background: i === current ? "#bf5af2" : "rgba(191,90,242,0.2)",
              cursor: "pointer", padding: 0,
              transition: "width 0.3s, background 0.3s",
              boxShadow: i === current ? "0 0 8px rgba(191,90,242,0.6)" : "none",
            }} />
          ))}
        </div>
        <div style={{ display: "flex", gap: "0.35rem" }}>
          {([["←", prev], ["→", next]] as [string, () => void][]).map(([label, fn]) => (
            <button key={label} onClick={fn} style={{
              background: "none", border: "1px solid rgba(191,90,242,0.3)",
              color: "rgba(191,90,242,0.6)", width: 30, height: 30,
              cursor: "pointer", fontSize: "0.75rem",
              fontFamily: "var(--font-geist-mono), monospace",
              transition: "border-color 0.2s, color 0.2s, box-shadow 0.2s",
            }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "#bf5af2";
                (e.currentTarget as HTMLButtonElement).style.color = "#bf5af2";
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 10px rgba(191,90,242,0.4)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(191,90,242,0.3)";
                (e.currentTarget as HTMLButtonElement).style.color = "rgba(191,90,242,0.6)";
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
              }}
            >{label}</button>
          ))}
        </div>
      </div>

      {!paused && (
        <div style={{ height: "1px", background: "rgba(191,90,242,0.15)", marginTop: "0.6rem" }}>
          <div key={`bar-${current}`} style={{
            height: "100%", background: "rgba(191,90,242,0.6)",
            animation: "recProgress 4.5s linear", transformOrigin: "left",
            boxShadow: "0 0 6px rgba(191,90,242,0.5)",
          }} />
        </div>
      )}
    </div>
  );
}

// ─── SECTION LABEL ────────────────────────────────────────────────────────────

function SLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontFamily: "var(--font-geist-mono), monospace",
      fontSize: "0.58rem",
      letterSpacing: "0.28em",
      textTransform: "uppercase",
      color: "#00ffff",
      marginBottom: "2.5rem",
      display: "flex",
      alignItems: "center",
      gap: "0.7rem",
      textShadow: "0 0 10px rgba(0,255,255,0.6), 0 0 20px rgba(0,255,255,0.3)",
    }}>
      <span style={{ color: "rgba(0,255,255,0.4)" }}>//</span>
      {children}
      <span style={{
        flex: 1, height: "1px",
        background: "linear-gradient(to right, rgba(0,255,255,0.4), transparent)",
        display: "inline-block",
      }} />
    </p>
  );
}

// ─── DIVIDER ──────────────────────────────────────────────────────────────────

function NDivider({ colors }: { colors: string[] }) {
  const grad = colors.join(", ") + ", transparent";
  return (
    <div style={{
      height: "1px",
      background: `linear-gradient(to right, ${grad})`,
      margin: "0 0 5rem",
      boxShadow: `0 0 8px ${colors[0]}40`,
    }} />
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function HomeTempPage() {

  useEffect(() => {
    const prevBg = document.body.style.background;
    const prevCursor = document.body.style.cursor;
    document.body.style.background = "#0a0a0f";
    document.body.style.cursor = "none";
    return () => {
      document.body.style.background = prevBg;
      document.body.style.cursor = prevCursor;
    };
  }, []);

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }

        /* ── Keyframes ── */

        @keyframes glitchName {
          0%,89%,100%  { transform: translate(0); clip-path: none; }
          90%  { transform: translate(-3px, 1px); text-shadow: 3px 0 #00ffff, -3px 0 #ff006e; }
          91%  { transform: translate(3px, -1px); text-shadow: -3px 0 #00ffff, 3px 0 #ff006e; clip-path: polygon(0 10%, 100% 10%, 100% 35%, 0 35%); }
          92%  { transform: translate(-2px, 0); clip-path: polygon(0 50%, 100% 50%, 100% 75%, 0 75%); }
          93%  { transform: translate(2px, -2px); clip-path: none; }
          94%  { transform: translate(0); text-shadow: 0 0 20px #ff006e, 0 0 40px #ff006e; }
        }

        @keyframes glitchLayer1 {
          0%,89%,100%  { opacity: 0; }
          90%  { opacity: 0.8; transform: translate(3px, 0); color: #00ffff; clip-path: polygon(0 15%, 100% 15%, 100% 45%, 0 45%); }
          91%  { opacity: 0.6; transform: translate(-3px, 0); clip-path: polygon(0 55%, 100% 55%, 100% 80%, 0 80%); }
          93%  { opacity: 0; }
        }

        @keyframes heroReveal {
          from { opacity: 0; transform: translateY(50px) skewX(-4deg); filter: blur(12px); }
          to   { opacity: 1; transform: translateY(0) skewX(0); filter: blur(0); }
        }

        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        @keyframes neonPulseMag {
          0%,100% { box-shadow: 0 0 6px #ff006e, 0 0 18px #ff006e40; }
          50%     { box-shadow: 0 0 14px #ff006e, 0 0 40px #ff006e60, 0 0 70px #ff006e30; }
        }

        @keyframes neonTextMag {
          0%,100% { text-shadow: 0 0 8px #ff006e, 0 0 20px #ff006e60; }
          50%     { text-shadow: 0 0 16px #ff006e, 0 0 40px #ff006e, 0 0 70px #ff006e60; }
        }

        @keyframes neonTextCyan {
          0%,100% { text-shadow: 0 0 6px #00ffff, 0 0 16px #00ffff50; }
          50%     { text-shadow: 0 0 12px #00ffff, 0 0 32px #00ffff, 0 0 55px #00ffff50; }
        }

        @keyframes blink {
          0%,100% { opacity: 1; }
          50%     { opacity: 0; }
        }

        @keyframes scanSweep {
          from { transform: translateY(-100%); }
          to   { transform: translateY(100vh); }
        }

        @keyframes floatY {
          0%,100% { transform: translateY(0); }
          50%     { transform: translateY(-8px); }
        }

        @keyframes recSlideIn {
          from { opacity: 0; transform: translateX(20px); filter: blur(4px); }
          to   { opacity: 1; transform: translateX(0); filter: blur(0); }
        }

        @keyframes recProgress {
          from { width: 0%; }
          to   { width: 100%; }
        }

        @keyframes skillBobble {
          0%,100% { transform: translateY(0) scale(1); }
          50%     { transform: translateY(-3px) scale(1.04); }
        }

        @keyframes rotateHex {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }

        @keyframes gridFlicker {
          0%,96%,100%  { opacity: 0.06; }
          97%  { opacity: 0.14; }
          98%  { opacity: 0.04; }
          99%  { opacity: 0.1; }
        }

        @keyframes cornerBlink {
          0%,100% { opacity: 0.5; }
          50%     { opacity: 1; }
        }

        @keyframes neonSweep {
          0%, 88%  { left: -75%; opacity: 1; }
          97%      { left: 150%; opacity: 1; }
          98%, 100%{ left: 150%; opacity: 0; }
        }

        /* ── Global overrides for this page ── */
        .nt-page { font-family: var(--font-geist-mono), monospace; color: #fff; }

        .nt-page .job-desc-inner { font-size: 0.85rem; color: rgba(255,255,255,0.65); line-height: 1.8; }
        .nt-page .job-desc-inner p { margin-bottom: 0.3rem; }
        .nt-page .job-desc-inner ul { list-style: none; padding: 0; }
        .nt-page .job-desc-inner ul li { padding-left: 1.2em; position: relative; margin-bottom: 0.25rem; }
        .nt-page .job-desc-inner ul li::before { content: ">"; position: absolute; left: 0; color: #ff006e; opacity: 0.7; }
        .nt-page .t-sub { margin-top: 0.8rem; margin-bottom: 0.3rem; font-size: 0.68rem; font-weight: 700; color: #c8ff00; letter-spacing: 0.1em; text-transform: uppercase; }

        .nt-page a { color: inherit; }

        /* ── Skill tags ── */
        .nt-skill { display: inline-block; font-family: var(--font-geist-mono), monospace; font-size: 0.68rem; padding: 0.28rem 0.7rem; letter-spacing: 0.04em; transition: all 0.2s; cursor: default; }
        .nt-skill:hover { transform: scale(1.06) translateY(-2px); }

        .nt-skill.c-mag { border: 1px solid rgba(255,0,110,0.5); color: #ff006e; background: rgba(255,0,110,0.07); }
        .nt-skill.c-mag:hover { background: #ff006e; color: #0a0a0f; box-shadow: 0 0 18px #ff006e; }

        .nt-skill.c-cyan { border: 1px solid rgba(0,255,255,0.4); color: #00ffff; background: rgba(0,255,255,0.06); }
        .nt-skill.c-cyan:hover { background: #00ffff; color: #0a0a0f; box-shadow: 0 0 18px #00ffff; }

        .nt-skill.c-acid { border: 1px solid rgba(200,255,0,0.4); color: #c8ff00; background: rgba(200,255,0,0.06); }
        .nt-skill.c-acid:hover { background: #c8ff00; color: #0a0a0f; box-shadow: 0 0 18px #c8ff00; }

        .nt-skill.c-purp { border: 1px solid rgba(191,90,242,0.4); color: #bf5af2; background: rgba(191,90,242,0.06); }
        .nt-skill.c-purp:hover { background: #bf5af2; color: #0a0a0f; box-shadow: 0 0 18px #bf5af2; }

        /* ── CTA button ── */
        .nt-cta { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.9rem 2.2rem; border: 1.5px solid #ff006e; color: #ff006e; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; text-decoration: none; font-family: var(--font-geist-mono), monospace; background: rgba(255,0,110,0.07); transition: background 0.25s, color 0.25s; animation: neonPulseMag 3s ease-in-out infinite; cursor: none; }
        .nt-cta:hover { background: #ff006e; color: #0a0a0f; box-shadow: 0 0 30px #ff006e, 0 0 60px #ff006e40; }

        /* ── Skill shine (Resolución de problemas) ── */
        .nt-skill-shine { position: relative; overflow: hidden; }
        .nt-skill-shine::after {
          content: "";
          position: absolute;
          top: -50%; left: -75%;
          width: 50%; height: 200%;
          background: linear-gradient(120deg, transparent 0%, rgba(0,255,255,0.15) 40%, rgba(0,255,255,0.55) 50%, rgba(0,255,255,0.15) 60%, transparent 100%);
          transform: skewX(-20deg);
          animation: neonSweep 10s ease-in-out infinite;
        }

        /* ── Cert chip ── */
        .nt-cert { display: inline-block; font-family: var(--font-geist-mono), monospace; font-size: 0.68rem; padding: 0.3rem 0.75rem; border: 1px solid rgba(0,255,255,0.3); color: #00ffff; background: rgba(0,255,255,0.05); letter-spacing: 0.03em; transition: all 0.25s; cursor: default; }
        .nt-cert:hover { border-color: #00ffff; box-shadow: 0 0 14px rgba(0,255,255,0.4), inset 0 0 8px rgba(0,255,255,0.08); transform: translateY(-2px); }

        /* ── Grid overlay ── */
        .nt-grid-bg {
          position: fixed; inset: 0; pointer-events: none; z-index: 1;
          background-image:
            linear-gradient(rgba(255,0,110,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,0,110,0.04) 1px, transparent 1px);
          background-size: 60px 60px;
          animation: gridFlicker 8s ease-in-out infinite;
        }

        /* ── Scan sweep ── */
        .nt-scan-sweep {
          position: fixed; left: 0; right: 0; height: 150px; pointer-events: none; z-index: 2;
          background: linear-gradient(to bottom, transparent, rgba(0,255,255,0.03), rgba(0,255,255,0.02), transparent);
          animation: scanSweep 7s linear infinite;
        }

        /* ── CRT scanlines overlay ── */
        .nt-scanlines {
          position: fixed; inset: 0; pointer-events: none; z-index: 3;
          background: repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.06) 3px, rgba(0,0,0,0.06) 4px);
        }

        /* ── Corner HUD ── */
        .nt-hud-corner {
          position: fixed; z-index: 4; pointer-events: none;
          font-family: var(--font-geist-mono), monospace;
          font-size: 0.48rem; letter-spacing: 0.1em; color: rgba(0,255,255,0.25);
          animation: cornerBlink 4s ease-in-out infinite;
        }
      `}</style>

      <Starfield />
      <div className="nt-grid-bg" />
      <div className="nt-scan-sweep" />
      <div className="nt-scanlines" />
      <NeonCursor />

      {/* HUD corners */}
      <div className="nt-hud-corner" style={{ top: "1rem", left: "1rem" }}>
        SYS:ONLINE · PABLO_CV.EXE
      </div>
      <div className="nt-hud-corner" style={{ bottom: "1rem", left: "1rem", textAlign: "left" }}>
        REV:2026 · CLASSIFIED
      </div>

      <main className="nt-page" style={{
        position: "relative", zIndex: 5,
        width: "100%", maxWidth: "960px", margin: "0 auto", padding: "0 2rem",
      }}>

        {/* ── HERO ─────────────────────────────────────────────────────── */}
        <section style={{ paddingTop: "clamp(5rem,12vh,9rem)", paddingBottom: "clamp(4rem,10vh,7rem)" }}>

          {/* boot label */}
          <p style={{
            fontSize: "0.55rem", letterSpacing: "0.2em", color: "rgba(200,255,0,0.6)",
            marginBottom: "2rem", textTransform: "uppercase",
            animation: "fadeInUp 0.6s 0s both",
          }}>
            <span style={{ color: "#c8ff00", marginRight: "0.5rem" }}>▶</span>
            LOADING: pablo_crespo_velasco.exe ... DONE
          </p>

          {/* name */}
          <h1 style={{
            lineHeight: 0.88, letterSpacing: "-0.04em",
            fontWeight: 900, userSelect: "none",
          }}>
            {[
              { word: "PABLO",   color: "#ff006e", delay: "0.1s",  glow: "neonTextMag" },
              { word: "CRESPO",  color: "#00ffff", delay: "0.2s",  glow: "neonTextCyan" },
              { word: "VELASCO", color: "rgba(255,255,255,0.85)", delay: "0.3s", glow: "" },
            ].map(({ word, color, delay, glow }) => (
              <div key={word} style={{ position: "relative", display: "block" }}>
                <span style={{
                  display: "block",
                  fontSize: "clamp(3.5rem, 11vw, 10rem)",
                  color,
                  animation: `heroReveal 1s ${delay} cubic-bezier(0.16,1,0.3,1) both${glow ? `, ${glow} 3s ${delay} ease-in-out infinite` : ""}`,
                  ...(word === "PABLO" ? { animationName: `heroReveal, glitchName${glow ? ", " + glow : ""}`, animationDuration: `1s, 9s${glow ? ", 3s" : ""}`, animationDelay: `${delay}, 2s${glow ? ", " + delay : ""}`, animationTimingFunction: `cubic-bezier(0.16,1,0.3,1), ease-in-out${glow ? ", ease-in-out" : ""}`, animationFillMode: "both, none" } : {}),
                }}>
                  {word}
                </span>
              </div>
            ))}
          </h1>

          {/* subtitle */}
          <p style={{
            marginTop: "1.8rem",
            fontSize: "0.72rem", letterSpacing: "0.14em", textTransform: "uppercase",
            color: "#c8ff00",
            textShadow: "0 0 8px rgba(200,255,0,0.5)",
            animation: "fadeInUp 0.8s 0.55s both",
          }}>
            Director de Operaciones · Senior Product Manager · Troubleshooter
          </p>

          {/* bio */}
          <p style={{
            marginTop: "1.6rem", maxWidth: "50ch",
            fontSize: "0.92rem", lineHeight: "1.85",
            color: "rgba(255,255,255,0.65)",
            borderLeft: "2px solid rgba(255,0,110,0.5)",
            paddingLeft: "1rem",
            animation: "fadeInUp 0.8s 0.75s both",
          }}>
            Ingeniero Industrial con curiosidad por el funcionamiento de todo y gran capacidad para
            comprender y resolver cualquier problema que se presente. Siempre con una sonrisa, los
            grandes retos me hacen feliz: organizar el caos, solucionar lo imposible, gestionar lo
            inmanejable.
          </p>

          {/* CTA */}
          <div style={{ marginTop: "2.8rem", animation: "fadeInUp 0.8s 1s both" }}>
            <a href="mailto:crespovelasco@gmail.com" className="nt-cta">
              CONTACTAR →
            </a>
          </div>
        </section>

        <NDivider colors={["#ff006e", "#ff006e60"]} />

        {/* ── EXPERIENCIA ──────────────────────────────────────────────── */}
        <section style={{ paddingBottom: "5rem" }}>
          <SLabel>Experiencia</SLabel>
          {JOBS.map((job, i) => <JobItem key={job.title} job={job} index={i} />)}
        </section>

        <NDivider colors={["#00ffff", "#00ffff60"]} />

        {/* ── EDUCACIÓN ────────────────────────────────────────────────── */}
        <section style={{ paddingBottom: "5rem" }}>
          <SLabel>Educación</SLabel>
          <div style={{
            padding: "2rem",
            border: "1px solid rgba(0,255,255,0.3)",
            background: "rgba(0,255,255,0.03)",
            position: "relative",
          }}>
            <div style={{ position: "absolute", top: 0, left: 0, width: 16, height: 16, borderTop: "2px solid #00ffff", borderLeft: "2px solid #00ffff" }} />
            <div style={{ position: "absolute", bottom: 0, right: 0, width: 16, height: 16, borderBottom: "2px solid #00ffff", borderRight: "2px solid #00ffff" }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "2rem" }}>
              <div>
                <p style={{ fontWeight: 700, fontSize: "1rem", color: "#fff", letterSpacing: "0.02em" }}>
                  Ingeniería Industrial
                </p>
                <p style={{ fontSize: "0.72rem", color: "rgba(0,255,255,0.7)", marginTop: "0.35rem", letterSpacing: "0.04em" }}>
                  Universidad Pontificia Comillas ICAI-ICADE
                </p>
              </div>
              <p style={{
                fontSize: "0.68rem", color: "#00ffff", whiteSpace: "nowrap",
                paddingTop: "0.1rem", animation: "blink 5s ease-in-out infinite",
                textShadow: "0 0 8px rgba(0,255,255,0.6)",
              }}>
                2004 – 2012
              </p>
            </div>
          </div>
        </section>

        <NDivider colors={["#bf5af2", "#bf5af260"]} />

        {/* ── RECOMENDACIONES ──────────────────────────────────────────── */}
        <section style={{ paddingBottom: "5rem" }}>
          <SLabel>Recomendaciones</SLabel>
          <RecsSlider />
        </section>

        <NDivider colors={["#c8ff00", "#c8ff0060"]} />

        {/* ── CERTIFICACIONES ──────────────────────────────────────────── */}
        <section style={{ paddingBottom: "5rem" }}>
          <SLabel>Certificaciones</SLabel>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.55rem" }}>
            {[
              { label: "Product Executive Certificate", issuer: "Product School", year: "nov. 2021" },
              { label: "Certified Scrum Product Owner", issuer: "Agilar Spain", year: "may. 2017" },
              { label: "Certified Scrum Master", issuer: "Agilar Spain", year: "abr. 2017" },
              { label: "Retention + Engagement Deep Dive", issuer: "Reforge", year: "nov. 2018" },
              { label: "Certified Mentor", issuer: "Mentorloop", year: "abr. 2022" },
              { label: "Diplôme d'Études en Langue Française", issuer: "Ministère de l'Éducation nationale", year: "jul. 2002" },
              { label: "First Certificate Exam", issuer: "University of Cambridge", year: "jun. 2002" },
              { label: "Advanced Open Water Diver", issuer: "PADI", year: "ago. 2009" },
            ].map((cert) => (
              <span key={cert.label} className="nt-cert" title={`${cert.issuer} · ${cert.year}`}>
                {cert.label}
              </span>
            ))}
          </div>
        </section>

        <NDivider colors={["#ff006e", "#00ffff"]} />

        {/* ── IDIOMAS ──────────────────────────────────────────────────── */}
        <section style={{ paddingBottom: "5rem" }}>
          <SLabel>Idiomas</SLabel>
          <div>
            {[
              { lang: "Español", level: "Competencia bilingüe o nativa" },
              { lang: "Inglés",  level: "Competencia bilingüe o nativa" },
              { lang: "Francés", level: "Competencia básica profesional" },
              { lang: "Lengua de signos", level: "Competencia básica" },
            ].map((l, i) => (
              <div key={l.lang} style={{
                display: "flex", justifyContent: "space-between", alignItems: "baseline",
                padding: "1rem 0",
                borderBottom: "1px solid rgba(200,255,0,0.12)",
                animation: `fadeInUp 0.6s ${i * 0.1}s both`,
              }}>
                <span style={{
                  fontWeight: 700, fontSize: "1rem",
                  color: "#c8ff00",
                  textShadow: "0 0 8px rgba(200,255,0,0.35)",
                }}>{l.lang}</span>
                <span style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.4)", letterSpacing: "0.04em" }}>
                  {l.level}
                </span>
              </div>
            ))}
          </div>
        </section>

        <NDivider colors={["#00ffff", "#c8ff00"]} />

        {/* ── RECONOCIMIENTOS ──────────────────────────────────────────── */}
        <section style={{ paddingBottom: "5rem" }}>
          <SLabel>Reconocimientos</SLabel>
          <div>
            {[
              { title: "Best Startup Products & Services. Early Stage", issuer: "Spain Startup & Investor Summit", note: "Nonabox", year: "oct. 2013" },
              { title: "Finalista StartCamp Madrid 2013", issuer: "Wayra — Telefónica", note: "Proyecto iVecinos", year: "mar. 2013" },
              { title: "Tercer puesto campeonato nacional de capoeira", issuer: "", note: "", year: "may. 2009" },
              { title: "Primer puesto campeonato local de ajedrez", issuer: "", note: "", year: "jun. 1995" },
            ].map((award, i) => (
              <div key={award.title} style={{
                display: "flex", justifyContent: "space-between", alignItems: "flex-start",
                gap: "2rem", padding: "1.2rem 0",
                borderBottom: i < 3 ? "1px solid rgba(191,90,242,0.15)" : "none",
                transition: "border-color 0.3s",
              }}
                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(191,90,242,0.5)"}
                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(191,90,242,0.15)"}
              >
                <div>
                  <p style={{ fontWeight: 600, fontSize: "0.95rem", color: "#fff" }}>{award.title}</p>
                  {(award.issuer || award.note) && (
                    <p style={{ fontSize: "0.68rem", color: "rgba(191,90,242,0.7)", marginTop: "0.2rem", letterSpacing: "0.04em" }}>
                      {[award.issuer, award.note].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>
                <p style={{ fontSize: "0.65rem", color: "#bf5af2", whiteSpace: "nowrap", flexShrink: 0, paddingTop: "0.15rem" }}>
                  {award.year}
                </p>
              </div>
            ))}
          </div>
        </section>

        <NDivider colors={["#bf5af2", "#ff006e"]} />

        {/* ── APTITUDES ────────────────────────────────────────────────── */}
        <section style={{ paddingBottom: "5rem" }}>
          <SLabel>Aptitudes</SLabel>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem" }}>
            {SKILLS.map((skill, i) => {
              const cls = ["c-mag","c-cyan","c-acid","c-purp"][i % 4];
              if (skill === "Resolución de problemas") {
                return (
                  <a key={skill} href="/lab" className={`nt-skill nt-skill-shine c-cyan`}
                    style={{ textDecoration: "none", animationDelay: `${i * 0.04}s` }}>
                    {skill}
                  </a>
                );
              }
              return (
                <span key={skill} className={`nt-skill ${cls}`}
                  style={{ animationDelay: `${i * 0.04}s` }}>
                  {skill}
                </span>
              );
            })}
          </div>
        </section>

        <div style={{
          height: "1px",
          background: "linear-gradient(to right, #ff006e, #00ffff, #c8ff00, #bf5af2, transparent)",
          boxShadow: "0 0 10px rgba(255,0,110,0.3)",
        }} />

        {/* ── FOOTER ───────────────────────────────────────────────────── */}
        <footer style={{
          padding: "2.5rem 0 4rem",
          display: "flex", flexDirection: "column", gap: "0.6rem",
          fontFamily: "var(--font-geist-mono), monospace",
          fontSize: "0.78rem",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{
              color: "#ff006e",
              textShadow: "0 0 8px rgba(255,0,110,0.6)",
              animation: "neonTextMag 3s ease-in-out infinite",
            }}>
              pacr.es<span style={{ animation: "blink 1s step-end infinite", color: "rgba(255,255,255,0.9)" }}>_</span>
            </span>
            <a href="https://www.linkedin.com/in/pacres/" target="_blank" rel="noopener noreferrer"
              style={{
                color: "#00ffff", textDecoration: "none",
                textShadow: "0 0 8px rgba(0,255,255,0.5)",
                transition: "text-shadow 0.2s",
              }}
              onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.textShadow = "0 0 20px rgba(0,255,255,1), 0 0 40px rgba(0,255,255,0.5)"}
              onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.textShadow = "0 0 8px rgba(0,255,255,0.5)"}
            >
              LinkedIn →
            </a>
          </div>
          <span style={{
            color: "rgba(0,255,255,0.4)",
            textShadow: "0 0 6px rgba(0,255,255,0.2)",
            fontSize: "0.65rem",
            textAlign: "center",
          }}>
            Creado el 17 de mayo de 2026
          </span>
        </footer>

      </main>
      <HomeNav />
    </>
  );
}
