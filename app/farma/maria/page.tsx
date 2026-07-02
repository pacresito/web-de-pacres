import Link from "next/link";
import { requireAdmin } from "../auth";
import LogoutButton from "../LogoutButton";
import PanelResumen from "../PanelResumen";
import Pedidos from "../Pedidos";
import { cargarEstadoPedidos } from "@/lib/farma/pedidos-store";
import redis from "@/lib/redis";
import { KEYS } from "@/lib/farma/keys";
import type { LabDescuento } from "@/lib/farma/prioridades";

// Panel de María (admin): hub principal. Arriba, <PanelResumen> con el estado del día
// (pedidos, última carga, precios, descuentos) enlazando a cada pantalla; debajo,
// <Pedidos> sube el inventario y lista qué reponer. Todo se recalcula en cada carga
// desde el snapshot de Redis. Desde aquí cuelgan el resto de subpáginas.
export default async function MariaPage() {
  await requireAdmin();
  const [{ resultado, meta, pvpCambiados, pedidos }, descRaw] = await Promise.all([
    cargarEstadoPedidos(),
    redis.get(KEYS.descuentos()),
  ]);
  const descuentos: Record<string, LabDescuento[]> = descRaw ? JSON.parse(descRaw) : {};
  const descuentosInferidos = Object.values(descuentos).flat().filter((d) => d.inferido).length;

  return (
    <main className="flex flex-col gap-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
        <h1 className="text-xl font-medium">¡Hola María!</h1>
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-neutral-600">
          <Link href="/farma/maria/descuentos" className="hover:text-neutral-900">Descuentos</Link>
          <Link href="/farma/maria/inventario" className="hover:text-neutral-900">Inventario</Link>
          <Link href="/farma/maria/pvp" className="hover:text-neutral-900">PVP</Link>
          <LogoutButton />
        </nav>
      </header>
      <PanelResumen
        pedidos={resultado.pendientes.length}
        meta={meta}
        pvpCambiados={pvpCambiados}
        descuentosInferidos={descuentosInferidos}
      />
      <Pedidos resultado={resultado} pedidos={pedidos} meta={meta} />
    </main>
  );
}
