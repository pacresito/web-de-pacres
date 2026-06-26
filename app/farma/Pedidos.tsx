"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { BolsaLab, ResultadoPedidos } from "@/lib/farma/pedidos";
import type { MetaInventario } from "@/lib/farma/pedidos-store";

// Pedidos (admin): cabecera de estado + subida de inventario + bolsas por lab.
// El cálculo lo hace el servidor (cargarEstadoPedidos); aquí va solo la interacción
// —subir un inventario, fichar un pedido, descargar su .xls— y el refresco tras cada
// acción. Estilo neutro y minimalista (no es la pantalla con skin Unycop).
export default function Pedidos({
  resultado,
  meta,
  pvpCambiados,
}: {
  resultado: ResultadoPedidos;
  meta: MetaInventario | null;
  pvpCambiados: number;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [confirmacion, setConfirmacion] = useState<{ total: number; delta: number | null } | null>(null);
  const [error, setError] = useState("");
  const [nombre, setNombre] = useState(""); // nombre del archivo elegido
  const [abierto, setAbierto] = useState<string | null>(null); // lab expandido
  const [fichando, setFichando] = useState<string | null>(null);

  // "hace X" depende de la hora actual: se calcula solo tras montar para no romper la
  // hidratación (el HTML del servidor no conoce la hora del cliente).
  const [ahora, setAhora] = useState<number | null>(null);
  useEffect(() => setAhora(Date.now()), []);

  async function subir() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("Elige un archivo de inventario.");
      return;
    }
    setError("");
    setSubiendo(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/farma/api/inventario", { method: "POST", body: fd });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(d.error ?? "No se pudo subir el inventario.");
        return;
      }
      setConfirmacion({ total: d.totalArticulos, delta: d.delta });
      if (fileRef.current) fileRef.current.value = "";
      setNombre("");
      router.refresh();
    } catch {
      setError("No se pudo conectar.");
    } finally {
      setSubiendo(false);
    }
  }

  async function fichar(lab: string) {
    setFichando(lab);
    try {
      const res = await fetch("/farma/api/pedidos/done", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lab }),
      });
      if (res.ok) {
        setAbierto(null);
        router.refresh();
      } else {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "No se pudo fichar el pedido.");
      }
    } catch {
      setError("No se pudo conectar.");
    } finally {
      setFichando(null);
    }
  }

  const { pendientes, hechos, alertasStockMinimo, huerfanos } = resultado;

  return (
    <div className="flex flex-col gap-6">
      {/* Cabecera de estado */}
      <section className="flex flex-col gap-1 text-sm">
        <p className="text-neutral-600">
          {meta ? (
            <>
              Inventario del <span className="text-neutral-900">{meta.fechaInforme}</span>
              {ahora !== null && <span className="text-neutral-400"> · cargado {haceX(meta.loadedAt, ahora)}</span>}
              <span className="text-neutral-400"> · {meta.totalArticulos} artículos</span>
            </>
          ) : (
            "Aún no se ha subido ningún inventario."
          )}
        </p>
        <p className="text-neutral-600">
          {pvpCambiados > 0 ? (
            <Link href="/farma/pvp" className="text-amber-700 hover:underline">
              {pvpCambiados} {pvpCambiados === 1 ? "precio cambiado" : "precios cambiados"} →
            </Link>
          ) : (
            <span className="text-neutral-400">Ningún precio ha cambiado.</span>
          )}
        </p>
      </section>

      {/* Subida de inventario */}
      <section className="flex flex-col gap-2 rounded border border-neutral-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* El input nativo se oculta (se ve distinto en cada navegador) y se dispara
              desde un botón propio; el nombre del archivo elegido se muestra al lado. */}
          <input
            ref={fileRef}
            type="file"
            accept=".xls,.xlsx"
            className="hidden"
            onChange={(e) => setNombre(e.target.files?.[0]?.name ?? "")}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="rounded border border-neutral-300 bg-white px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50"
          >
            Elegir archivo
          </button>
          <span className="text-sm text-neutral-500">{nombre || "Ningún archivo elegido"}</span>
          <button
            type="button"
            onClick={subir}
            disabled={subiendo || !nombre}
            className="rounded bg-neutral-900 px-3 py-1.5 text-sm text-white hover:bg-neutral-700 disabled:opacity-40"
          >
            {subiendo ? "Subiendo…" : "Subir inventario"}
          </button>
        </div>
        {confirmacion && (
          <p className="text-sm text-neutral-600">
            Cargados {confirmacion.total} artículos
            {confirmacion.delta !== null && confirmacion.delta !== 0 && (
              <span className={confirmacion.delta > 0 ? "text-green-700" : "text-red-700"}>
                {" "}({confirmacion.delta > 0 ? "+" : ""}{confirmacion.delta} vs la subida anterior)
              </span>
            )}
            .
          </p>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </section>

      {/* Stock mínimo > consumo: en vez del muro de líneas, una línea-resumen que
          enlaza a Mínimos, donde María las revisa y edita. */}
      {alertasStockMinimo > 0 && (
        <Link href="/farma/minimos" className="text-sm text-amber-700 hover:underline">
          {alertasStockMinimo} {alertasStockMinimo === 1 ? "artículo" : "artículos"} con stock mínimo mayor que el consumo →
        </Link>
      )}

      {/* Huérfanos: en rotura pero sin datos de Ventas → avisar a Pablo */}
      {huerfanos.length > 0 && (
        <section className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <p className="font-medium">Artículos en rotura sin datos de Ventas (avisar a Pablo):</p>
          <p className="mt-1 font-mono text-xs">{huerfanos.join(", ")}</p>
        </section>
      )}

      {/* Pedidos pendientes */}
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-neutral-700">Pedidos pendientes</h2>
        {pendientes.length === 0 ? (
          <p className="text-sm text-neutral-400">Ningún laboratorio en rotura.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-neutral-100 rounded border border-neutral-200 bg-white">
            {pendientes.map((b) => (
              <BolsaItem
                key={b.lab}
                bolsa={b}
                abierto={abierto === b.lab}
                onToggle={() => setAbierto(abierto === b.lab ? null : b.lab)}
                onFichar={() => fichar(b.lab)}
                fichando={fichando === b.lab}
              />
            ))}
          </ul>
        )}
      </section>

      {/* Pedidos ya hechos (sutil) */}
      {hechos.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-neutral-500">Pedidos ya hechos</h2>
          <ul className="flex flex-col divide-y divide-neutral-100 rounded border border-neutral-200 bg-neutral-50">
            {hechos.map((b) => (
              <BolsaItem
                key={b.lab}
                bolsa={b}
                hecho={ahora !== null ? haceX(b.orderedAt, ahora) : undefined}
                abierto={abierto === b.lab}
                onToggle={() => setAbierto(abierto === b.lab ? null : b.lab)}
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

// Una fila de laboratorio: cabecera clicable que expande sus líneas, descarga del
// .xls y (si está pendiente) botón para fichar el pedido como hecho.
function BolsaItem({
  bolsa,
  abierto,
  onToggle,
  onFichar,
  fichando,
  hecho,
}: {
  bolsa: BolsaLab;
  abierto: boolean;
  onToggle: () => void;
  onFichar?: () => void;
  fichando?: boolean;
  hecho?: string;
}) {
  return (
    <li className="flex flex-col">
      <button type="button" onClick={onToggle} className="flex items-baseline justify-between px-4 py-2.5 text-left text-sm hover:bg-neutral-50">
        <span className="font-medium text-neutral-800">{bolsa.lab}</span>
        <span className="text-neutral-400">
          {hecho ? `${hecho} · ` : ""}
          {bolsa.lineas.length} {bolsa.lineas.length === 1 ? "artículo" : "artículos"}
        </span>
      </button>
      {abierto && (
        <div className="flex flex-col gap-3 px-4 pb-3">
          <table className="w-full border-collapse text-sm">
            <tbody>
              {bolsa.lineas.map((l) => (
                <tr key={l.codigo} className="border-t border-neutral-100">
                  <td className="py-1.5 text-neutral-700">{l.denominacion}</td>
                  <td className="py-1.5 text-right tabular-nums text-neutral-600">{l.cantidad}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center gap-4 text-sm">
            <a href={`/farma/api/pedidos/xls?lab=${encodeURIComponent(bolsa.lab)}`} className="text-neutral-700 hover:underline">
              Descargar xls
            </a>
            {onFichar && (
              <button type="button" onClick={onFichar} disabled={fichando} className="text-neutral-700 hover:underline disabled:opacity-40">
                {fichando ? "Fichando…" : "Pedido hecho"}
              </button>
            )}
          </div>
        </div>
      )}
    </li>
  );
}

// "hace X" en español, redondeado a la unidad mayor (min / h / días).
function haceX(epoch: number, ahora: number): string {
  const s = Math.max(0, ahora - epoch) / 1000;
  if (s < 60) return "hace un momento";
  const m = Math.floor(s / 60);
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return `hace ${d} ${d === 1 ? "día" : "días"}`;
}
