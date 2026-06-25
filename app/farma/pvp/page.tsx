import Link from "next/link";
import { requireAdmin } from "../auth";

export default async function PvpPage() {
  await requireAdmin();
  return (
    <main className="flex flex-col gap-6">
      <header className="flex items-baseline justify-between">
        <h1 className="text-xl font-medium">PVP</h1>
        <Link href="/farma" className="text-sm text-neutral-600 hover:text-neutral-900">Prioridades</Link>
      </header>
      <p className="text-neutral-500">Cambios de PVP pendientes de reetiquetar — próximamente.</p>
    </main>
  );
}
