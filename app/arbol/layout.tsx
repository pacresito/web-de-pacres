import type { Metadata } from "next";

// Layout propio y aislado: /arbol no lleva el chrome del sitio (TerminalShell ni
// paleta verde). El root layout ya pone noindex por defecto; lo reforzamos aquí.
export const metadata: Metadata = {
  title: "Árbol genealógico",
  robots: { index: false, follow: false },
};

export default function ArbolLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-[#fafaf7] text-neutral-900">{children}</div>;
}
