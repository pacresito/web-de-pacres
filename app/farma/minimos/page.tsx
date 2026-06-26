import Link from "next/link";
import { requireAdmin } from "../auth";
import LogoutButton from "../LogoutButton";
import Minimos, { type ArticuloMin } from "../Minimos";
import redis from "@/lib/redis";
import { KEYS } from "@/lib/farma/keys";
import type { RefPedidos } from "@/lib/farma/pedidos";

// Mínimos (admin): ajustar el stock mínimo de cada artículo (hash mutable
// farma:stmin) junto a su consumo mensual (de la referencia de Ventas, solo
// lectura). El universo es el de artículos con stock mínimo definido; los que no
// están en la referencia se omiten (sin denominación ni consumo que mostrar).
export default async function MinimosPage() {
  await requireAdmin();

  const [refRaw, stmin] = await Promise.all([
    redis.get(KEYS.refPedidos()),
    redis.hgetall(KEYS.stmin()),
  ]);
  const ref: RefPedidos = refRaw ? JSON.parse(refRaw) : {};

  const articulos: ArticuloMin[] = Object.entries(stmin).flatMap(([codigo, min]) => {
    const r = ref[codigo];
    if (!r) return [];
    return [{ codigo, denominacion: r.denominacion, stMin: Number(min), consumoMensual: r.consumoMensual }];
  });

  return (
    <main className="flex flex-col gap-6">
      <header className="flex items-baseline justify-between">
        <h1 className="text-xl font-medium">Mínimos</h1>
        <nav className="flex items-center gap-4 text-sm text-neutral-600">
          <Link href="/farma/pedidos" className="hover:text-neutral-900">Pedidos</Link>
          <LogoutButton />
        </nav>
      </header>
      <p className="text-sm text-neutral-500">
        Ajusta el stock mínimo de cada artículo. Las líneas
        <span className="text-amber-800"> resaltadas</span> tienen el stock mínimo por encima
        del consumo mensual: revísalas.
      </p>
      <Minimos articulos={articulos} />
    </main>
  );
}
