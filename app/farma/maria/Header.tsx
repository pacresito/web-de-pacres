"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "../LogoutButton";

// Cabecera común del panel de María (sticky). A la izquierda la marca y el saludo
// (oculto en móvil). A la derecha, navegación contextual según la ruta: en el panel
// principal, los enlaces a las subpáginas; en una subpágina, "Volver" al panel (más
// "Vista de usuario" solo en Descuentos, la puerta de entrada de María).
export default function Header() {
  const pathname = usePathname();
  const enPanel = pathname === "/farma/maria";
  // Cada subpágina de edición enlaza a su vista de usuario (la puerta de entrada de María).
  const vistaUsuario =
    pathname === "/farma/maria/descuentos" ? "/farma"
    : pathname === "/farma/maria/recomendaciones" ? "/farma/recomendados"
    : null;

  return (
    <div className="fa-header">
      <div className="mx-auto flex h-14 max-w-[1360px] items-center justify-between gap-3 px-4">
        <div className="flex flex-none items-center gap-3">
          <span className="text-base font-semibold">¡Hola María!</span>
        </div>
        <div className="flex items-center gap-0.5 overflow-x-auto">
          {enPanel ? (
            <>
              <Link href="/farma/maria/descuentos" className="fa-nav-item">Descuentos</Link>
              <Link href="/farma/maria/recomendaciones" className="fa-nav-item">Recomendaciones</Link>
              <Link href="/farma/maria/inventario" className="fa-nav-item">Inventario</Link>
              <Link href="/farma/maria/pvp" className="fa-nav-item">PVP</Link>
            </>
          ) : (
            <>
              {vistaUsuario && <Link href={vistaUsuario} className="fa-nav-item">Vista de usuario</Link>}
              <Link href="/farma/maria" className="fa-nav-item">Volver</Link>
            </>
          )}
          <LogoutButton className="fa-btn fa-btn-outline ml-1.5 flex-none whitespace-nowrap px-3.5 py-[7px] text-[13px]" />
        </div>
      </div>
    </div>
  );
}
