import Link from "next/link";
import { tieneSesion } from "./auth";
import LoginForm from "./LoginForm";
import LogoutButton from "./LogoutButton";
import Arbol from "./Arbol";
import redis from "@/lib/redis";
import { KEYS } from "@/lib/arbol/keys";
import type { ArbolData } from "@/lib/arbol/tree";

export default async function ArbolPage() {
  const auth = await tieneSesion();
  if (!auth) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-7 p-6">
        <LoginForm />
        <Link href="/lab" className="text-sm text-neutral-500 hover:text-neutral-900">Volver</Link>
      </div>
    );
  }

  const raw = await redis.get(KEYS.datos());
  const data: ArbolData = raw ? JSON.parse(raw) : { people: [], unions: [], roots: {} };

  return (
    <div className="flex h-full flex-col">
      <nav className="flex items-center justify-between border-b border-neutral-200 px-4 py-2">
        <h1 className="text-[15px] font-semibold">Árbol genealógico</h1>
        <div className="flex items-center gap-4">
          <Link href="/lab" className="text-sm text-neutral-500 hover:text-neutral-900">Volver</Link>
          <LogoutButton />
        </div>
      </nav>
      <div className="min-h-0 flex-1">
        <Arbol data={data} />
      </div>
    </div>
  );
}
