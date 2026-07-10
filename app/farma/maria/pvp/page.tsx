import { requireAdmin } from "../../auth";
import Pvp from "../../Pvp";
import { cargarPvpPendientes, cargarBorradorEtiquetas } from "@/lib/farma/pvp-store";
import { registrarMetrica } from "@/lib/farma/metricas";

// PVP (admin): cambios de precio detectados en la última subida de inventario,
// pendientes de reetiquetar. El diff lo hace la subida (marca `pending`); aquí solo
// se listan y se marcan como hechos. La interacción vive en el componente <Pvp>.
export default async function PvpPage() {
  await requireAdmin();
  await registrarMetrica("visitas:pvp");
  const [pendientes, borrador] = await Promise.all([cargarPvpPendientes(), cargarBorradorEtiquetas()]);

  return (
    <main className="p-[16px]">
      <Pvp pendientes={pendientes} borrador={borrador} />
    </main>
  );
}
