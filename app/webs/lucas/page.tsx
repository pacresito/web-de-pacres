function calcularEdad(nacimiento: Date): number {
  const hoy = new Date();
  const cumpleEsteAño = new Date(hoy.getFullYear(), nacimiento.getMonth(), nacimiento.getDate());
  return hoy.getFullYear() - nacimiento.getFullYear() - (hoy < cumpleEsteAño ? 1 : 0);
}

export default function Lucas() {
  const edad = calcularEdad(new Date(2020, 2, 30));
  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #050a14; }

        .lc-page {
          background: #050a14;
          color: #e2eaf4;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          min-height: 100dvh;
        }

        /* ── HERO ── */
        .lc-hero {
          min-height: 100dvh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem 2rem 4rem;
          position: relative;
          overflow: hidden;
          text-align: center;
        }
        .lc-stars {
          position: absolute;
          inset: 0;
          background-image:
            radial-gradient(1px 1px at 10% 15%, rgba(180,210,240,0.6) 0%, transparent 100%),
            radial-gradient(1px 1px at 25% 40%, rgba(180,210,240,0.4) 0%, transparent 100%),
            radial-gradient(1.2px 1.2px at 40% 10%, rgba(180,210,240,0.7) 0%, transparent 100%),
            radial-gradient(0.8px 0.8px at 55% 30%, rgba(180,210,240,0.5) 0%, transparent 100%),
            radial-gradient(1px 1px at 70% 20%, rgba(180,210,240,0.6) 0%, transparent 100%),
            radial-gradient(0.9px 0.9px at 80% 50%, rgba(180,210,240,0.4) 0%, transparent 100%),
            radial-gradient(1px 1px at 90% 10%, rgba(180,210,240,0.5) 0%, transparent 100%),
            radial-gradient(0.7px 0.7px at 15% 70%, rgba(180,210,240,0.3) 0%, transparent 100%),
            radial-gradient(1px 1px at 35% 60%, rgba(180,210,240,0.4) 0%, transparent 100%),
            radial-gradient(0.8px 0.8px at 60% 75%, rgba(180,210,240,0.3) 0%, transparent 100%),
            radial-gradient(1.1px 1.1px at 75% 65%, rgba(180,210,240,0.5) 0%, transparent 100%),
            radial-gradient(0.9px 0.9px at 88% 80%, rgba(180,210,240,0.35) 0%, transparent 100%),
            radial-gradient(1px 1px at 5% 85%, rgba(180,210,240,0.4) 0%, transparent 100%),
            radial-gradient(0.8px 0.8px at 48% 88%, rgba(180,210,240,0.3) 0%, transparent 100%),
            radial-gradient(1px 1px at 92% 45%, rgba(180,210,240,0.5) 0%, transparent 100%),
            radial-gradient(0.7px 0.7px at 20% 55%, rgba(180,210,240,0.3) 0%, transparent 100%),
            radial-gradient(1px 1px at 65% 5%, rgba(180,210,240,0.6) 0%, transparent 100%),
            radial-gradient(0.9px 0.9px at 82% 28%, rgba(180,210,240,0.45) 0%, transparent 100%),
            radial-gradient(1.2px 1.2px at 50% 50%, rgba(180,210,240,0.25) 0%, transparent 100%),
            radial-gradient(0.8px 0.8px at 30% 22%, rgba(180,210,240,0.5) 0%, transparent 100%);
          pointer-events: none;
        }
        .lc-eyebrow {
          font-size: 0.7rem;
          color: #378ADD;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          margin-bottom: 1.25rem;
          position: relative;
        }
        .lc-name {
          font-size: clamp(2.8rem, 9vw, 5rem);
          font-weight: 200;
          color: #ffffff;
          letter-spacing: -0.04em;
          line-height: 1;
          position: relative;
        }
        .lc-title {
          font-size: clamp(0.85rem, 2vw, 1rem);
          color: #7ea3c4;
          margin-top: 1rem;
          font-weight: 400;
          letter-spacing: 0.04em;
          position: relative;
        }
        .lc-badges {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          justify-content: center;
          margin-top: 1.75rem;
          position: relative;
        }
        .lc-badge {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          background: #0a1f38;
          border: 0.5px solid #1a3a5c;
          border-radius: 999px;
          padding: 5px 14px;
          font-size: 0.72rem;
          color: #7ea3c4;
          letter-spacing: 0.05em;
        }
        .lc-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #378ADD;
          animation: pulse 2s ease-in-out infinite;
          flex-shrink: 0;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.35; }
        }
        .lc-scroll-hint {
          position: absolute;
          bottom: 2rem;
          left: 50%;
          transform: translateX(-50%);
          font-size: 0.65rem;
          color: #1a3a5c;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          animation: fadeUpDown 2.5s ease-in-out infinite;
        }
        @keyframes fadeUpDown {
          0%, 100% { opacity: 0.4; transform: translateX(-50%) translateY(0); }
          50% { opacity: 0.9; transform: translateX(-50%) translateY(-4px); }
        }

        /* ── SECTIONS ── */
        .lc-section {
          max-width: 780px;
          margin: 0 auto;
          padding: 4rem 2rem;
          border-top: 0.5px solid #0d1e2e;
        }
        .lc-section-label {
          font-size: 0.65rem;
          color: #378ADD;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          margin-bottom: 2rem;
        }

        /* ── PHOTO ── */
        .lc-photo-wrap {
          width: 100%;
          max-width: 640px;
          margin: 0 auto;
          border-radius: 12px;
          overflow: hidden;
          border: 0.5px solid #0d1e2e;
          position: relative;
        }
        .lc-photo-wrap img {
          width: 100%;
          display: block;
          object-fit: cover;
          max-height: 420px;
        }
        .lc-photo-caption {
          background: #060d1a;
          padding: 0.75rem 1rem;
          font-size: 0.68rem;
          color: #2a4a6a;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        /* ── BIO ── */
        .lc-bio p {
          font-size: 0.95rem;
          color: #7ea3c4;
          line-height: 1.75;
          margin-bottom: 1rem;
        }
        .lc-bio strong {
          color: #b8d4f0;
        }
        .lc-disclaimer {
          display: inline-block;
          margin-top: 0.5rem;
          font-size: 0.7rem;
          color: #1a3a5c;
          border: 0.5px solid #0d1e2e;
          border-radius: 6px;
          padding: 4px 10px;
          letter-spacing: 0.04em;
        }

        /* ── EDUCATION ── */
        .lc-edu-list {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }
        .lc-edu-item {
          background: #070f1c;
          border: 0.5px solid #0d1e2e;
          border-radius: 10px;
          padding: 1.25rem 1.5rem;
        }
        .lc-edu-school {
          font-size: 0.95rem;
          font-weight: 600;
          color: #c8ddf0;
          margin-bottom: 0.25rem;
        }
        .lc-edu-degree {
          font-size: 0.82rem;
          color: #5a87b0;
          margin-bottom: 0.25rem;
        }
        .lc-edu-year {
          font-size: 0.68rem;
          color: #1e3a5a;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .lc-edu-note {
          margin-top: 0.5rem;
          font-size: 0.72rem;
          color: #2a4a6a;
          font-style: italic;
        }

        /* ── SKILLS ── */
        .lc-skills-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 1rem;
        }
        .lc-skill-card {
          background: #070f1c;
          border: 0.5px solid #0d1e2e;
          border-radius: 10px;
          padding: 1.25rem;
        }
        .lc-skill-icon {
          font-size: 1.4rem;
          margin-bottom: 0.5rem;
        }
        .lc-skill-name {
          font-size: 0.85rem;
          font-weight: 600;
          color: #c8ddf0;
          margin-bottom: 0.25rem;
        }
        .lc-skill-level {
          font-size: 0.7rem;
          color: #2a4a6a;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          margin-bottom: 0.6rem;
        }
        .lc-skill-bar-track {
          height: 3px;
          background: #0d1e2e;
          border-radius: 2px;
          overflow: hidden;
        }
        .lc-skill-bar-fill {
          height: 100%;
          background: linear-gradient(to right, #1a3a6a, #378ADD);
          border-radius: 2px;
        }

        /* ── PUBLICATIONS ── */
        .lc-pub-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .lc-pub-item {
          background: #070f1c;
          border: 0.5px solid #0d1e2e;
          border-radius: 10px;
          padding: 1.25rem 1.5rem;
          display: flex;
          gap: 1rem;
          align-items: flex-start;
        }
        .lc-pub-year {
          font-size: 0.7rem;
          color: #378ADD;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          white-space: nowrap;
          padding-top: 2px;
          min-width: 36px;
        }
        .lc-pub-title {
          font-size: 0.88rem;
          color: #b8d4f0;
          font-weight: 500;
          margin-bottom: 0.25rem;
          line-height: 1.4;
        }
        .lc-pub-journal {
          font-size: 0.72rem;
          color: #2a4a6a;
          font-style: italic;
        }

        /* ── AWARDS ── */
        .lc-awards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 1rem;
        }
        .lc-award-card {
          background: #070f1c;
          border: 0.5px solid #0d1e2e;
          border-radius: 10px;
          padding: 1.25rem;
          text-align: center;
        }
        .lc-award-icon {
          font-size: 1.75rem;
          margin-bottom: 0.6rem;
        }
        .lc-award-name {
          font-size: 0.82rem;
          font-weight: 600;
          color: #c8ddf0;
          margin-bottom: 0.25rem;
          line-height: 1.35;
        }
        .lc-award-org {
          font-size: 0.68rem;
          color: #2a4a6a;
          letter-spacing: 0.05em;
        }

        /* ── CONTACT ── */
        .lc-contact {
          text-align: center;
          padding: 4rem 2rem 6rem;
          border-top: 0.5px solid #0d1e2e;
        }
        .lc-contact-name {
          font-size: clamp(1.5rem, 4vw, 2.2rem);
          font-weight: 200;
          color: #ffffff;
          letter-spacing: -0.03em;
          margin-bottom: 0.5rem;
        }
        .lc-contact-sub {
          font-size: 0.8rem;
          color: #2a4a6a;
          margin-bottom: 2rem;
          letter-spacing: 0.06em;
        }
        .lc-contact-btn {
          display: inline-block;
          background: #0a1f38;
          border: 0.5px solid #1a3a5c;
          color: #7ea3c4;
          font-size: 0.8rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          padding: 10px 24px;
          border-radius: 999px;
          text-decoration: none;
          transition: border-color 0.2s, color 0.2s;
        }
        .lc-contact-btn:hover {
          border-color: #378ADD;
          color: #b8d4f0;
        }
        .lc-footer {
          margin-top: 3rem;
          font-size: 0.65rem;
          color: #0d1e2e;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }
        .lc-footer a {
          color: #1a3a5c;
          text-decoration: none;
          transition: color 0.2s;
        }
        .lc-footer a:hover { color: #378ADD; }
      `}</style>

      <div className="lc-page">

        {/* ── HERO ── */}
        <section className="lc-hero">
          <div className="lc-stars" />
          <p className="lc-eyebrow">Ingeniero Senior · SpaceX Starship Program</p>
          <h1 className="lc-name">Dr. Lucas Crespo</h1>
          <p className="lc-title">Ingeniero de Propulsión Avanzada & Doctor en Juegos de Mesa</p>
          <div className="lc-badges">
            <span className="lc-badge"><span className="lc-dot" />Boca Chica, Texas</span>
            <span className="lc-badge">{edad} años de experiencia (y de vida)</span>
            <span className="lc-badge">Open to snacks</span>
          </div>
          <p className="lc-scroll-hint">↓ ver perfil completo</p>
        </section>

        {/* ── FOTO ── */}
        <div style={{ maxWidth: 780, margin: "0 auto", padding: "0 2rem" }}>
          <div className="lc-photo-wrap">
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/4/4a/SpaceX_Starship_ignition_during_IFT-5.jpg"
              alt="Starship IFT-5 — SpaceX"
            />
            <p className="lc-photo-caption">Starship IFT-5 · Boca Chica, Texas · Oct 2024 — el cohete que Lucas mantiene en perfecto estado</p>
          </div>
        </div>

        {/* ── BIO ── */}
        <section className="lc-section">
          <p className="lc-section-label">Sobre mí</p>
          <div className="lc-bio">
            <p>
              Soy <strong>Dr. Lucas Crespo</strong>, ingeniero de propulsión en el programa Starship de SpaceX con <strong>{edad} años de experiencia</strong> en el sector aeroespacial (coincidentemente, los mismos que llevo vivo).
              Mi trabajo consiste en supervisar el correcto funcionamiento de los <strong>33 motores Raptor</strong> del Super Heavy, asegurarme de que el cohete no se vaya torcido, y gestionar la logística de la merienda en Boca Chica.
            </p>
            <p>
              Antes de unirme a SpaceX fui alumno destacado del <strong>Wisdom School de Madrid</strong>, donde me especialicé en construcción avanzada con bloques de colores y negociación de turnos en el recreo.
              Completé mi <strong>Doctorado en Juegos de Mesa</strong> por la Universidad de La Manga del Mar Menor con una tesis titulada <em>"El parchís como sistema dinámico no lineal: estrategias óptimas cuando te toca el 6"</em>.
            </p>
            <p>
              Actualmente resido entre Boca Chica y el sofá de casa, y estoy disponible para conferencias, partidas de Castle Combo y visitas al parque.
            </p>
            <span className="lc-disclaimer">* Algunos datos pueden ser ligeramente exagerados</span>
          </div>
        </section>

        {/* ── EDUCACIÓN ── */}
        <section className="lc-section">
          <p className="lc-section-label">Formación académica</p>
          <div className="lc-edu-list">
            <div className="lc-edu-item">
              <p className="lc-edu-school">Universidad de La Manga del Mar Menor</p>
              <p className="lc-edu-degree">Doctorado (Ph.D.) en Juegos de Mesa y Teoría del Dado</p>
              <p className="lc-edu-year">2023 – 2024 · Cum Laude con mención especial al Parchís</p>
              <p className="lc-edu-note">Tesis: "El parchís como sistema dinámico no lineal: estrategias óptimas cuando te toca el 6". Tribunal calificador compuesto por tres primos y un abuelo.</p>
            </div>
            <div className="lc-edu-item">
              <p className="lc-edu-school">Wisdom School · Madrid</p>
              <p className="lc-edu-degree">Grado en Ingeniería de Bloques de Construcción y Recreo Aplicado</p>
              <p className="lc-edu-year">2021 – presente · Matrícula de Honor en Castle Combo</p>
              <p className="lc-edu-note">Premio al mejor proyecto de fin de curso: torre de LEGO de 47 cm que se mantuvo en pie durante casi dos minutos antes de ser derribada por un perro.</p>
            </div>
            <div className="lc-edu-item">
              <p className="lc-edu-school">Hospital Universitario · Madrid</p>
              <p className="lc-edu-degree">Acceso al mundo laboral (nacimiento)</p>
              <p className="lc-edu-year">2020 · Primera aparición pública</p>
              <p className="lc-edu-note">Llegó antes de lo esperado, lo cual ya demuestra cierta iniciativa propia y espíritu emprendedor.</p>
            </div>
          </div>
        </section>

        {/* ── SKILLS ── */}
        <section className="lc-section">
          <p className="lc-section-label">Competencias técnicas</p>
          <div className="lc-skills-grid">
            {[
              { icon: "🚀", name: "Ingeniería de cohetes", level: "Senior", pct: 98 },
              { icon: "🎲", name: "Juegos de mesa", level: "Doctorado", pct: 100 },
              { icon: "🧱", name: "Construcción con LEGO", level: "Arquitecto certificado", pct: 95 },
              { icon: "🍪", name: "Gestión de snacks", level: "Director ejecutivo", pct: 100 },
              { icon: "🏰", name: "Castle Combo", level: "Experto", pct: 92 },
              { icon: "🎨", name: "Dibujo técnico (pinturas)", level: "Avanzado", pct: 88 },
              { icon: "🐾", name: "Negociación con mascotas", level: "Intermedio", pct: 74 },
              { icon: "⚡", name: "Velocidad en pijama", level: "Récord no oficial", pct: 97 },
            ].map(s => (
              <div key={s.name} className="lc-skill-card">
                <div className="lc-skill-icon">{s.icon}</div>
                <p className="lc-skill-name">{s.name}</p>
                <p className="lc-skill-level">{s.level}</p>
                <div className="lc-skill-bar-track">
                  <div className="lc-skill-bar-fill" style={{ width: `${s.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── PUBLICACIONES ── */}
        <section className="lc-section">
          <p className="lc-section-label">Publicaciones seleccionadas</p>
          <div className="lc-pub-list">
            {[
              {
                year: "2024",
                title: "El parchís como sistema dinámico no lineal: estrategias óptimas cuando te toca el 6",
                journal: "Journal of Irreproducible Results in Board Game Science, Vol. 3",
              },
              {
                year: "2024",
                title: "Análisis estratégico del Castle Combo: cómo construir el castillo perfecto antes de que te lo destruyan",
                journal: "Proceedings of the Annual Snack & Strategy Conference, La Manga 2024",
              },
              {
                year: "2023",
                title: "Optimización del vector de empuje en cohetes construidos con LEGO Duplo bajo restricciones de presupuesto navideño",
                journal: "International Review of Toy Propulsion Systems (IRTPS)",
              },
              {
                year: "2023",
                title: "Patrones de flujo en líquidos vertidos desde el vaso: un estudio empírico sobre la mesa del comedor",
                journal: "Applied Fluid Dynamics for Toddlers, edición especial",
              },
            ].map(p => (
              <div key={p.title} className="lc-pub-item">
                <span className="lc-pub-year">{p.year}</span>
                <div>
                  <p className="lc-pub-title">{p.title}</p>
                  <p className="lc-pub-journal">{p.journal}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── PREMIOS ── */}
        <section className="lc-section">
          <p className="lc-section-label">Reconocimientos y premios</p>
          <div className="lc-awards-grid">
            {[
              { icon: "🏆", name: "Premio Nobel de Snacks", org: "Comité Noruego del Bocadillo · 2024" },
              { icon: "🌟", name: "Mejor Ingeniero Sub-6-años", org: "SpaceX Internal Awards · 3 años consecutivos" },
              { icon: "🎖️", name: "Medalla al Recreo Estratégico", org: "Wisdom School · Promoción 2023" },
              { icon: "🥇", name: "Campeón Nacional de Parchís (categoría familiar)", org: "Liga Doméstica Crespo · Temporada 2024" },
              { icon: "🚀", name: "Astronauta Honorífico", org: "Autoproclamado · Madrid, 2022" },
              { icon: "📚", name: "Lector más rápido de cuentos de dinosaurios", org: "Biblioteca de casa · récord vigente" },
            ].map(a => (
              <div key={a.name} className="lc-award-card">
                <div className="lc-award-icon">{a.icon}</div>
                <p className="lc-award-name">{a.name}</p>
                <p className="lc-award-org">{a.org}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── CONTACTO ── */}
        <section className="lc-contact">
          <p className="lc-contact-name">Dr. Lucas Crespo</p>
          <p className="lc-contact-sub">Disponible para proyectos, misiones espaciales y partidas de Castle Combo</p>
          <a href="mailto:lucas@cohete.space" className="lc-contact-btn">Contactar</a>
          <p className="lc-footer" style={{ marginTop: "3rem" }}>
            <a href="/">pacr.es</a> · © {new Date().getFullYear()} Dr. Lucas Crespo · Todos los derechos reservados (excepto el último trozo de pizza)
          </p>
        </section>

      </div>
    </>
  );
}
