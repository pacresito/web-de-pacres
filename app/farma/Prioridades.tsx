"use client";

import { useState } from "react";
import Buscador from "./Buscador";
import { rankear, type LabDescuento } from "@/lib/farma/prioridades";

// Prioridades: el usuario del mostrador busca un principio activo y ve los
// laboratorios que se trabajan ordenados por descuento (prioridad 1 = más margen).
// El look imita la ventana de UnycopWin (el programa que la farmacia ya usa) para
// que le resulte familiar: este skin es SOLO para esta página; las pantallas de
// admin de María mantienen su estilo. Todas las filas son genéricos EFG que la
// farmacia trabaja, por eso T y EFG van siempre marcados; B se muestra vacía.
const NAVY = "#1A3A7A";
const CHECK = "#1a7a1a";
const ROW_BORDER = "#D0C8B8";

const th: React.CSSProperties = {
  background: NAVY,
  color: "#fff",
  fontWeight: 700,
  padding: "5px 8px",
  borderRight: "1px solid #3557A8",
};
const cell: React.CSSProperties = { padding: "4px 8px", borderBottom: `1px solid ${ROW_BORDER}` };

export default function Prioridades({ data }: { data: Record<string, LabDescuento[]> }) {
  const [principio, setPrincipio] = useState<string | null>(null);
  const [sel, setSel] = useState(0);
  const principios = Object.keys(data); // ya ordenado alfabéticamente desde el seed
  const filas = principio ? rankear(principio, data[principio]) : [];
  const seleccionada = filas[sel];
  const fecha = new Date().toLocaleDateString("es-ES");

  return (
    <div style={{ fontFamily: "Tahoma, Arial, sans-serif" }} className="text-[13px]">
      {/* Título de la ventana */}
      <div className="mb-3 flex items-center gap-1.5 text-neutral-600">
        <span style={{ color: "#00008B" }} className="text-[17px] font-bold">Prioridades</span>
        <span>·</span>
        <span>Medicamentos por principio activo</span>
      </div>

      {/* Chrome de ventana (bordes biselados estilo Windows clásico) */}
      <div
        style={{
          borderTop: "2px solid #DFDFDF",
          borderLeft: "2px solid #DFDFDF",
          borderBottom: "2px solid #808080",
          borderRight: "2px solid #808080",
          boxShadow: "2px 2px 8px rgba(0,0,0,.22)",
          background: "#fff",
        }}
      >
        {/* Barra de búsqueda */}
        <div
          style={{ background: "#D4D0C8", borderBottom: "1px solid #ACA899" }}
          className="flex flex-wrap items-center gap-2 px-3 py-2"
        >
          <label style={{ color: "#00008B" }} className="whitespace-nowrap font-bold">Principio activo:</label>
          <div className="w-64">
            <Buscador
              items={principios}
              onSelect={(p) => {
                setPrincipio(p);
                setSel(0);
              }}
              placeholder="Ej: AMLODIPINO"
              autoFocus
              inputClassName="w-full rounded-none border border-neutral-500 bg-white px-2 py-1 text-[13px] outline-none"
            />
          </div>
          {filas.length > 0 && (
            <span className="ml-1 text-[12px] text-neutral-600">{filas.length} resultados</span>
          )}
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <colgroup>
              <col style={{ width: 30 }} />
              <col style={{ width: 40 }} />
              <col style={{ width: 30 }} />
              <col />
              <col style={{ width: 90 }} />
            </colgroup>
            <thead>
              <tr>
                <th style={{ ...th, textAlign: "center" }}>T</th>
                <th style={{ ...th, textAlign: "center" }}>EFG</th>
                <th style={{ ...th, textAlign: "center" }}>B</th>
                <th style={{ ...th, textAlign: "left" }}>Denominación</th>
                <th style={{ ...th, textAlign: "right", borderRight: "none" }}>Prioridad</th>
              </tr>
            </thead>
            <tbody>
              {filas.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: "10px", textAlign: "center", color: "#888" }}>
                    Busque un principio activo para ver los laboratorios y su prioridad.
                  </td>
                </tr>
              )}
              {filas.map((f, i) => {
                const isSel = i === sel;
                const checkColor = isSel ? "#fff" : CHECK;
                return (
                  <tr
                    key={f.lab}
                    onClick={() => setSel(i)}
                    style={{
                      background: isSel ? "#000080" : i % 2 !== 0 ? "#FFFFF0" : "#FFF",
                      color: isSel ? "#fff" : "#000",
                      cursor: "pointer",
                    }}
                  >
                    <td style={{ ...cell, textAlign: "center", color: checkColor }}>✓</td>
                    <td style={{ ...cell, textAlign: "center", color: checkColor }}>✓</td>
                    <td style={cell} />
                    <td style={cell} className="whitespace-nowrap">{f.denominacion}</td>
                    <td style={{ ...cell, textAlign: "right", fontWeight: 700 }} className="tabular-nums">
                      {f.prioridad ?? "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Barra de estado */}
      <div className="mt-1.5 flex justify-between text-[12px] text-neutral-600">
        <span>
          {seleccionada
            ? `Seleccionado: ${seleccionada.denominacion}`
            : "Seleccione un fármaco de entre los mostrados"}
        </span>
        <span>{fecha}</span>
      </div>
    </div>
  );
}
