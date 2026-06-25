"use client";

import { useState } from "react";
import Buscador from "./Buscador";
import { rankear, type LabDescuento } from "@/lib/farma/prioridades";

// Prioridades: el usuario busca un principio activo y ve los laboratorios que se
// trabajan ordenados por descuento (prioridad 1 = más margen). El map llega
// completo desde el servidor (pequeño y ya gateado por sesión); el filtrado y el
// rankeo ocurren en cliente.
export default function Prioridades({ data }: { data: Record<string, LabDescuento[]> }) {
  const [principio, setPrincipio] = useState<string | null>(null);
  const principios = Object.keys(data); // ya ordenado alfabéticamente desde el seed
  const filas = principio ? rankear(principio, data[principio]) : [];

  return (
    <div className="flex flex-col gap-5">
      <Buscador
        items={principios}
        onSelect={setPrincipio}
        placeholder="Principio activo…"
        autoFocus
      />
      {principio && (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-neutral-300 text-left text-neutral-500">
              <th className="py-2 font-medium">Denominación</th>
              <th className="py-2 text-right font-medium">Prioridad</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.lab} className="border-b border-neutral-100">
                <td className="py-2">{f.denominacion}</td>
                <td className="py-2 text-right tabular-nums">{f.prioridad ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
