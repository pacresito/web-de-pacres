"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";

const EXTRAS = [
  {
    id: "lucas",
    label: "Web",
    title: "Dr. Lucas Crespo",
    description: "El perfil profesional de un ingeniero de cohetes de 6 años.",
    status: "available" as const,
    href: "/webs/lucas",
    cta: "Ver perfil →",
  },
  {
    id: "circulo",
    label: "Truco",
    title: "Círculo perfecto",
    description: "Dibuja el círculo más perfecto que puedas. A ver qué pasa.",
    status: "available" as const,
    href: "/trucos/circulo",
    cta: "Intentarlo →",
  },
  {
    id: "cursores",
    label: "Truco",
    title: "Cuatro cursores",
    description: "Algo no cuadra en esta pantalla.",
    status: "available" as const,
    href: "/trucos/cursores",
    cta: "Descubrirlo →",
  },
  {
    id: "espiral",
    label: "Juego",
    title: "Espiral",
    description: "Dos espirales, dos destinos, una sola mente.",
    status: "available" as const,
    href: "/juegos/espiral",
    cta: "Jugar →",
  },
  {
    id: "laberinto",
    label: "Juego",
    title: "Laberinto",
    description: "Navega el laberinto. Inclina el móvil o usa el ratón.",
    status: "available" as const,
    href: "/juegos/laberinto",
    cta: "Jugar →",
  },
  {
    id: "color",
    label: "Easter egg",
    title: "Cambio de tema",
    description: "Algo cambia si aguantas suficiente tiempo.",
    hint: "Deja el botón del ratón pulsado en la página principal durante unos segundos.",
    status: "hidden" as const,
    href: "/",
    cta: "Ir a probarlo →",
  },
  {
    id: "letras",
    label: "Easter egg",
    title: "Las letras caen",
    description: "La página entera se desintegra si sabes dónde pinchar.",
    hint: "Haz clic en «pacr.es» en el footer de la página principal.",
    status: "hidden" as const,
    href: "/",
    cta: "Ir a probarlo →",
  },
];

export default function EasterEggs() {
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("revealed");
        });
      },
      { threshold: 0.1 }
    );
    document.querySelectorAll(".reveal").forEach((el) => observerRef.current!.observe(el));
    return () => observerRef.current?.disconnect();
  }, []);

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

        .reveal { opacity: 0; transform: translateY(20px); transition: opacity 0.55s ease, transform 0.55s ease; }
        .reveal.revealed { opacity: 1; transform: translateY(0); }
        .reveal-delay-1 { transition-delay: 0.06s; }
        .reveal-delay-2 { transition-delay: 0.12s; }
        .reveal-delay-3 { transition-delay: 0.18s; }
        .reveal-delay-4 { transition-delay: 0.24s; }

        .egg-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1px;
          background: var(--border);
          border: 1px solid var(--border);
        }
        @media (max-width: 640px) {
          .egg-grid { grid-template-columns: 1fr; }
        }

        .egg-card {
          background: var(--bg);
          padding: 2rem;
          display: flex;
          flex-direction: column;
          gap: 0.9rem;
          transition: background 0.2s;
        }
        .egg-card:hover { background: rgba(96,165,250,0.03); }

        .egg-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
        }

        .egg-label {
          font-size: 0.6rem; font-weight: 600; letter-spacing: 0.18em;
          text-transform: uppercase; font-family: var(--font-geist-mono), monospace;
          color: var(--blue-accent); opacity: 0.7;
        }

        .egg-status-available {
          font-size: 0.6rem; font-family: var(--font-geist-mono), monospace;
          letter-spacing: 0.12em; text-transform: uppercase;
          color: #16a34a; border: 1px solid rgba(22,163,74,0.3);
          padding: 0.15rem 0.5rem; border-radius: 2px;
        }
        .egg-status-hidden {
          font-size: 0.6rem; font-family: var(--font-geist-mono), monospace;
          letter-spacing: 0.12em; text-transform: uppercase;
          color: var(--text-muted); border: 1px solid var(--border);
          padding: 0.15rem 0.5rem; border-radius: 2px;
        }

        .egg-title {
          font-size: 1.05rem; font-weight: 700; color: var(--text);
          letter-spacing: -0.02em; line-height: 1.2;
        }

        .egg-desc {
          font-size: 0.85rem; color: var(--text-dim); line-height: 1.65;
        }

        .egg-hint {
          font-size: 0.75rem; font-family: var(--font-geist-mono), monospace;
          color: var(--text-muted); border-left: 2px solid rgba(96,165,250,0.3);
          padding-left: 0.75rem; line-height: 1.55;
        }

        .egg-cta {
          margin-top: auto;
          font-size: 0.78rem; font-weight: 600; font-family: var(--font-geist-mono), monospace;
          color: var(--blue-accent); text-decoration: none;
          display: inline-flex; align-items: center; gap: 0.3rem;
          transition: opacity 0.2s;
        }
        .egg-cta:hover { opacity: 0.65; }

        .page-title {
          font-size: clamp(2rem, 6vw, 3.5rem);
          font-weight: 800; letter-spacing: -0.03em; line-height: 1;
          color: var(--text);
        }
        .page-title span {
          background: linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #93c5fd 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }

        .page-subtitle {
          margin-top: 1rem;
          font-size: 0.9rem;
          color: var(--text-muted);
          line-height: 1.6;
          max-width: 520px;
        }

        .divider { border: none; border-top: 1px solid var(--border); }

        .pacres-link {
          font-size: 0.75rem; color: #9ca3af; font-family: var(--font-geist-mono), monospace;
          text-decoration: none; transition: color 0.2s;
        }
        .pacres-link:hover { color: #3b82f6; }
      `}</style>

      <main style={{ maxWidth: 900, margin: "0 auto", padding: "clamp(2rem, 5vw, 4rem) clamp(1.25rem, 4vw, 2rem)", minHeight: "100dvh", display: "flex", flexDirection: "column" }}>

        {/* Header */}
        <div style={{ marginBottom: "3.5rem" }}>
          <h1 className="page-title reveal">
            <span>Extras</span>
          </h1>
          <p className="page-subtitle reveal reveal-delay-1">
            Esta web es mi laboratorio personal. Aquí están algunos de los experimentos.
          </p>
        </div>

        <hr className="divider reveal reveal-delay-1" style={{ marginBottom: "2.5rem" }} />

        {/* Grid */}
        <div className="egg-grid">
          {EXTRAS.map((egg, i) => (
            <div
              key={egg.id}
              className={`egg-card reveal reveal-delay-${(i % 4) + 1}`}
            >
              <div className="egg-card-header">
                <span className="egg-label">{egg.label}</span>
                <span className={egg.status === "available" ? "egg-status-available" : "egg-status-hidden"}>
                  {egg.status === "available" ? "disponible" : "oculto"}
                </span>
              </div>

              <p className="egg-title">{egg.title}</p>
              <p className="egg-desc">{egg.description}</p>

              {egg.hint && (
                <p className="egg-hint">{egg.hint}</p>
              )}

              <Link href={egg.href} className="egg-cta">
                {egg.cta}
              </Link>
            </div>
          ))}
        </div>

        {/* Footer */}
        <footer style={{ marginTop: "auto", paddingTop: "3rem", paddingBottom: "1.5rem", display: "flex", justifyContent: "center" }}>
          <a href="/" className="pacres-link">pacr.es</a>
        </footer>

      </main>
    </>
  );
}
