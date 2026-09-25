import type { Metadata } from "next";
import { Baloo_2, DM_Sans, IBM_Plex_Mono } from "next/font/google";
import Cabecera from "./Cabecera";
import "./fuera-de-ruta.css";

// Sin el chrome del sitio: Fuera de Ruta tiene su propio estilo. Prototipo: ni indexa ni sigue enlaces.
export const metadata: Metadata = {
  title: "Fuera de Ruta",
  robots: { index: false, follow: false },
};

// Baloo 2 para títulos, cifras y botones; DM Sans para el cuerpo; Plex Mono para micro-etiquetas.
const baloo = Baloo_2({ subsets: ["latin"], weight: ["700", "800"], variable: "--fr-font-baloo", display: "swap" });
const dmSans = DM_Sans({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--fr-font-dm", display: "swap" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--fr-font-mono", display: "swap" });

export default function FueraDeRutaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`fuera-de-ruta ${baloo.variable} ${dmSans.variable} ${plexMono.variable}`}>
      <Cabecera />
      {children}
    </div>
  );
}
