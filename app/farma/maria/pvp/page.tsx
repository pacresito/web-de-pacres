import { requireAdmin } from "../../auth";
import Pvp from "../../Pvp";
import { cargarPvpPendientes } from "@/lib/farma/pvp-store";

// PVP (admin): cambios de precio detectados en la última subida de inventario,
// pendientes de reetiquetar. El diff lo hace la subida (marca `pending`); aquí solo
// se listan y se marcan como hechos. La interacción vive en el componente <Pvp>.
export default async function PvpPage() {
  await requireAdmin();
  const pendientes = await cargarPvpPendientes();

  return (
    <main className="p-[16px]">
      <Pvp pendientes={pendientes} />
    </main>
  );
}
