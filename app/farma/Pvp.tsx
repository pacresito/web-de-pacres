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
      <div className="fa-panel">
        <div className="fa-t-green px-6 py-14 text-center text-sm leading-[1.6]">
          ✓ Todo reetiquetado.
          <br />
          <span className="fa-t-muted2">No hay precios pendientes.</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3">
        <p className="fa-t-ink2 text-sm">
          <b className="font-semibold" style={{ color: "var(--fa-ink)" }}>{pendientes.length}</b>{" "}
          {pendientes.length === 1 ? "precio cambiado pendiente" : "precios cambiados pendientes"} de reetiquetar
        </p>
        <button type="button" onClick={() => marcar()} disabled={ocupado !== null} className="fa-btn fa-btn-primary px-[15px] py-[9px]">
          {ocupado === TODAS ? "Guardando…" : "Ya cambié todas las etiquetas"}
        </button>
      </div>

      {error && <p className="fa-t-red mb-2 text-[13px]">{error}</p>}

      <div className="fa-panel overflow-x-auto">
        <table className="fa-table" style={{ minWidth: 720 }}>
          <thead>
            <tr>
              <th className="fa-th">Código</th>
              <th className="fa-th">Denominación</th>
              <th className="fa-th fa-th-r">PVP antiguo</th>
              <th className="fa-th fa-th-r">PVP nuevo</th>
              <th className="fa-th">Fecha</th>
              <th className="fa-th" style={{ width: 96 }}></th>
            </tr>
          </thead>
          <tbody>
            {pendientes.map((a) => {
              const delta = a.newPrice - a.oldPrice;
              const sube = delta >= 0;
              return (
                <tr key={a.codigo} className="fa-row">
                  <td className="fa-td fa-mono fa-t-ink3 whitespace-nowrap">{a.codigo}</td>
                  <td className="fa-td">{a.denominacion}</td>
                  <td className="fa-td fa-mono fa-th-r fa-t-muted2 line-through">{euro(a.oldPrice)}</td>
                  <td className="fa-td fa-th-r whitespace-nowrap">
                    <span className="fa-mono text-[14px] font-semibold" style={{ color: "var(--fa-ink)" }}>{euro(a.newPrice)}</span>
                    <span className={`fa-mono ml-2 text-[11.5px] ${sube ? "fa-t-green" : "fa-t-red"}`}>
                      {sube ? "+" : "−"}
                      {euro(Math.abs(delta))}
                    </span>
                  </td>
                  <td className="fa-td fa-mono fa-t-ink3 whitespace-nowrap">{a.firstSeen}</td>
                  <td className="fa-td fa-th-r">
                    <button
                      type="button"
                      onClick={() => marcar(a.codigo)}
                      disabled={ocupado !== null}
                      className="fa-btn-soft-green px-3 py-1.5 text-[12.5px]"
                    >
                      {ocupado === a.codigo ? "…" : "Hecho"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
