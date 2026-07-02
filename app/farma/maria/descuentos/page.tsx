import { requireAdmin } from "../../auth";
import SubpageNav from "../../SubpageNav";
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
    <main className="flex flex-col gap-6">
      <header className="flex items-baseline justify-between">
        <h1 className="text-xl font-medium">Descuentos</h1>
        <SubpageNav vistaUsuario />
      </header>
      <p className="text-sm text-neutral-500">
        Busca por principio activo o laboratorio y corrige el descuento de cada lab. Los valores
        <span className="text-neutral-400"> en gris</span> los hemos inferido: confírmalos o edítalos.
      </p>
      <Descuentos data={data} />
    </main>
  );
}
