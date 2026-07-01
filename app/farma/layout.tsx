import type { Metadata } from "next";

// Layout propio y aislado: /farma no lleva el chrome del sitio (TerminalShell ni
// paleta verde). El root layout ya pone noindex por defecto; lo reforzamos aquí.
// Solo estructura: cada superficie pinta su fondo — la landing (Prioridades) va a
// pantalla completa con el skin UnycopWin; las pantallas de María, en maria/layout.
export const metadata: Metadata = {
  title: "Farma",
  robots: { index: false, follow: false },
};

export default function FarmaLayout({ children }: { children: React.ReactNode }) {
  return <div className="text-neutral-900">{children}</div>;
}
