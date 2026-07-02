import Link from "next/link";
import LogoutButton from "./LogoutButton";

// Navegación de las subpáginas del panel de María (#10): Volver al panel + Salir.
// `vistaUsuario` añade el acceso a /farma (lo que ven los usuarios normales): lo usa
// Descuentos, la puerta de entrada de María (ya no hay CTA de Prioridades en el menú).
export default function SubpageNav({ vistaUsuario }: { vistaUsuario?: boolean }) {
  return (
    <nav className="flex items-center gap-4 text-sm text-neutral-600">
      <Link href="/farma/maria" className="hover:text-neutral-900">Volver</Link>
      {vistaUsuario && (
        <Link href="/farma" className="hover:text-neutral-900">Vista de usuario</Link>
      )}
      <LogoutButton />
    </nav>
  );
}
