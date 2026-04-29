export default function Home() {
  return (
    <main className="min-h-screen bg-white text-gray-900 font-sans">
      {/* Hero */}
      <section className="max-w-3xl mx-auto px-6 pt-20 pb-16">
        <h1 className="text-4xl font-bold tracking-tight">Pablo Crespo Velasco</h1>
        <p className="mt-2 text-lg text-gray-500">Director de Operaciones · Senior Product Manager · Troubleshooter</p>
        <p className="mt-6 text-gray-700 leading-relaxed max-w-2xl">
          Ingeniero Industrial con más de 10 años en posiciones clave. Me mueven los retos complejos: organizar el caos, solucionar lo imposible, gestionar lo inmanejable. Directo, positivo y siempre orientado a resultados.
        </p>
        <a
          href="mailto:crespovelasco@gmail.com"
          className="mt-6 inline-block bg-gray-900 text-white px-5 py-2.5 rounded-full text-sm font-medium hover:bg-gray-700 transition-colors"
        >
          Contactar
        </a>
      </section>

      <hr className="border-gray-100 max-w-3xl mx-auto" />

      {/* Experiencia */}
      <section className="max-w-3xl mx-auto px-6 py-14">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-8">Experiencia</h2>
        <div className="space-y-10">
          <Job
            title="Partner"
            company="CARPA Financieros"
            period="2023 — actualidad"
            description="Plataforma de inversión inmobiliaria. Gestión del negocio y estrategia de producto."
          />
          <Job
            title="Launch Manager · Senior Product Manager"
            company="Letgo"
            period="2015 — 2023"
            description="8 años en una de las startups de segunda mano más grandes del mundo. Lideré equipos de Growth, Platform, B2B, Search & Discovery. Expansión a 23 países, implementación de IA para reconocimiento de imágenes, Trust & Safety y Customer Care."
          />
          <Job
            title="Co-founder"
            company="Makai — Make an impact"
            period="2018 — 2022"
            description="Marca de moda femenina con impacto social: por cada prenda vendida, un mes de alimentación para un niño en su escuela."
          />
          <Job
            title="Director de Operaciones"
            company="Nonabox"
            period="2012 — 2015"
            description="Gestión de más de 100.000 envíos en 6 países. Internacionalización, centralización de operaciones, Scrum Master de un equipo de 30 personas."
          />
          <Job
            title="Operaciones y Logística"
            company="GLOSSYBOX"
            period="2011 — 2012"
            description="Gestión logística, relación con proveedores y optimización del CRM."
          />
        </div>
      </section>

      <hr className="border-gray-100 max-w-3xl mx-auto" />

      {/* Educación */}
      <section className="max-w-3xl mx-auto px-6 py-14">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-8">Educación</h2>
        <div className="space-y-4">
          <div>
            <p className="font-medium">Ingeniería Industrial</p>
            <p className="text-sm text-gray-500">Universidad Pontificia Comillas ICAI-ICADE · 2004 – 2012</p>
          </div>
        </div>
      </section>

      <hr className="border-gray-100 max-w-3xl mx-auto" />

      {/* Certificaciones */}
      <section className="max-w-3xl mx-auto px-6 py-14">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-8">Certificaciones</h2>
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
            <span key={cert} className="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded-full">
              {cert}
            </span>
          ))}
        </div>
      </section>

      <hr className="border-gray-100 max-w-3xl mx-auto" />

      {/* Footer */}
      <footer className="max-w-3xl mx-auto px-6 py-10 flex items-center justify-between text-sm text-gray-400">
        <span>pacr.es</span>
        <a
          href="https://www.linkedin.com/in/pacres/"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-gray-700 transition-colors"
        >
          LinkedIn →
        </a>
      </footer>
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
        <p className="text-sm text-gray-500">{company}</p>
        <p className="mt-2 text-sm text-gray-600 leading-relaxed">{description}</p>
      </div>
      <p className="text-sm text-gray-400 whitespace-nowrap pt-0.5">{period}</p>
    </div>
  );
}
