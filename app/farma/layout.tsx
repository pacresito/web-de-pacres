import type { Metadata } from "next";

// Layout propio y aislado: /farma no lleva el chrome del sitio (TerminalShell ni
// paleta verde). El root layout ya pone noindex por defecto; lo reforzamos aquí.
export const metadata: Metadata = {
  title: "Farma",
  robots: { index: false, follow: false },
};

export default function FarmaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 px-5 py-8">
      <div className="mx-auto w-full max-w-3xl">{children}</div>
    </div>
  );
}
