"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import TerminalShell from "../components/TerminalShell";
import WhyFooter from "../components/WhyFooter";

// Espejo de los límites de lib/guestbook.ts (la página es client y no puede
// importar ese módulo, que arrastra ioredis).
const NAME_MAX = 50;
const MESSAGE_MAX = 500;

const MONO = "var(--t-mono)";
const SANS = "var(--t-sans)";

type PublicEntry = { name: string; message: string; date: string };
type Entry = PublicEntry & { id: string; ts: number; hidden: boolean };

// ─── Lista de firmas ───────────────────────────────────────────────────────────

function Firmas({ entries }: { entries: PublicEntry[] }) {
  if (entries.length === 0) {
    return (
      <p style={{ fontFamily: MONO, fontSize: 13, color: "var(--t-ink3)", textAlign: "center", margin: "1.5rem 0" }}>
        Aún no hay firmas. Sé el primero.
      </p>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {entries.map((e, i) => (
        <div key={i} style={{ borderLeft: "3px solid var(--t-accent)", paddingLeft: 14 }}>
          <p style={{ fontFamily: SANS, fontSize: 14.5, color: "var(--t-ink)", lineHeight: 1.5, margin: 0, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
            {e.message}
          </p>
          <p style={{ fontFamily: MONO, fontSize: 11.5, color: "var(--t-ink3)", margin: "5px 0 0" }}>
            — {e.name} · {e.date}
          </p>
        </div>
      ))}
    </div>
  );
}

// ─── Formulario de firma ─────────────────────────────────────────────────────────

function Formulario({ onSigned }: { onSigned: () => void }) {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState("");

  async function submit() {
    if (name.trim().length === 0 || message.trim().length === 0) {
      setError("Escribe tu nombre y un mensaje.");
      setStatus("error");
      return;
    }
    setStatus("sending");
    setError("");
    try {
      const res = await fetch("/api/guestbook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, message, website }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "No se pudo firmar.");
        setStatus("error");
        return;
      }
      setStatus("done");
      setName("");
      setMessage("");
      onSigned();
    } catch {
      setError("Error de conexión.");
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <p style={{ fontFamily: MONO, fontSize: 13, color: "var(--t-accent2)", margin: "0.5rem 0 0" }}>
        ✓ Firma publicada. ¡Gracias por pasar!
      </p>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <textarea
        className="gb-input"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        maxLength={MESSAGE_MAX}
        rows={3}
        placeholder="deja tus palabras en el libro de firmas"
        style={{ resize: "vertical", minHeight: 64 }}
      />
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <input
          className="gb-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={NAME_MAX}
          placeholder="tu nombre"
          style={{ flex: "1 1 160px" }}
        />
        <button className="gb-btn" onClick={submit} disabled={status === "sending"}>
          {status === "sending" ? "firmando…" : "firmar →"}
        </button>
      </div>
      {/* Honeypot: invisible para humanos, los bots lo rellenan. */}
      <input
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
      />
      {status === "error" && (
        <p style={{ fontFamily: MONO, fontSize: 12, color: "#e55", margin: 0 }}>{error}</p>
      )}
    </div>
  );
}

// ─── Confirmación de ocultar (enlace del email) ─────────────────────────────────

function Ocultar({ id }: { id: string }) {
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "fail">("idle");

  async function hide() {
    setStatus("sending");
    const res = await fetch("/api/guestbook/moderar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: id }),
    });
    const data = await res.json().catch(() => ({}));
    setStatus(res.ok && data.ok ? "done" : "fail");
  }

  return (
    <div style={{ maxWidth: 420, margin: "1rem auto", textAlign: "center", display: "flex", flexDirection: "column", gap: 14 }}>
      {status === "done" ? (
        <p style={{ fontFamily: MONO, fontSize: 13, color: "var(--t-accent2)" }}>✓ Firma ocultada.</p>
      ) : status === "fail" ? (
        <p style={{ fontFamily: MONO, fontSize: 13, color: "#e55" }}>No se encontró esa firma.</p>
      ) : (
        <>
          <p style={{ fontFamily: SANS, fontSize: 14.5, color: "var(--t-ink)" }}>¿Ocultar esta firma del libro?</p>
          <button className="gb-btn" onClick={hide} disabled={status === "sending"}>
            {status === "sending" ? "ocultando…" : "ocultar firma"}
          </button>
        </>
      )}
      <a href="/guestbook" style={{ fontFamily: MONO, fontSize: 12, color: "var(--t-ink3)", textDecoration: "none" }}>
        ← volver al libro
      </a>
    </div>
  );
}

// ─── Panel de moderación (?moderar + contraseña) ────────────────────────────────

function Moderar() {
  const [password, setPassword] = useState("");
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [error, setError] = useState("");

  async function call(payload: object) {
    const res = await fetch("/api/guestbook/moderar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, ...payload }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Error");
      return null;
    }
    setError("");
    return data;
  }

  async function login() {
    const data = await call({ action: "list" });
    if (data) setEntries(data);
  }

  async function act(id: string, action: "hide" | "show" | "delete") {
    if (action === "delete" && !confirm("¿Borrar esta firma definitivamente?")) return;
    await call({ action, id });
    const data = await call({ action: "list" });
    if (data) setEntries(data);
  }

  if (entries === null) {
    return (
      <div style={{ maxWidth: 360, margin: "1rem auto", display: "flex", flexDirection: "column", gap: 10 }}>
        <p style={{ fontFamily: MONO, fontSize: 12, color: "var(--t-ink3)", margin: 0 }}>sudo guestbook --moderate</p>
        <input
          className="gb-input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && login()}
          placeholder="contraseña"
        />
        <button className="gb-btn" onClick={login}>entrar →</button>
        {error && <p style={{ fontFamily: MONO, fontSize: 12, color: "#e55", margin: 0 }}>{error}</p>}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <p style={{ fontFamily: MONO, fontSize: 11.5, color: "var(--t-ink3)", margin: 0 }}>
        {entries.length} firmas · {entries.filter((e) => e.hidden).length} ocultas
      </p>
      {entries.map((e) => (
        <div
          key={e.id}
          style={{
            border: "1px solid var(--t-rule)", borderRadius: 8, padding: "10px 14px",
            opacity: e.hidden ? 0.5 : 1, display: "flex", flexDirection: "column", gap: 6,
          }}
        >
          <p style={{ fontFamily: SANS, fontSize: 14, color: "var(--t-ink)", margin: 0, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{e.message}</p>
          <p style={{ fontFamily: MONO, fontSize: 11, color: "var(--t-ink3)", margin: 0 }}>
            — {e.name} · {e.date} {e.hidden && "· (oculta)"}
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="gb-link" onClick={() => act(e.id, e.hidden ? "show" : "hide")}>
              {e.hidden ? "mostrar" : "ocultar"}
            </button>
            <button className="gb-link" onClick={() => act(e.id, "delete")} style={{ color: "#e55" }}>borrar</button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Página ─────────────────────────────────────────────────────────────────────

function GuestbookInner() {
  // El modo se deriva del query en render (sin setState en efecto). useSearchParams
  // exige el <Suspense> del export de abajo.
  const params = useSearchParams();
  const ocultarId = params.get("ocultar");
  const mode = ocultarId ? "ocultar" : params.has("moderar") ? "moderar" : "public";

  const [entries, setEntries] = useState<PublicEntry[]>([]);

  function loadEntries() {
    fetch("/api/guestbook").then((r) => (r.ok ? r.json() : [])).then(setEntries);
  }

  useEffect(() => {
    if (mode === "public") fetch("/api/guestbook").then((r) => (r.ok ? r.json() : [])).then(setEntries);
  }, [mode]);

  return (
    <>
      <style>{`
        .gb-input {
          font-family: ${MONO}; font-size: 13.5px; color: var(--t-ink);
          background: var(--t-paper2); border: 1px solid var(--t-rule);
          border-radius: 8px; padding: 10px 12px; outline: none; width: 100%;
          transition: border-color 0.15s;
        }
        .gb-input::placeholder { color: var(--t-ink4); }
        .gb-input:focus { border-color: var(--t-accent); }
        .gb-btn {
          font-family: ${MONO}; font-size: 13px; color: var(--t-paper);
          background: var(--t-accent); border: 1px solid var(--t-accent);
          border-radius: 8px; padding: 10px 18px; cursor: pointer;
          transition: background 0.15s, border-color 0.15s; white-space: nowrap;
        }
        .gb-btn:disabled { opacity: 0.6; cursor: default; }
        .gb-link {
          font-family: ${MONO}; font-size: 12px; color: var(--t-ink3);
          background: none; border: none; padding: 0; cursor: pointer;
          transition: color 0.15s;
        }
        .gb-link:active { color: var(--t-accent); }
        @media (hover: hover) {
          .gb-btn:hover:not(:disabled) { background: var(--t-accent2); border-color: var(--t-accent2); }
          .gb-link:hover { color: var(--t-accent); }
        }
      `}</style>

      <TerminalShell
        title="guestbook"
        prompt={{ host: "resume", path: "~/guestbook", command: 'echo "…" >> guestbook' }}
        backUrl="/lab"
      >
        <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 24px 8px", width: "100%" }}>
          {mode === "ocultar" ? (
            <Ocultar id={ocultarId!} />
          ) : mode === "moderar" ? (
            <Moderar />
          ) : (
            <>
              <Formulario onSigned={loadEntries} />
              <div style={{ height: 1, background: "var(--t-rule)", margin: "22px 0" }} />
              <p style={{ fontFamily: MONO, fontSize: 11, color: "var(--t-ink3)", margin: "0 0 14px" }}>
                ↳ {entries.length} {entries.length === 1 ? "firma" : "firmas"}
              </p>
              <Firmas entries={entries} />
            </>
          )}
        </div>

        {mode === "public" && (
          <WhyFooter question="¿Por qué un libro de firmas?" date="18 de junio de 2026" style={{ marginTop: "auto" }}>
            <p>La mayoría de experimentos de la web se prueban en solitario: dibujas, juegas, calculas. Me apetecía uno en el que la otra persona dejara algo a cambio.</p>
            <p>Llega poca gente hasta este rincón, y justo por eso me hacía ilusión que quien lo encuentre pueda participar y no solo mirar. Un experimento más, pero este lo escribís quienes pasáis por aquí.</p>
          </WhyFooter>
        )}
      </TerminalShell>
    </>
  );
}

export default function Guestbook() {
  return (
    <Suspense fallback={null}>
      <GuestbookInner />
    </Suspense>
  );
}
