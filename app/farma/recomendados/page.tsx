import Link from "next/link";
import { redirect } from "next/navigation";
import { getRol } from "../auth";
import LogoutButton from "../LogoutButton";
import Recomendados from "../Recomendados";
import { cargarRecomendaciones } from "@/lib/farma/recomendaciones-store";
import { registrarMetrica } from "@/lib/farma/metricas";
import redis from "@/lib/redis";
import { KEYS } from "@/lib/farma/keys";
import type { RefPedidos } from "@/lib/farma/pedidos";

// Vista de mostrador de ventas cruzadas: el usuario busca un artículo y ve los que se
// recomiendan con él. Mismo skin UnycopWin que Prioridades. Sin sesión → a la landing
// (que pinta el login). María las edita en /farma/maria/recomendaciones.
export default async function RecomendadosPage() {
  const rol = await getRol();
  if (!rol) redirect("/farma");

  await registrarMetrica("visitas:recomendados");
  const [recomendaciones, refRaw] = await Promise.all([
    cargarRecomendaciones(),
    redis.get(KEYS.refPedidos()),
  ]);
  const ref: RefPedidos = refRaw ? JSON.parse(refRaw) : {};

  return (
    <div className="min-h-screen px-5 py-8" style={{ background: "#E8E4DC" }}>
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-3">
        <nav className="flex items-center justify-end gap-4 text-sm text-neutral-600">
          <Link href="/farma" className="hover:text-neutral-900">Prioridades</Link>
          {rol === "admin" && (
            <Link href="/farma/maria" className="hover:text-neutral-900">Volver</Link>
          )}
          <LogoutButton />
        </nav>
        <Recomendados catalogo={ref} data={recomendaciones} />
      </main>
    </div>
  );
}
