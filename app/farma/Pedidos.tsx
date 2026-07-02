"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { BolsaPedido, ResultadoPedidos } from "@/lib/farma/pedidos";
import type { MetaInventario } from "@/lib/farma/pedidos-store";
import { fechaMadrid, haceX } from "@/lib/farma/tiempo";
import Buscador from "./Buscador";
import PanelResumen from "./PanelResumen";

// Panel de María (hub): rejilla de dos columnas. Izquierda, las tarjetas de estado y
// acciones de entrada (resumen del día, subir inventario, pedido manual); derecha, las
// bolsas por pedido (pendientes y descargadas). El cálculo lo hace el servidor
// (cargarEstadoPedidos); aquí va solo la interacción —subir inventario, descargar un
// pedido, generar uno manual— y el refresco tras cada acción.
export default function Pedidos({
  resultado,
  pedidos,
  meta,
  resumen,
}: {
  resultado: ResultadoPedidos;
  pedidos: string[];
  meta: MetaInventario | null;
  resumen: { pvpCambiados: number; descuentosInferidos: number };
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [confirmacion, setConfirmacion] = useState<{ total: number; delta: number | null; deltaUnidades: number | null } | null>(null);
  const [aviso, setAviso] = useState<{ articulos: number; unidades: number } | null>(null); // guarda de carga (#7)
  const [error, setError] = useState("");
  const [nombre, setNombre] = useState(""); // nombre del archivo elegido
  const [abierto, setAbierto] = useState<string | null>(null); // pedido expandido
  const [avisoDescarga, setAvisoDescarga] = useState(false); // se descargó un pedido con inventario no de hoy

  // Pedido manual (B5): bolsa del pedido elegido en el buscador. `manualVacio` guarda el
  // pedido cuando no hay nada que pedir, para avisar sin confundirlo con "no buscado".
  const [manual, setManual] = useState<BolsaPedido | null>(null);
  const [manualVacio, setManualVacio] = useState<string | null>(null);
  const [buscandoManual, setBuscandoManual] = useState(false);

  // "hace X" y "¿es de hoy el inventario?" dependen de la hora actual: se calculan solo
  // tras montar para no romper la hidratación (el HTML del servidor no conoce la hora).
  const [ahora, setAhora] = useState<number | null>(null);
  useEffect(() => setAhora(Date.now()), []);
  const inventarioViejo = ahora !== null && meta !== null && fechaMadrid(ahora) !== meta.fechaInforme;

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
      if (d.estado === "formato") {
        // No viene desglosado por familia → sin dato de IVA no se actualizan los PVP; no se toca nada.
        setError(
          "Este inventario no viene por familia, así que no puedo distinguir el IVA. " +
            "Vuelve a exportarlo desde UnycopWin como inventario por familia y súbelo otra vez.",
        );
        return;
      }
      if (!res.ok) {
        setError(d.error ?? "No se pudo subir el inventario.");
        return;
      }
      setConfirmacion({ total: d.totalArticulos, delta: d.delta, deltaUnidades: d.deltaUnidades });
      setAvisoDescarga(false); // inventario nuevo: el aviso de descarga con inventario viejo ya no aplica
      if (fileRef.current) fileRef.current.value = "";
      setNombre("");
      router.refresh();
    } catch {
      setError("No se pudo conectar.");
    } finally {
      setSubiendo(false);
    }
  }

  // Descargar un pedido lo marca como descargado (pasa a "Pedidos descargados") y refresca.
  // El propio <a> dispara la descarga del .xls; aquí solo marcamos + limpiamos el pedido
  // manual (si era uno, ya saldrá abajo en descargados) y avisamos si el inventario no es
  // de hoy (#5).
  async function descargar(pedido: string) {
    if (inventarioViejo) setAvisoDescarga(true);
    setManual(null);
    setManualVacio(null);
    setAbierto(null);
    try {
      await fetch("/farma/api/pedidos/done", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pedido }),
      });
    } catch {
      // la descarga ya ha salido por el enlace; si el marcado falla no bloqueamos a María
    }
    router.refresh();
  }

  const { pendientes, hechos, huerfanos } = resultado;

  return (
    <div className="flex flex-col gap-[18px] p-[18px] max-[680px]:p-3">
      {/* Huérfanos: en rotura pero sin datos de Ventas → avisar a Pablo */}
      {huerfanos.length > 0 && (
        <section className="fa-note-red p-3 text-sm">
          <p className="font-semibold">Artículos en rotura sin datos de Ventas (avisar a Pablo):</p>
          <p className="fa-mono mt-1 text-xs">{huerfanos.join(", ")}</p>
        </section>
      )}

      {/* Aviso #5: se descargó un pedido con un inventario que no es de hoy */}
      {avisoDescarga && (
        <p className="fa-note-amber p-3 text-sm">
          Ojo: el inventario{meta ? ` es del ${meta.fechaInforme}` : ""}, no de hoy. El pedido descargado puede no
          reflejar el stock actual.
        </p>
      )}

      <div className="grid grid-cols-1 gap-[18px] min-[940px]:grid-cols-[398px_1fr]">
        {/* Columna izquierda: estado y acciones de entrada */}
        <div className="flex flex-col gap-[14px]">
          <PanelResumen
            pedidos={pendientes.length}
            meta={meta}
            pvpCambiados={resumen.pvpCambiados}
            descuentosInferidos={resumen.descuentosInferidos}
          />

          {/* Subir inventario */}
          <section className="fa-card">
            <div className="fa-card-label mb-3">Subir inventario</div>
            <div className="flex flex-wrap items-center gap-2.5">
              {/* El input nativo se oculta (se ve distinto en cada navegador) y se dispara
                  desde un botón propio; el nombre del archivo elegido se muestra al lado. */}
              <input
                ref={fileRef}
                type="file"
                accept=".xls,.xlsx"
                className="hidden"
                onChange={(e) => setNombre(e.target.files?.[0]?.name ?? "")}
              />
              <button type="button" onClick={() => fileRef.current?.click()} className="fa-btn fa-btn-outline px-3 py-2 text-[13px]">
                Elegir archivo
              </button>
              <span className="fa-mono fa-t-ink2 text-[12.5px]">{nombre || "Ningún archivo elegido"}</span>
            </div>
            <button
              type="button"
              onClick={() => subir()}
              disabled={subiendo || !nombre}
              className="fa-btn fa-btn-primary mt-3 h-[38px] w-full"
            >
              {subiendo ? "Subiendo…" : "Subir inventario"}
            </button>
            {aviso && (
              <div className="fa-note-amber mt-3 p-3">
                <p className="text-[13px] leading-[1.5]" style={{ color: "var(--fa-amber-ink)" }}>
                  En este excel hay <strong>{aviso.articulos.toLocaleString("es-ES")} artículos</strong> y{" "}
                  <strong>{aviso.unidades.toLocaleString("es-ES")} unidades</strong>; normalmente hay entre
                  3.000–4.000 artículos y 20.000–30.000 unidades. ¿Seguro que has subido el archivo correcto?
                </p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  <button type="button" onClick={() => subir(true)} disabled={subiendo} className="fa-btn fa-btn-amber px-3 py-[7px] text-[13px]">
                    Sí, subir igualmente
                  </button>
                  <button
                    type="button"
                    onClick={() => setAviso(null)}
                    disabled={subiendo}
                    className="fa-btn px-3 py-[7px] text-[13px]"
                    style={{ border: "1px solid #e6cfa0", background: "#fff", color: "var(--fa-amber-ink)" }}
                  >
                    No, lo compruebo
                  </button>
                </div>
              </div>
            )}
            {confirmacion && (
              <p className="fa-t-green mt-2.5 text-[13px] leading-[1.5]">
                ✓ Inventario actualizado · {confirmacion.total.toLocaleString("es-ES")} artículos
                {confirmacion.delta !== null && (
                  <> · <Delta n={confirmacion.delta} sustantivo="artículos" /></>
                )}
                {confirmacion.deltaUnidades !== null && (
                  <> · <Delta n={confirmacion.deltaUnidades} sustantivo="unidades" /></>
                )}
              </p>
            )}
            {error && <p className="fa-t-red mt-2 text-[13px]">{error}</p>}
          </section>

          {/* Pedido manual (B5): generar la bolsa de un pedido concreto aunque nada haya roto stock. */}
          <section className="fa-card">
            <div className="fa-card-label mb-3">Pedido manual</div>
            <Buscador items={pedidos} onSelect={pedirManual} placeholder="Buscar pedido…" inputClassName="fa-input" />
            {buscandoManual && <p className="fa-t-muted2 mt-2 text-sm">Calculando…</p>}
            {manual && (
              <ul className="fa-panel mt-3">
                <BolsaItem
                  bolsa={manual}
                  abierto={abierto === manual.pedido}
                  onToggle={() => setAbierto(abierto === manual.pedido ? null : manual.pedido)}
                  onDescargar={descargar}
                />
              </ul>
            )}
            {manualVacio && <p className="fa-t-muted2 mt-2 text-sm">No hay nada que pedir en «{manualVacio}».</p>}
          </section>
        </div>

        {/* Columna derecha: bolsas por pedido */}
        <div className="flex flex-col gap-[18px]">
          <div>
            <div className="mb-2.5 flex items-baseline justify-between">
              <h2 className="text-sm font-semibold">Pedidos pendientes</h2>
              <span className="fa-t-muted text-[12.5px]">
                {pendientes.length} {pendientes.length === 1 ? "pedido" : "pedidos"}
              </span>
            </div>
            {pendientes.length === 0 ? (
              <p className="fa-t-muted2 text-sm">Ningún pedido en rotura.</p>
            ) : (
              <ul className="fa-panel">
                {pendientes.map((b) => (
                  <BolsaItem
                    key={b.pedido}
                    bolsa={b}
                    abierto={abierto === b.pedido}
                    onToggle={() => setAbierto(abierto === b.pedido ? null : b.pedido)}
                    onDescargar={descargar}
                  />
                ))}
              </ul>
            )}
          </div>

          {/* Pedidos descargados (apagado) */}
          {hechos.length > 0 && (
            <div className="opacity-[0.72]">
              <div className="mb-2.5 flex items-baseline justify-between">
                <h2 className="fa-t-ink2 text-sm font-semibold">Pedidos descargados</h2>
                <span className="fa-t-muted2 text-[12.5px]">
                  {hechos.length} {hechos.length === 1 ? "pedido" : "pedidos"}
                </span>
              </div>
              <ul className="fa-panel" style={{ background: "#fbfcfd" }}>
                {hechos.map((b) => (
                  <BolsaItem
                    key={b.pedido}
                    bolsa={b}
                    hecho={ahora !== null ? haceX(b.orderedAt, ahora) : undefined}
                    abierto={abierto === b.pedido}
                    onToggle={() => setAbierto(abierto === b.pedido ? null : b.pedido)}
                    onDescargar={descargar}
                  />
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Segmento de delta coloreado del texto de confirmación (#8): verde si sube, rojo si
// baja. El negativo ya trae su "−"; al positivo le anteponemos "+".
function Delta({ n, sustantivo }: { n: number; sustantivo: string }) {
  const clase = n > 0 ? "fa-t-green" : n < 0 ? "fa-t-red" : "fa-t-muted";
  return (
    <span className={`fa-mono ${clase} font-semibold`}>
      {n > 0 ? "+" : ""}
      {n.toLocaleString("es-ES")} {sustantivo}
    </span>
  );
}

// Una fila de pedido: cabecera clicable que expande sus líneas y descarga del .xls (que
// además lo marca como descargado). El check manual "Pedido hecho" ya no existe: descargar
// es el disparador.
function BolsaItem({
  bolsa,
  abierto,
  onToggle,
  onDescargar,
  hecho,
}: {
  bolsa: BolsaPedido;
  abierto: boolean;
  onToggle: () => void;
  onDescargar: (pedido: string) => void;
  hecho?: string;
}) {
  return (
    <li className="fa-bolsa flex flex-col" style={{ borderBottom: "1px solid var(--fa-rule)" }}>
      <button type="button" onClick={onToggle} className="flex items-center justify-between px-3.5 py-3 text-left hover:bg-[#fafbfc]">
        <span className="flex items-center gap-2.5">
          <span className={`w-3 text-[11px] ${abierto ? "fa-t-accent" : "fa-t-muted2"}`}>{abierto ? "▾" : "▸"}</span>
          <span className="text-sm font-medium">{bolsa.pedido}</span>
        </span>
        <span className="fa-t-ink3 text-[13px]">
          {hecho ? `${hecho} · ` : ""}
          {bolsa.lineas.length} {bolsa.lineas.length === 1 ? "artículo" : "artículos"}
        </span>
      </button>
      {abierto && (
        <div className="px-3.5 pb-3.5 pl-[34px]" style={{ background: hecho ? undefined : "#fcfdfe" }}>
          <table className="w-full border-collapse">
            <tbody>
              {bolsa.lineas.map((l) => (
                <tr key={l.codigo} style={{ borderTop: "1px solid #f0f2f5" }}>
                  <td className="fa-t-ink2 py-[7px] text-[13px]">{l.denominacion}</td>
                  <td className="fa-mono fa-t-ink2 py-[7px] text-right text-[13px]">{l.cantidad}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!hecho && (
            <a
              href={`/farma/api/pedidos/xls?pedido=${encodeURIComponent(bolsa.pedido)}`}
              onClick={() => onDescargar(bolsa.pedido)}
              className="fa-t-accent mt-2.5 inline-block text-[13px] font-medium hover:underline"
            >
              Descargar pedido ↓
            </a>
          )}
        </div>
      )}
    </li>
  );
}
