import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif, IBM_Plex_Sans, IBM_Plex_Mono, JetBrains_Mono, Inter } from "next/font/google";
import "./globals.css";

// Geist / Geist Mono solo los usan páginas secundarias (original, neon, RPNcalc
// y las calcs). preload:false → no se precargan en todas las páginas (incluida
// la home y las terminal que no los usan); se cargan on-demand con swap allí
// donde sí aparecen.
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: "400",
  variable: "--font-instrument-serif",
  display: "swap",
});

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-ibm-plex-sans",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-ibm-plex-mono",
  display: "swap",
});

// Fuentes del sistema de diseño terminal (cv/lab/designs, TerminalShell, juegos…)
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "La web de Pacres",
  description: "Web personal de Pablo Crespo Velasco",
  // Por defecto, ningún buscador indexa. Solo la raíz (app/page.tsx) lo sobrescribe.
  // follow:true para que el rastreador siga enlaces internos sin indexar las páginas.
  robots: { index: false, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} ${ibmPlexSans.variable} ${ibmPlexMono.variable} ${jetbrainsMono.variable} ${inter.variable} h-full antialiased`}
    >
      <head>
        {/* Anti-FOUC: aplica el tema oscuro en <html> antes del primer pintado, leyendo
            la preferencia de localStorage. Así los tokens --t-* cascadean ya en oscuro y
            no hay destello claro al recargar. El servidor no conoce el tema (sitio estático,
            sin cookies) → suppressHydrationWarning en <html>. try/catch por si localStorage
            lanza (modo privado). Solo escribe el atributo en dark; claro es el default.
            OJO: 'pacres-theme' está duplicada con STORAGE_KEY en usePersistedTheme.ts. Este
            script corre antes que el bundle, no puede importar la constante; si cambias la
            clave, cámbiala en los dos sitios. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem('pacres-theme')==='dark')document.documentElement.dataset.theme='dark'}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}
