import type { Metadata } from "next";
import { Baloo_2, DM_Sans, IBM_Plex_Mono } from "next/font/google";
import Cabecera from "./Cabecera";
import "./viajes.css";

// Layout propio y aislado: /viajes no lleva el chrome del sitio (TerminalShell ni
// paleta terminal), tiene estilo propio. El root layout ya pone noindex por
// defecto; lo reforzamos aquí mientras es prototipo (plan /viajes).
export const metadata: Metadata = {
  title: "Fuera de Ruta",
  robots: { index: false, follow: false },
};

// Identidad «Río pop» (F1): tres fuentes vía next/font expuestas como variables
// CSS que consume viajes.css. Baloo 2 títulos/cifras/botones, DM Sans cuerpo,
// IBM Plex Mono micro-etiquetas.
const baloo = Baloo_2({ subsets: ["latin"], weight: ["700", "800"], variable: "--fr-font-baloo", display: "swap" });
const dmSans = DM_Sans({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--fr-font-dm", display: "swap" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--fr-font-mono", display: "swap" });

export default function ViajesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`viajes ${baloo.variable} ${dmSans.variable} ${plexMono.variable}`}>
      <Cabecera />
      {children}
    </div>
  );
}
