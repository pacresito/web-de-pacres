// Claves Redis de /arbol. El sufijo `-dev` y su porqué viven en `lib/keys.ts`.
import { clave } from "../keys";

export const KEYS = {
  // Blob único con todo el árbol (personas + uniones + roots). Estático, sembrado
  // desde seed/arbol.json — no lo edita nadie desde la web.
  datos: (dev?: boolean) => clave("arbol:datos", dev),
};
