import Link from "next/link";
import { requireAdmin } from "../auth";
import LogoutButton from "../LogoutButton";
import Pvp from "../Pvp";
import { cargarPvpPendientes } from "@/lib/farma/pvp";

// PVP (admin): cambios de precio detectados en la última subida de inventario,
// pendientes de reetiquetar. El diff lo hace la subida (marca `pending`); aquí solo
// se listan y se marcan como hechos. La interacción vive en el componente <Pvp>.
export default async function PvpPage() {
  await requireAdmin();
  const pendientes = await cargarPvpPendientes();

  return (
    <main className="flex flex-col gap-6">
      <header className="flex items-baseline justify-between">
        <h1 className="text-xl font-medium">PVP</h1>
        <nav className="flex items-center gap-4 text-sm text-neutral-600">
          <Link href="/farma/pedidos" className="hover:text-neutral-900">Pedidos</Link>
          <Link href="/farma" className="hover:text-neutral-900">Prioridades</Link>
          <LogoutButton />
        </nav>
      </header>
      <Pvp pendientes={pendientes} />
    </main>
  );
}
