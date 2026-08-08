import type { Metadata } from "next";

// Layout propio y aislado: /arbol no lleva el chrome del sitio (TerminalShell ni paleta
// verde). Su paleta y sus fuentes cuelgan de la clase `.arbol` en globals.css, y el tema
// oscuro lo hereda del interruptor del sitio sin pedirle nada al cliente.
// El root layout ya pone noindex por defecto; lo reforzamos aquí.
export const metadata: Metadata = {
  title: "Árbol genealógico",
  robots: { index: false, follow: false },
};

export default function ArbolLayout({ children }: { children: React.ReactNode }) {
  // El lienzo se come la pantalla entera: se arrastra, no se hace scroll.
  return <div className="arbol h-dvh overflow-hidden">{children}</div>;
}
