"use client";

import { useState } from "react";

// Formulario de acceso. Una sola clave; el servidor decide el rol (user/admin) y
// devuelve a dónde ir. No distinguimos en el cliente qué clave es cuál.
export default function LoginForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setCargando(true);
    try {
      const res = await fetch("/farma/api/login", {
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
      window.location.assign(data.destino);
    } catch {
      setError("No se pudo conectar.");
      setCargando(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full max-w-[320px] flex-col gap-4">
      <h1 className="text-center text-[30px] font-semibold tracking-[-0.015em]">Farma</h1>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Contraseña"
        autoFocus
        className="fa-input"
        style={{ height: 44 }}
      />
      <button
        type="submit"
        disabled={cargando || !password}
        className="fa-btn fa-btn-primary flex h-11 items-center justify-center gap-2"
      >
        {cargando && <span className="fa-spinner" />}
        {cargando ? "Entrando…" : "Entrar"}
      </button>
      {error && <p className="fa-t-red -mt-1 text-center text-[13px]">{error}</p>}
    </form>
  );
}
