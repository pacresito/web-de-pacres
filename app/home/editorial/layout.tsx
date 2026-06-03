import { Fraunces } from "next/font/google";

// Inter y JetBrains Mono (--font-inter / --font-jetbrains-mono) ya los provee el
// layout raíz en <html>; aquí solo se añade Fraunces, propia de editorial (I 5.2).
const fraunces = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["SOFT", "WONK"],
  variable: "--font-fraunces",
  display: "swap",
});

export default function EditorialLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={fraunces.variable}
      style={{ minHeight: "100vh" }}
    >
      {children}
    </div>
  );
}
