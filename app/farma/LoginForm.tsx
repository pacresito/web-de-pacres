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
    <form onSubmit={onSubmit} className="mx-auto mt-24 flex max-w-xs flex-col gap-3">
      <h1 className="text-center text-lg font-medium">Farma</h1>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Clave"
        autoFocus
        className="rounded border border-neutral-300 px-3 py-2 outline-none focus:border-neutral-500"
      />
      <button
        type="submit"
        disabled={cargando || !password}
        className="rounded bg-neutral-900 px-3 py-2 text-white disabled:opacity-40"
      >
        {cargando ? "Entrando…" : "Entrar"}
      </button>
      {error && <p className="text-center text-sm text-red-600">{error}</p>}
    </form>
  );
}
