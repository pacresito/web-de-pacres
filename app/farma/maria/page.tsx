import { requireAdmin } from "../auth";
import Pedidos from "../Pedidos";
import { cargarEstadoPedidos } from "@/lib/farma/pedidos-store";
import { cargarDescuentos } from "@/lib/farma/descuentos-store";
import { cargarBorradorEtiquetas, cargarPvpPendientes } from "@/lib/farma/pvp-store";
import { resumenEtiquetas } from "@/lib/farma/pvp";
import { registrarMetrica } from "@/lib/farma/metricas";

// Panel de María (admin): hub principal. <Pedidos> monta la rejilla del panel —resumen
// del día, subir inventario y pedido manual a la izquierda; las bolsas por pedido a la
// derecha—. Todo se recalcula en cada carga desde el snapshot de Redis. La cabecera y el
// resto de subpáginas cuelgan del layout.
export default async function MariaPage() {
  await requireAdmin();
  await registrarMetrica("visitas:pedidos");
  const [{ resultado, meta, pedidos }, descuentos, pvpPendientes, borrador] = await Promise.all([
    cargarEstadoPedidos(),
    cargarDescuentos(),
    cargarPvpPendientes(),
    cargarBorradorEtiquetas(),
  ]);
  const descuentosInferidos = Object.values(descuentos).flat().filter((d) => d.inferido).length;
  // El recuento de etiquetas sale del borrador guardado (la pantalla PVP lo autosalva).
  const etiquetas = resumenEtiquetas(pvpPendientes, borrador);

  return (
    <Pedidos
      resultado={resultado}
      pedidos={pedidos}
      meta={meta}
      resumen={{ pvpCambiados: pvpPendientes.length, etiquetas, descuentosInferidos }}
    />
  );
}
