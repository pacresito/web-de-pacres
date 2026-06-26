import { requireAdmin } from "../../auth";
import SubpageNav from "../../SubpageNav";
import Pvp from "../../Pvp";
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
        <SubpageNav />
      </header>
      <Pvp pendientes={pendientes} />
    </main>
  );
}
