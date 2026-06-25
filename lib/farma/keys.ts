// Claves Redis de /farma. En desarrollo llevan sufijo `-dev` (misma convención que
// el resto del sitio) para no pisar los datos de producción desde local.
// La app deja el default (lo decide NODE_ENV); el seed pasa `dev` explícito.
const esDev = process.env.NODE_ENV === "development";

const farmaKey = (base: string, dev: boolean): string => (dev ? `${base}-dev` : base);

export const KEYS = {
  refPrioridades: (dev: boolean = esDev) => farmaKey("farma:ref:prioridades", dev),
};
