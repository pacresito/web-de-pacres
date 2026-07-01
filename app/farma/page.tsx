import Link from "next/link";
import { getRol } from "./auth";
import LoginForm from "./LoginForm";
import LogoutButton from "./LogoutButton";
import Prioridades from "./Prioridades";
import redis from "@/lib/redis";
import { KEYS } from "@/lib/farma/keys";
import type { LabDescuento } from "@/lib/farma/prioridades";

// Landing de /farma: sin sesión → login; con sesión → Prioridades. El admin ve
// además el acceso a su panel (/farma/maria), desde donde cuelga el resto.
export default async function FarmaPage() {
  const rol = await getRol();
  if (!rol) return <LoginForm />;

  const raw = await redis.get(KEYS.descuentos());
  const data: Record<string, LabDescuento[]> = raw ? JSON.parse(raw) : {};

  return (
    <main className="flex flex-col gap-3">
      <nav className="flex items-center justify-end gap-4 text-sm text-neutral-600">
        {rol === "admin" && (
          <Link href="/farma/maria" className="hover:text-neutral-900">Volver</Link>
        )}
        <LogoutButton />
      </nav>
      <Prioridades data={data} />
    </main>
  );
}
