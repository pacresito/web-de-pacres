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
      <div className="flex min-h-screen items-center justify-center p-6">
        <LoginForm />
      </div>
    );
  }

  const raw = await redis.get(KEYS.datos());
  const data: ArbolData = raw ? JSON.parse(raw) : { people: [], unions: [], roots: {} };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-4 px-4 py-6">
      <nav className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Árbol genealógico</h1>
        <LogoutButton />
      </nav>
      <Arbol data={data} />
    </div>
  );
}
