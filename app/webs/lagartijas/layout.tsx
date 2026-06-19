import { Shantell_Sans, Patrick_Hand, Permanent_Marker } from "next/font/google";

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
