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
      <h1 className="text-center text-[28px] font-semibold tracking-[-0.015em] text-neutral-900">
        Árbol genealógico
      </h1>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Contraseña"
        autoFocus
        className="h-11 rounded-lg border border-neutral-300 px-3 text-[15px] outline-none focus:border-neutral-500"
      />
      <button
        type="submit"
        disabled={cargando || !password}
        className="flex h-11 items-center justify-center rounded-lg bg-neutral-900 text-[15px] font-medium text-white disabled:opacity-40"
      >
        {cargando ? "Entrando…" : "Entrar"}
      </button>
      {error && <p className="-mt-1 text-center text-[13px] text-red-600">{error}</p>}
    </form>
  );
}
