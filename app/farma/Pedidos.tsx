"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { BolsaPedido, ResultadoPedidos } from "@/lib/farma/pedidos";
import { haceX } from "@/lib/farma/tiempo";
import Buscador from "./Buscador";

// Pedidos (admin): subida de inventario + bolsas por pedido. El estado de cabecera lo
// resume <PanelResumen> arriba de la página.
// El cálculo lo hace el servidor (cargarEstadoPedidos); aquí va solo la interacción
// —subir un inventario, fichar un pedido, descargar su .xls, generar un pedido manual—
// y el refresco tras cada acción. Estilo neutro y minimalista (no es la pantalla skin Unycop).
export default function Pedidos({ resultado, pedidos }: { resultado: ResultadoPedidos; pedidos: string[] }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [confirmacion, setConfirmacion] = useState<{ total: number; delta: number | null } | null>(null);
  const [aviso, setAviso] = useState<{ articulos: number; unidades: number } | null>(null); // guarda de carga (#7)
  const [error, setError] = useState("");
  const [nombre, setNombre] = useState(""); // nombre del archivo elegido
  const [abierto, setAbierto] = useState<string | null>(null); // pedido expandido
  const [fichando, setFichando] = useState<string | null>(null);

  // Pedido manual (B5): bolsa del pedido elegido en el buscador. `manualVacio` guarda el
  // pedido cuando no hay nada que pedir, para avisar sin confundirlo con "no buscado".
  const [manual, setManual] = useState<BolsaPedido | null>(null);
  const [manualVacio, setManualVacio] = useState<string | null>(null);
  const [buscandoManual, setBuscandoManual] = useState(false);

  async function pedirManual(pedido: string) {
    setManual(null);
    setManualVacio(null);
    setBuscandoManual(true);
    try {
      const res = await fetch(`/farma/api/pedidos/manual?pedido=${encodeURIComponent(pedido)}`);
      const d = await res.json().catch(() => ({}));
      if (d.bolsa) {
        setManual(d.bolsa);
        setAbierto(d.bolsa.pedido); // recién elegido → expandido
      } else {
        setManualVacio(pedido);
      }
    } catch {
      setError("No se pudo conectar.");
    } finally {
      setBuscandoManual(false);
    }
  }

  // "hace X" depende de la hora actual: se calcula solo tras montar para no romper la
  // hidratación (el HTML del servidor no conoce la hora del cliente).
  const [ahora, setAhora] = useState<number | null>(null);
  useEffect(() => setAhora(Date.now()), []);

  // `confirmar` lo pone el botón del aviso de la guarda de carga (#7): reenvía el
  // mismo archivo saltándose el aviso. El bloqueo es duro, no se confirma.
  async function subir(confirmar = false) {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("Elige un archivo de inventario.");
      return;
    }
    setError("");
    setAviso(null);
    setSubiendo(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      if (confirmar) fd.append("confirmar", "true");
      const res = await fetch("/farma/api/inventario", { method: "POST", body: fd });
      const d = await res.json().catch(() => ({}));
      if (d.estado === "bloqueo") {
        setError(
          `El inventario tiene ${d.articulos.toLocaleString("es-ES")} artículos y ` +
            `${d.unidades.toLocaleString("es-ES")} unidades, fuera de los límites razonables ` +
            `(1.000–6.000 artículos, 10.000–40.000 unidades). Revisa que sea el archivo correcto.`,
        );
        return;
      }
      if (d.estado === "aviso") {
        setAviso({ articulos: d.articulos, unidades: d.unidades }); // pide confirmación
        return;
      }
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

  async function fichar(pedido: string) {
    setFichando(pedido);
    try {
      const res = await fetch("/farma/api/pedidos/done", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pedido }),
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

  const { pendientes, hechos, huerfanos } = resultado;

  return (
    <div className="flex flex-col gap-6">
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
            onClick={() => subir()}
            disabled={subiendo || !nombre}
            className="rounded bg-neutral-900 px-3 py-1.5 text-sm text-white hover:bg-neutral-700 disabled:opacity-40"
          >
            {subiendo ? "Subiendo…" : "Subir inventario"}
          </button>
        </div>
        {aviso && (
          <div className="flex flex-col gap-2 rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            <p>
              En este excel hay <strong>{aviso.articulos.toLocaleString("es-ES")} artículos</strong> y{" "}
              <strong>{aviso.unidades.toLocaleString("es-ES")} unidades</strong>; normalmente hay entre
              3.000–4.000 artículos y 20.000–30.000 unidades. ¿Seguro que has subido el archivo correcto?
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => subir(true)}
                disabled={subiendo}
                className="rounded bg-amber-700 px-3 py-1.5 text-white hover:bg-amber-800 disabled:opacity-40"
              >
                Sí, actualizar igualmente
              </button>
              <button
                type="button"
                onClick={() => setAviso(null)}
                disabled={subiendo}
                className="rounded border border-amber-300 px-3 py-1.5 hover:bg-amber-100 disabled:opacity-40"
              >
                No, lo compruebo y te digo
              </button>
            </div>
          </div>
        )}
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
          <p className="text-sm text-neutral-400">Ningún pedido en rotura.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-neutral-100 rounded border border-neutral-200 bg-white">
            {pendientes.map((b) => (
              <BolsaItem
                key={b.pedido}
                bolsa={b}
                abierto={abierto === b.pedido}
                onToggle={() => setAbierto(abierto === b.pedido ? null : b.pedido)}
                onFichar={() => fichar(b.pedido)}
                fichando={fichando === b.pedido}
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
                key={b.pedido}
                bolsa={b}
                hecho={ahora !== null ? haceX(b.orderedAt, ahora) : undefined}
                abierto={abierto === b.pedido}
                onToggle={() => setAbierto(abierto === b.pedido ? null : b.pedido)}
              />
            ))}
          </ul>
        </section>
      )}

      {/* Pedido manual (B5): generar un pedido aunque nada haya roto stock. Uso poco
          habitual → al final y discreto. */}
      <section className="flex flex-col gap-2 border-t border-neutral-100 pt-4">
        <h2 className="text-sm font-medium text-neutral-500">Pedido manual</h2>
        <p className="text-xs text-neutral-400">
          Genera la bolsa de un pedido aunque no haya roturas (por ejemplo, para reponer antes de tiempo).
        </p>
        <Buscador items={pedidos} onSelect={pedirManual} placeholder="Buscar pedido…" />
        {buscandoManual && <p className="text-sm text-neutral-400">Calculando…</p>}
        {manual && (
          <ul className="flex flex-col rounded border border-neutral-200 bg-white">
            <BolsaItem
              bolsa={manual}
              abierto={abierto === manual.pedido}
              onToggle={() => setAbierto(abierto === manual.pedido ? null : manual.pedido)}
            />
          </ul>
        )}
        {manualVacio && (
          <p className="text-sm text-neutral-400">No hay nada que pedir en «{manualVacio}».</p>
        )}
      </section>
    </div>
  );
}

// Una fila de pedido: cabecera clicable que expande sus líneas, descarga del .xls y
// (si está pendiente) botón para fichar el pedido como hecho.
function BolsaItem({
  bolsa,
  abierto,
  onToggle,
  onFichar,
  fichando,
  hecho,
}: {
  bolsa: BolsaPedido;
  abierto: boolean;
  onToggle: () => void;
  onFichar?: () => void;
  fichando?: boolean;
  hecho?: string;
}) {
  return (
    <li className="flex flex-col">
      <button type="button" onClick={onToggle} className="flex items-baseline justify-between px-4 py-2.5 text-left text-sm hover:bg-neutral-50">
        <span className="font-medium text-neutral-800">{bolsa.pedido}</span>
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
            <a href={`/farma/api/pedidos/xls?pedido=${encodeURIComponent(bolsa.pedido)}`} className="text-neutral-700 hover:underline">
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