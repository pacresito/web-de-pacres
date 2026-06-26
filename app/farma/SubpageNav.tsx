import Link from "next/link";
import LogoutButton from "./LogoutButton";

// Navegación de las subpáginas del panel de María (#10): Volver al panel + Salir.
// Sustituye los links contextuales sueltos que tenía antes cada subpágina.
export default function SubpageNav() {
  return (
    <nav className="flex items-center gap-4 text-sm text-neutral-600">
      <Link href="/farma/maria" className="hover:text-neutral-900">Volver</Link>
      <LogoutButton />
    </nav>
  );
}
