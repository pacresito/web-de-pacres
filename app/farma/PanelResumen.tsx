"use client";

import { useEffect, useState } from "react";
import type { MetaInventario } from "@/lib/farma/pedidos-store";
import { fechaMadrid, haceX } from "@/lib/farma/tiempo";

// Panel de bienvenida de /farma/maria: el estado del día en texto plano (la navegación
// la cubre el nav de arriba). Es solo lectura; los datos los calcula el servidor. El
// "hace X" depende de la hora actual, así que se monta vacío y se rellena tras hidratar
// para no romper la hidratación (el HTML del servidor no conoce la hora del cliente).
// La línea del inventario va la última, justo encima de la caja de subir uno nuevo.
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

  return (
    <section className="flex flex-col gap-2 text-sm">
      <p className="text-neutral-500">Aquí tienes un resumen:</p>

      {/* Pedidos disponibles */}
      <p className={pedidos > 0 ? "text-neutral-700" : "text-neutral-400"}>
        {pedidos > 0
          ? `${pedidos} ${pedidos === 1 ? "pedido listo" : "pedidos listos"} para hacer`
          : "No hay pedidos pendientes."}
      </p>

      {/* Descuentos inferidos pendientes de revisar */}
      <p className={descuentosInferidos > 0 ? "text-neutral-700" : "text-neutral-400"}>
        {descuentosInferidos > 0
          ? `${descuentosInferidos} ${descuentosInferidos === 1 ? "descuento inferido" : "descuentos inferidos"} por revisar`
          : "No quedan descuentos por revisar."}
      </p>

      {/* Precios cambiados: solo aparece si hay alguno. El tono escala con la cantidad. */}
      {pvpCambiados > 0 && <p className="text-neutral-700">{textoPrecios(pvpCambiados)}</p>}

      {/* Última carga de inventario (la última, pegada a la caja de subir). La fecha va
          en negro, o ámbar si el inventario no es de hoy (el "hace X" solo tras hidratar). */}
      <p className="text-neutral-700">
        {meta ? (
          <>
            Inventario del{" "}
            <span className={ahora !== null && fechaMadrid(ahora) !== meta.fechaInforme ? "text-amber-800" : "text-neutral-900"}>
              {meta.fechaInforme}
            </span>
            {ahora !== null && <span className="text-neutral-400"> subido {haceX(meta.loadedAt, ahora)}</span>} ·{" "}
            {meta.totalArticulos.toLocaleString("es-ES")} artículos ·{" "}
            {meta.unidades.toLocaleString("es-ES")} unidades
          </>
        ) : (
          <span className="text-neutral-400">Aún no se ha subido ningún inventario.</span>
        )}
      </p>
    </section>
  );
}

// El tono escala con cuántos precios hay sin reetiquetar: pocos restan importancia,
// muchos aprietan.
function textoPrecios(n: number): string {
  if (n === 1) return "Sólo ha cambiado 1 precio";
  if (n < 5) return `Sólo hay ${n} precios cambiados`;
  if (n < 10) return `Hay ${n} precios cambiados`;
  return `Ya hay ${n} precios cambiados`;
}
