import Link from "next/link";
import { requireAdmin } from "../auth";

export default async function MinimosPage() {
  await requireAdmin();
  return (
    <main className="flex flex-col gap-6">
      <header className="flex items-baseline justify-between">
        <h1 className="text-xl font-medium">Mínimos</h1>
        <Link href="/farma/pedidos" className="text-sm text-neutral-600 hover:text-neutral-900">Pedidos</Link>
      </header>
      <p className="text-neutral-500">Ver y editar stocks mínimos — próximamente.</p>
    </main>
  );
}
