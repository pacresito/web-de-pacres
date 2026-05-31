import type { MetadataRoute } from "next";

// Se permite el rastreo de todo (sin Disallow): el crawler necesita poder leer
// el <meta robots="noindex"> de cada página para no indexarla. Bloquear el rastreo
// haría lo contrario de lo que queremos (podría indexar desde enlaces externos).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: "https://pacr.es/sitemap.xml",
  };
}
