export default function Home() {
  return (
    <main className="min-h-screen text-white font-sans" style={{background: "linear-gradient(135deg, #020d05 0%, #041408 15%, #072010 28%, #0a2c14 40%, #062218 52%, #082616 62%, #051c10 72%, #0b2a14 82%, #030e06 100%)", position: "relative", overflow: "hidden"}}>
      {/* Aurora halos */}
      <div style={{position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0}}>
        <div style={{position: "absolute", width: "70%", height: "40%", top: "-10%", left: "-10%", background: "radial-gradient(ellipse, rgba(30,180,80,0.10) 0%, transparent 70%)", borderRadius: "50%"}} />
        <div style={{position: "absolute", width: "60%", height: "50%", top: "5%", right: "-5%", background: "radial-gradient(ellipse, rgba(20,160,70,0.07) 0%, transparent 70%)", borderRadius: "50%"}} />
        <div style={{position: "absolute", width: "50%", height: "35%", top: "20%", left: "20%", background: "radial-gradient(ellipse, rgba(60,200,90,0.06) 0%, transparent 70%)", borderRadius: "50%"}} />
      </div>
      {/* Content */}
      <div style={{position: "relative", zIndex: 1}}>
      {/* Hero */}
      <section className="max-w-3xl mx-auto px-6 pt-20 pb-16">
        <h1 className="text-4xl font-bold tracking-tight">Pablo Crespo Velasco</h1>
        <p className="mt-2 text-lg text-white/50">Director de Operaciones · Senior Product Manager · Troubleshooter</p>
        <p className="mt-6 text-white/70 leading-relaxed max-w-2xl">
          Ingeniero Industrial. Llevo más de 10 años resolviendo los problemas que nadie quiere tocar: operaciones que no funcionan, productos que no arrancan, equipos que no avanzan. Los problemas difíciles me hacen feliz. No hay más misterio.
        </p>
        <a
          href="mailto:crespovelasco@gmail.com"
          className="mt-6 inline-block bg-white/10 border border-white/20 text-white px-5 py-2.5 rounded-full text-sm font-medium hover:bg-white/20 transition-colors backdrop-blur-sm"
        >
          Contactar
        </a>
      </section>

      <hr className="border-white/10 max-w-3xl mx-auto" />

      {/* Experiencia */}
      <section className="max-w-3xl mx-auto px-6 py-14">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-8">Experiencia</h2>
        <div className="space-y-10">
          <Job
            title="Partner"
            company="CARPA Financieros"
            period="2023 — actualidad"
            description="Inversión inmobiliaria sin complicaciones. Me encargo de que el negocio funcione."
          />
          <Job
            title="Launch Manager · Senior Product Manager"
            company="Letgo"
            period="2015 — 2023"
            description="8 años en una de las apps de segunda mano más grandes del mundo. Pasé por casi todo: expansión a 23 países, equipos de Growth, Search & Discovery, Trust & Safety, Customer Care. Aprendí mucho y me divertí más."
          />
          <Job
            title="Co-founder"
            company="Makai — Make an impact"
            period="2018 — 2022"
            description="Marca de ropa femenina con impacto real: cada prenda vendida pagaba un mes de comida para un niño en su escuela. Bonito proyecto."
          />
          <Job
            title="Director de Operaciones"
            company="Nonabox"
            period="2012 — 2015"
            description="Más de 100.000 envíos en 6 países. Monté la operación desde cero, la internacionalicé y luego la centralicé. Scrum Master de un equipo de 30 personas mientras lo hacía."
          />
          <Job
            title="Operaciones y Logística"
            company="GLOSSYBOX"
            period="2011 — 2012"
            description="Mi primer trabajo en una startup. Logística, proveedores y CRM. Ahí empezó todo."
          />
        </div>
      </section>

      <hr className="border-white/10 max-w-3xl mx-auto" />

      {/* Educación */}
      <section className="max-w-3xl mx-auto px-6 py-14">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-8">Educación</h2>
        <div className="space-y-4">
          <div>
            <p className="font-medium">Ingeniería Industrial</p>
            <p className="text-sm text-white/40">Universidad Pontificia Comillas ICAI-ICADE · 2004 – 2012</p>
          </div>
        </div>
      </section>

      <hr className="border-white/10 max-w-3xl mx-auto" />

      {/* Certificaciones */}
      <section className="max-w-3xl mx-auto px-6 py-14">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-8">Certificaciones</h2>
        <div className="flex flex-wrap gap-2">
          {[
            "Product Executive Certificate — Product School",
            "Certified Scrum Product Owner — Agilar",
            "Certified Scrum Master — Agilar",
            "Retention + Engagement — Reforge",
            "Certified Mentor — Mentorloop",
            "First Certificate — Cambridge",
            "DELF — Ministère de l'Éducation nationale",
          ].map((cert) => (
            <span key={cert} className="text-sm bg-white/10 text-white/70 px-3 py-1 rounded-full border border-white/10">
              {cert}
            </span>
          ))}
        </div>
      </section>

      <hr className="border-white/10 max-w-3xl mx-auto" />

      {/* Footer */}
      <footer className="max-w-3xl mx-auto px-6 py-10 flex items-center justify-between text-sm text-white/30">
        <span>pacr<a href="/juegos/espiral" className="text-white/30 no-underline cursor-default">.</a>es</span>
        <a
          href="https://www.linkedin.com/in/pacres/"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-white transition-colors"
        >
          LinkedIn →
        </a>
      </footer>
      </div>
    </main>
  );
}

function Job({
  title,
  company,
  period,
  description,
}: {
  title: string;
  company: string;
  period: string;
  description: string;
}) {
  return (
    <div className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-1">
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-sm text-white/40">{company}</p>
        <p className="mt-2 text-sm text-white/60 leading-relaxed">{description}</p>
      </div>
      <p className="text-sm text-white/30 whitespace-nowrap pt-0.5">{period}</p>
    </div>
  );
}
