"use client";

import { useState } from "react";

// Formulario de acceso: una sola clave familiar, sin roles.
export default function LoginForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setCargando(true);
    try {
      const res = await fetch("/arbol/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Error");
        setCargando(false);
        return;
      }
      window.location.reload();
    } catch {
      setError("No se pudo conectar.");
      setCargando(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full max-w-[320px] flex-col gap-4">
      <h1 className="text-center font-[family-name:var(--serif)] text-[34px] tracking-[-0.01em] text-[var(--ink)]">
        Árbol genealógico
      </h1>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Contraseña"
        autoFocus
        className="h-11 rounded-lg border border-[var(--line)] bg-[var(--soft)] px-3 text-[15px] text-[var(--ink)] outline-none focus:border-[var(--ink)]"
      />
      <button
        type="submit"
        disabled={cargando || !password}
        className="flex h-11 items-center justify-center rounded-lg bg-[var(--ink)] text-[15px] font-medium text-[var(--paper)] disabled:opacity-40"
      >
        {cargando ? "Entrando…" : "Entrar"}
      </button>
      {error && <p className="-mt-1 text-center text-[13px] text-[var(--err)]">{error}</p>}
    </form>
  );
}
