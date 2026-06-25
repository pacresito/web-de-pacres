import Link from "next/link";
import { requireAdmin } from "../auth";
import LogoutButton from "../LogoutButton";
import Pedidos from "../Pedidos";
import { cargarEstadoPedidos } from "@/lib/farma/pedidos-store";

// Pedidos (admin): sube el inventario y ve qué reponer agrupado por laboratorio.
// El estado se recalcula en cada carga desde el snapshot de Redis (cargarEstadoPedidos);
// la interacción (subir, fichar, descargar) vive en el componente cliente <Pedidos>.
export default async function PedidosPage() {
  await requireAdmin();
  const { resultado, meta, pvpCambiados } = await cargarEstadoPedidos();

  return (
    <main className="flex flex-col gap-6">
      <header className="flex items-baseline justify-between">
        <h1 className="text-xl font-medium">Pedidos</h1>
        <nav className="flex items-center gap-4 text-sm text-neutral-600">
          <Link href="/farma" className="hover:text-neutral-900">Prioridades</Link>
          <Link href="/farma/descuentos" className="hover:text-neutral-900">Descuentos</Link>
          <Link href="/farma/minimos" className="hover:text-neutral-900">Mínimos</Link>
          <LogoutButton />
        </nav>
      </header>
      <Pedidos resultado={resultado} meta={meta} pvpCambiados={pvpCambiados} />
    </main>
  );
}
