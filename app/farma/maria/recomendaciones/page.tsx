import { requireAdmin } from "../../auth";
import Recomendaciones from "../../Recomendaciones";
import { cargarRecomendaciones } from "@/lib/farma/recomendaciones-store";
import { registrarMetrica } from "@/lib/farma/metricas";
import redis from "@/lib/redis";
import { KEYS } from "@/lib/farma/keys";
import type { RefPedidos } from "@/lib/farma/pedidos";

// Recomendaciones (admin): María define, por artículo, qué otros se le ofrecen en el
// mostrador (ventas cruzadas). Mismo blob que la vista de usuario; aquí lo edita.
export default async function RecomendacionesPage() {
  await requireAdmin();
  await registrarMetrica("visitas:recomendaciones");

  const [recomendaciones, refRaw] = await Promise.all([
    cargarRecomendaciones(),
    redis.get(KEYS.refPedidos()),
  ]);
  const ref: RefPedidos = refRaw ? JSON.parse(refRaw) : {};

  return (
    <main className="p-[16px]">
      <Recomendaciones catalogo={ref} data={recomendaciones} />
    </main>
  );
}
