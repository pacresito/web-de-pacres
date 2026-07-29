// Claves Redis de /arbol. En desarrollo llevan sufijo `-dev` (misma convención
// que farma/registro) para no pisar los datos de producción desde local.
const esDev = process.env.NODE_ENV === "development";

const arbolKey = (base: string, dev: boolean): string => (dev ? `${base}-dev` : base);

export const KEYS = {
  // Blob único con todo el árbol (personas + uniones + roots). Estático, sembrado
  // desde seed/arbol.json — no lo edita nadie desde la web.
  datos: (dev: boolean = esDev) => arbolKey("arbol:datos", dev),
};
