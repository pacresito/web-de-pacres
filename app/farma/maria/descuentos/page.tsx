import { requireAdmin } from "../../auth";
import Descuentos from "../../Descuentos";
import redis from "@/lib/redis";
import { KEYS } from "@/lib/farma/keys";
import type { LabDescuento } from "@/lib/farma/prioridades";

// Descuentos (admin): la tabla de Prioridades en modo edición sobre el blob mutable
// farma:descuentos. Mismo dato que la landing; aquí María lo corrige.
export default async function DescuentosPage() {
  await requireAdmin();

  const raw = await redis.get(KEYS.descuentos());
  const data: Record<string, LabDescuento[]> = raw ? JSON.parse(raw) : {};

  return (
    <main className="p-[16px]">
      <Descuentos data={data} />
    </main>
  );
}
