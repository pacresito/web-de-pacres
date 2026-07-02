import { requireAdmin } from "../auth";
import Pedidos from "../Pedidos";
import { cargarEstadoPedidos } from "@/lib/farma/pedidos-store";
import redis from "@/lib/redis";
import { KEYS } from "@/lib/farma/keys";
import type { LabDescuento } from "@/lib/farma/prioridades";

// Panel de María (admin): hub principal. <Pedidos> monta la rejilla del panel —resumen
// del día, subir inventario y pedido manual a la izquierda; las bolsas por pedido a la
// derecha—. Todo se recalcula en cada carga desde el snapshot de Redis. La cabecera y el
// resto de subpáginas cuelgan del layout.
export default async function MariaPage() {
  await requireAdmin();
  const [{ resultado, meta, pvpCambiados, pedidos }, descRaw] = await Promise.all([
    cargarEstadoPedidos(),
    redis.get(KEYS.descuentos()),
  ]);
  const descuentos: Record<string, LabDescuento[]> = descRaw ? JSON.parse(descRaw) : {};
  const descuentosInferidos = Object.values(descuentos).flat().filter((d) => d.inferido).length;

  return (
    <Pedidos
      resultado={resultado}
      pedidos={pedidos}
      meta={meta}
      resumen={{ pvpCambiados, descuentosInferidos }}
    />
  );
}
