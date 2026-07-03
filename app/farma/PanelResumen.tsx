"use client";

import type { MetaInventario } from "@/lib/farma/pedidos-store";
import { fechaMadrid, haceX } from "@/lib/farma/tiempo";

// Tarjeta "Resumen del día" de /farma/maria: el estado del día en solo lectura (los
// datos los calcula el servidor). `ahora` llega de Pedidos (null hasta hidratar): el
// "hace X" y el "¿es de hoy?" dependen de la hora actual, que el HTML del servidor
// no conoce.
export default function PanelResumen({
  pedidos,
  meta,
  pvpCambiados,
  descuentosInferidos,
  ahora,
}: {
  pedidos: number;
  meta: MetaInventario | null;
  pvpCambiados: number;
  descuentosInferidos: number;
  ahora: number | null;
}) {
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
