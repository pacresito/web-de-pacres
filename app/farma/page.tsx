import Link from "next/link";
import { getRol } from "./auth";
import LoginForm from "./LoginForm";
import LogoutButton from "./LogoutButton";
import Prioridades from "./Prioridades";
import { cargarDescuentos } from "@/lib/farma/descuentos-store";

// Landing de /farma: sin sesión → login; con sesión → Prioridades. El admin ve
// además el acceso a su panel (/farma/maria), desde donde cuelga el resto.
export default async function FarmaPage() {
  const rol = await getRol();
  if (!rol)
    return (
      <div className="fa-admin flex items-center justify-center p-6">
        <LoginForm />
      </div>
    );

  const data = await cargarDescuentos();

  return (
    <div className="min-h-screen px-5 py-8" style={{ background: "#E8E4DC" }}>
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-3">
        <nav className="flex items-center justify-end gap-4 text-sm text-neutral-600">
          <Link href="/farma/recomendados" className="hover:text-neutral-900">Recomendados</Link>
          {rol === "admin" && (
            <Link href="/farma/maria" className="hover:text-neutral-900">Volver</Link>
          )}
          <LogoutButton />
        </nav>
        <Prioridades data={data} />
      </main>
    </div>
  );
}
