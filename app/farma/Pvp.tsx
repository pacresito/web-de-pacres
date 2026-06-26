"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { LineaPvp } from "@/lib/farma/pvp";

// PVP (admin): artículos cuyo precio cambió desde la última comprobación, como
// recordatorio para reetiquetar. María reetiqueta y marca hecho —todas de golpe
// (botón global) o una línea suelta—. Marcar apaga el `pending` en farma:pvp; el
// precio nuevo ya es la línea base del próximo diff. Estilo neutro y minimalista.

const TODAS = "__todas__";
const euro = (n: number) =>
  n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";

export default function Pvp({ pendientes }: { pendientes: LineaPvp[] }) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState<string | null>(null); // codigo en curso, o TODAS
  const [error, setError] = useState("");

  async function marcar(codigo?: string) {
    setOcupado(codigo ?? TODAS);
    setError("");
    try {
      const res = await fetch("/farma/api/pvp/done", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(codigo ? { codigo } : {}),
      });
      if (res.ok) {
        router.refresh();
      } else {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "No se pudo marcar.");
      }
    } catch {
      setError("No se pudo conectar.");
    } finally {
      setOcupado(null);
    }
  }

  if (pendientes.length === 0) {
    return (
      <p className="text-sm text-neutral-400">
        Ningún precio ha cambiado desde la última comprobación.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-neutral-600">
          {pendientes.length} {pendientes.length === 1 ? "precio cambiado" : "precios cambiados"} pendiente
          {pendientes.length === 1 ? "" : "s"} de reetiquetar.
        </p>
        <button
          type="button"
          onClick={() => marcar()}
          disabled={ocupado !== null}
          className="rounded bg-neutral-900 px-3 py-1.5 text-sm text-white hover:bg-neutral-700 disabled:opacity-40"
        >
          {ocupado === TODAS ? "Guardando…" : "Ya cambié todas las etiquetas"}
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-neutral-300 text-left text-neutral-500">
            <th className="py-2 pr-4 font-medium">Código</th>
            <th className="py-2 font-medium">Denominación</th>
            <th className="py-2 text-right font-medium">PVP antiguo</th>
            <th className="py-2 text-right font-medium">PVP nuevo</th>
            <th className="py-2 pl-4 text-right font-medium">Fecha</th>
            <th className="py-2 text-right font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {pendientes.map((a) => (
            <tr key={a.codigo} className="border-b border-neutral-100">
              <td className="py-2 pr-4 font-mono text-xs text-neutral-400">{a.codigo}</td>
              <td className="py-2">{a.denominacion}</td>
              <td className="py-2 text-right tabular-nums text-neutral-500">{euro(a.oldPrice)}</td>
              <td className="py-2 text-right font-medium tabular-nums text-neutral-900">{euro(a.newPrice)}</td>
              <td className="py-2 pl-4 text-right tabular-nums whitespace-nowrap text-neutral-500">{a.firstSeen}</td>
              <td className="py-2 pl-4 text-right">
                <button
                  type="button"
                  onClick={() => marcar(a.codigo)}
                  disabled={ocupado !== null}
                  className="text-neutral-500 hover:underline disabled:opacity-40"
                >
                  {ocupado === a.codigo ? "Guardando…" : "Hecho"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
