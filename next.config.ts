import type { NextConfig } from "next";

// Sin Content-Security-Policy a propósito: el sitio usa estilos inline masivos
// (cada página fija su propia paleta) + Matter.js, que exigirían 'unsafe-inline'
// o nonces. No hay login ni datos de terceros, así que una CSP añadiría
// complejidad sin beneficio real. Las cabeceras de abajo cubren lo barato.
const nextConfig: NextConfig = {
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
