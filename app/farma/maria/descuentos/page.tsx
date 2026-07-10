import { requireAdmin } from "../../auth";
import Descuentos from "../../Descuentos";
import { cargarDescuentos } from "@/lib/farma/descuentos-store";
import { registrarMetrica } from "@/lib/farma/metricas";

// Descuentos (admin): la tabla de Prioridades en modo edición sobre el blob mutable
// farma:descuentos. Mismo dato que la landing; aquí María lo corrige.
export default async function DescuentosPage() {
  await requireAdmin();
  await registrarMetrica("visitas:descuentos");

  const data = await cargarDescuentos();

  return (
    <main className="p-[16px]">
      <Descuentos data={data} />
    </main>
  );
}
