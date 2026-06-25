import Link from "next/link";
import { requireAdmin } from "../auth";
import LogoutButton from "../LogoutButton";

export default async function MinimosPage() {
  await requireAdmin();
  return (
    <main className="flex flex-col gap-6">
      <header className="flex items-baseline justify-between">
        <h1 className="text-xl font-medium">Mínimos</h1>
        <nav className="flex items-center gap-4 text-sm text-neutral-600">
          <Link href="/farma/pedidos" className="hover:text-neutral-900">Pedidos</Link>
          <LogoutButton />
        </nav>
      </header>
      <p className="text-neutral-500">Ver y editar stocks mínimos — próximamente.</p>
    </main>
  );
}
