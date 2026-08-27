// Claves Redis de Atlas. El sufijo `-dev` y su porqué viven en `lib/keys.ts`.
import { clave } from "../keys";

export const KEYS = {
  /** El mazo entero, un solo blob. Lo escribe la ruta de sincronía y nadie más. */
  mazo: (dev?: boolean) => clave("atlas:mazo", dev),
};
