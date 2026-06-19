import type { MetadataRoute } from "next";

// Las dos únicas rutas indexables: la raíz y las lagartijas de Lucas.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://pacr.es",
      lastModified: new Date(),
    },
    {
      url: "https://pacr.es/webs/lagartijas",
      lastModified: new Date(),
    },
  ];
}
