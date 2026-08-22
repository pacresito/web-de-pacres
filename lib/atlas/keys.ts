// Claves Redis de Atlas. En desarrollo llevan sufijo `-dev` (misma convención que farma, árbol
// y registro) para no pisar el mazo de producción desde local.
//
// Un script suelto (`npx tsx`) NO es `development`: sin NODE_ENV el sufijo no se aplica y una
// escritura de diagnóstico va a parar al mazo de verdad. Pasar el flag a mano.
const esDev = process.env.NODE_ENV === "development";

export const KEYS = {
  /** El mazo entero, un solo blob. Lo escribe la ruta de sincronía y nadie más. */
  mazo: (dev: boolean = esDev) => (dev ? "atlas:mazo-dev" : "atlas:mazo"),
};
