import { Bebas_Neue, Crimson_Pro } from "next/font/google";

const bebasNeue = Bebas_Neue({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-bebas-neue",
  display: "swap",
});

const crimsonPro = Crimson_Pro({
  subsets: ["latin"],
  weight: ["300", "400", "600"],
  style: ["normal", "italic"],
  variable: "--font-crimson-pro",
  display: "swap",
});

export default function DarkLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // next/font registra las @font-face con el nombre real ("Bebas Neue",
  // "Crimson Pro"), así que el CSS de la página que las pide por nombre literal
  // resuelve sin tocar nada. Sustituye al @import de googleapis en runtime.
  return (
    <div className={`${bebasNeue.variable} ${crimsonPro.variable}`} style={{ minHeight: "100vh" }}>
      {children}
    </div>
  );
}
