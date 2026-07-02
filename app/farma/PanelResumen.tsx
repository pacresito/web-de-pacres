"use client";

import { useEffect, useState } from "react";
import type { MetaInventario } from "@/lib/farma/pedidos-store";
import { fechaMadrid, haceX } from "@/lib/farma/tiempo";

// Tarjeta "Resumen del día" de /farma/maria: el estado del día en solo lectura (los
// datos los calcula el servidor). El "hace X" y el "¿es de hoy?" dependen de la hora
// actual, así que se montan vacíos y se rellenan tras hidratar para no romper la
// hidratación (el HTML del servidor no conoce la hora del cliente).
export default function PanelResumen({
  pedidos,
  meta,
  pvpCambiados,
  descuentosInferidos,
}: {
  pedidos: number;
  meta: MetaInventario | null;
  pvpCambiados: number;
  descuentosInferidos: number;
}) {
  const [ahora, setAhora] = useState<number | null>(null);
  useEffect(() => setAhora(Date.now()), []);

  const invViejo = ahora !== null && meta !== null && fechaMadrid(ahora) !== meta.fechaInforme;

  return (
    <section className="fa-card">
      <div className="fa-card-label mb-3">Resumen del día</div>
      <div className="fa-t-ink2 flex flex-col gap-[7px] text-sm">
        <p><Cuenta n={pedidos} uno="pedido pendiente" varios="pedidos pendientes" /></p>
        <p><Cuenta n={descuentosInferidos} uno="descuento por revisar" varios="descuentos por revisar" /></p>
        <p><Cuenta n={pvpCambiados} uno="precio cambiado" varios="precios cambiados" /></p>
      </div>
      <div className="fa-t-ink3 mt-3 border-t pt-3 text-[13px] leading-[1.55]" style={{ borderColor: "var(--fa-rule)" }}>
        {meta ? (
          <>
            <p>
              Inventario del{" "}
              <span className={invViejo ? "fa-t-amber font-semibold" : "font-semibold"} style={invViejo ? undefined : { color: "var(--fa-ink)" }}>
                {meta.fechaInforme}
              </span>
              {ahora !== null && <> subido <span className="fa-t-muted2">{haceX(meta.loadedAt, ahora)}</span></>}
            </p>
            <p>{meta.totalArticulos.toLocaleString("es-ES")} artículos · {meta.unidades.toLocaleString("es-ES")} unidades</p>
          </>
        ) : (
          <p className="fa-t-muted2">Aún no se ha subido ningún inventario.</p>
        )}
      </div>
    </section>
  );
}

function Cuenta({ n, uno, varios }: { n: number; uno: string; varios: string }) {
  return (
    <>
      <b className="font-semibold" style={{ color: "var(--fa-ink)" }}>{n}</b> {n === 1 ? uno : varios}
    </>
  );
}
