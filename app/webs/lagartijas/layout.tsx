import type { Metadata } from "next";
import { Shantell_Sans, Patrick_Hand, Permanent_Marker } from "next/font/google";

// Única ruta indexable además de la raíz: sobrescribe el noindex global del layout.
export const metadata: Metadata = {
  title: "Las lagartijas de Lucas · hechas a mano en La Manga",
  description:
    "Lagartijas de cuentas hechas a mano, una a una, por Lucas en La Manga. Elige el color y qué le pongo en la cola; ninguna es igual a otra.",
  robots: { index: true, follow: true },
  alternates: { canonical: "https://pacr.es/webs/lagartijas" },
  openGraph: {
    title: "Las lagartijas de Lucas · hechas a mano en La Manga",
    description: "Lagartijas de cuentas hechas a mano, una a una, en La Manga. Ninguna es igual a otra.",
    url: "https://pacr.es/webs/lagartijas",
    type: "website",
    locale: "es_ES",
    images: ["https://pacr.es/lagartijas/rosa-sapo.jpg"],
  },
};

// Las tres fuentes de Google son propias de esta web (un cuaderno de cole), no las
// usa nada más. Se cargan aquí, scoped a la ruta, no en el layout raíz.
const shantellSans = Shantell_Sans({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-shantell-sans",
  display: "swap",
});

const patrickHand = Patrick_Hand({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-patrick-hand",
  display: "swap",
});

const permanentMarker = Permanent_Marker({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-permanent-marker",
  display: "swap",
});

export default function LagartijasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${shantellSans.variable} ${patrickHand.variable} ${permanentMarker.variable}`}>
      {children}
    </div>
  );
}
