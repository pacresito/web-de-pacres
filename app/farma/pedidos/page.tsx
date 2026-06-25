import Link from "next/link";
import { requireAdmin } from "../auth";
import LogoutButton from "../LogoutButton";

export default async function PedidosPage() {
  await requireAdmin();
  return (
    <main className="flex flex-col gap-6">
      <header className="flex items-baseline justify-between">
        <h1 className="text-xl font-medium">Pedidos</h1>
        <nav className="flex items-center gap-4 text-sm text-neutral-600">
          <Link href="/farma" className="hover:text-neutral-900">Prioridades</Link>
          <LogoutButton />
        </nav>
      </header>
      <p className="text-neutral-500">Subida de inventario y pedidos — próximamente.</p>
    </main>
  );
}
