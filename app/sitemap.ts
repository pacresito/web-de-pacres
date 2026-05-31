import type { MetadataRoute } from "next";

// Solo la raíz: es la única ruta indexable.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://pacr.es",
      lastModified: new Date(),
    },
  ];
}
