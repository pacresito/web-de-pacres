import Link from "next/link";
import { getRol } from "./auth";
import LoginForm from "./LoginForm";
import LogoutButton from "./LogoutButton";
import Prioridades from "./Prioridades";
import redis from "@/lib/redis";
import { KEYS } from "@/lib/farma/keys";
import type { LabDescuento } from "@/lib/farma/prioridades";

// Landing de /farma: sin sesión → login; con sesión → Prioridades. El admin ve
// además los accesos a Pedidos/PVP/Mínimos.
export default async function FarmaPage() {
  const rol = await getRol();
  if (!rol) return <LoginForm />;

  const raw = await redis.get(KEYS.refPrioridades());
  const data: Record<string, LabDescuento[]> = raw ? JSON.parse(raw) : {};

  return (
    <main className="flex flex-col gap-6">
      <header className="flex items-baseline justify-between">
        <h1 className="text-xl font-medium">Prioridades</h1>
        <nav className="flex items-center gap-4 text-sm text-neutral-600">
          {rol === "admin" && (
            <>
              <Link href="/farma/pedidos" className="hover:text-neutral-900">Pedidos</Link>
              <Link href="/farma/pvp" className="hover:text-neutral-900">PVP</Link>
              <Link href="/farma/minimos" className="hover:text-neutral-900">Mínimos</Link>
            </>
          )}
          <LogoutButton />
        </nav>
      </header>
      <Prioridades data={data} />
    </main>
  );
}
