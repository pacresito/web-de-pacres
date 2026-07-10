"use client";

import { useMemo, useState } from "react";
import Buscador from "./Buscador";
import { contarMetrica } from "./contarMetrica";
import type { RefPedidos } from "@/lib/farma/pedidos";
import type { Recomendaciones } from "@/lib/farma/recomendaciones-store";

// Vista de mostrador (ventas cruzadas): el usuario busca un artículo y ve los que se
// recomiendan con él. Mismo skin UnycopWin que Prioridades (misma ventana, columnas y
// barra de estado) para que le resulte familiar; la columna "Prioridad" de allí es aquí
// el código nacional. La búsqueda es por denominación y se resuelve a código. Las
// recomendaciones las edita María en /farma/maria/recomendaciones.
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

export default function Recomendados({ catalogo, data }: { catalogo: RefPedidos; data: Recomendaciones }) {
  const [origen, setOrigen] = useState<string | null>(null); // código del artículo buscado
  const [sel, setSel] = useState(0); // fila (recomendado) resaltada

  const porNombre = useMemo(() => {
    const m = new Map<string, string>();
    for (const [cod, r] of Object.entries(catalogo)) m.set(r.denominacion, cod);
    return m;
  }, [catalogo]);
  const nombres = useMemo(() => [...porNombre.keys()].sort((a, b) => a.localeCompare(b, "es")), [porNombre]);

  const denom = (cod: string) => catalogo[cod]?.denominacion ?? cod;
  const recomendados = origen ? data[origen] ?? [] : [];
  const seleccionado = recomendados[sel];
  const fecha = new Date().toLocaleDateString("es-ES");

  return (
    <div style={{ fontFamily: "Tahoma, Arial, sans-serif" }} className="text-[13px]">
      {/* Título de la ventana */}
      <div className="mb-3 flex items-center gap-1.5 text-neutral-600">
        <span style={{ color: "#00008B" }} className="text-[17px] font-bold">Recomendados</span>
        <span>·</span>
        <span>Artículos que se recomiendan juntos</span>
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
          <label style={{ color: "#00008B" }} className="whitespace-nowrap font-bold">Artículo:</label>
          <div className="w-72">
            <Buscador
              items={nombres}
              onSelect={(n) => {
                setOrigen(porNombre.get(n) ?? null);
                setSel(0);
                contarMetrica("busquedas:recomendados");
              }}
              placeholder="Ej: IBUPROFENO"
              autoFocus
              inputClassName="w-full rounded-none border border-neutral-500 bg-white px-2 py-1 text-[13px] outline-none"
              buscarExtra={(n) => porNombre.get(n) ?? ""}
            />
          </div>
          {recomendados.length > 0 && (
            <span className="ml-1 text-[12px] text-neutral-600">{recomendados.length} recomendados</span>
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
              <col style={{ width: 100 }} />
            </colgroup>
            <thead>
              <tr>
                <th style={{ ...th, textAlign: "center" }}>T</th>
                <th style={{ ...th, textAlign: "center" }}>EFG</th>
                <th style={{ ...th, textAlign: "center" }}>B</th>
                <th style={{ ...th, textAlign: "left" }}>Denominación</th>
                <th style={{ ...th, textAlign: "right", borderRight: "none" }}>Código</th>
              </tr>
            </thead>
            <tbody>
              {recomendados.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: "10px", textAlign: "center", color: "#888" }}>
                    {origen
                      ? "Este artículo todavía no tiene recomendaciones."
                      : "Busque un artículo para ver recomendados"}
                  </td>
                </tr>
              )}
              {recomendados.map((cod, i) => {
                const isSel = i === sel;
                const checkColor = isSel ? "#fff" : CHECK;
                return (
                  <tr
                    key={cod}
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
                    <td style={cell}>{denom(cod)}</td>
                    <td style={{ ...cell, textAlign: "right" }} className="tabular-nums">{cod}</td>
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
          {seleccionado
            ? `Seleccionado: ${denom(seleccionado)}`
            : "Seleccione un fármaco de entre los mostrados"}
        </span>
        <span>{fecha}</span>
      </div>
    </div>
  );
}
