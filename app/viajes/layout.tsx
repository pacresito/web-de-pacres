import type { Metadata } from "next";
import "./viajes.css";

// Layout propio y aislado: /viajes no lleva el chrome del sitio (TerminalShell ni
// paleta terminal), tiene estilo propio. El root layout ya pone noindex por
// defecto; lo reforzamos aquí mientras es prototipo (plan /viajes).
export const metadata: Metadata = {
  title: "Fuera de Ruta",
  robots: { index: false, follow: false },
};

export default function ViajesLayout({ children }: { children: React.ReactNode }) {
  return <div className="viajes">{children}</div>;
}
