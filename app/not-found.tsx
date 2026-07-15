"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useTypewriter } from "./components/useTypewriter";

// 404 en estilo terminal (como /cv pero sin la ventana): teclea la ruta fallida
// como si fuera un comando y, al terminar, arranca una cuenta atrás que devuelve
// a la home. Alguien sin contexto puede caer aquí, así que el mensaje es humano
// ("¿Qué estás buscando por aquí?"), no jerga.
const COUNTDOWN = 10;

export default function NotFound() {
  const router = useRouter();
  const pathname = usePathname();
  const [secs, setSecs] = useState(COUNTDOWN);
  const [counting, setCounting] = useState(false);

  const { typed, done, execMs } = useTypewriter(pathname, {
    charMs: 45,
    onDone: () => setCounting(true),
  });

  // Cuenta atrás: arranca cuando el tecleo termina y, al llegar a 0, vuelve a /.
  useEffect(() => {
    if (!counting) return;
    if (secs <= 0) {
      router.replace("/");
      return;
    }
    const id = setTimeout(() => setSecs((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [counting, secs, router]);

  return (
    <main
      style={{
        // 100dvh (no 100vh): en móvil la barra del navegador hace que 100vh
        // sea mayor que el área visible y empujaría el contenido hacia abajo.
        // El padding inferior mayor lo deja un punto por encima del centro.
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem 2rem 14vh",
        background: "var(--t-paper)",
        fontFamily: "var(--t-mono)",
      }}
    >
      <div style={{ width: "100%", maxWidth: "30rem" }}>
        {/* Prompt que teclea la ruta fallida, igual que /cv (con su ↳ Nms) */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "0 12px", alignItems: "baseline", fontSize: "0.9rem", lineHeight: 1.6 }}>
          <span>
            <span style={{ color: "var(--t-accent2)" }}>pacres</span>
            <span style={{ color: "var(--t-ink3)" }}>@resume</span>
            <span style={{ color: "var(--t-ink2)" }}>:~</span>
            <span style={{ color: "var(--t-ink3)" }}>$ </span>
            <span style={{ color: "var(--t-ink)" }}>{typed}</span>
            {!done && (
              <span style={{ color: "var(--t-accent)", animation: "t-blink 1s steps(1) infinite" }}>▍</span>
            )}
          </span>
          <span style={{ fontSize: 10, color: "var(--t-ink3)", visibility: execMs !== null ? "visible" : "hidden" }}>
            ↳ {execMs ?? 0}ms
          </span>
        </div>

        {/* Salida: siempre ocupa su sitio (el prompt no se mueve) y aparece despacio */}
        <div
          className={`t-content-wrap${done ? " t-in" : ""}`}
          style={{ marginTop: "1.25rem", color: "var(--t-ink2)", fontSize: "0.95rem", lineHeight: 1.7 }}
        >
          <p>¿Qué estás buscando por aquí?</p>
          <p style={{ color: "var(--t-ink3)" }}>
            Te llevo a casa en {secs}…{" "}
            <Link href="/" className="hover-accent" style={{ textDecoration: "underline" }}>
              o ya
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
