import type { NextConfig } from "next";

// Sin Content-Security-Policy a propósito: el sitio usa estilos inline masivos
// (cada página fija su propia paleta) + Matter.js, que exigirían 'unsafe-inline'
// o nonces. No hay login ni datos de terceros, así que una CSP añadiría
// complejidad sin beneficio real. Las cabeceras de abajo cubren lo barato.
const nextConfig: NextConfig = {
  // Next coge un lock en <distDir>/lock, así que un build con el dev server vivo
  // falla. Con NEXT_DIST_DIR el build va a su propio directorio y convive.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",

  async redirects() {
    return [
      { source: "/l", destination: "/webs/lagartijas", permanent: false },
      { source: "/a", destination: "/juegos/atlas", permanent: false },
      { source: "/c", destination: "/apps/RPNcalc", permanent: false },
      { source: "/farmacia", destination: "/farma", permanent: false },
      { source: "/f", destination: "/fuera-de-ruta", permanent: false },
      { source: "/o", destination: "/apps/observatorio", permanent: false },
      { source: "/m", destination: "/farma/maria", permanent: false },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
