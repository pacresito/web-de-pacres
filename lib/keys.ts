// La regla de nombres de Redis, escrita una vez: en desarrollo las claves llevan `-dev` para no
// pisar los datos de producción desde local. Vivía copiada en once sitios —cada `keys.ts` y cada
// ruta con su propio ternario sobre `NODE_ENV`—, y once copias de una regla son once sitios
// donde un día dice otra cosa.
//
// **Un script suelto (`npx tsx`) no es `development`:** sin `NODE_ENV` el default apunta a
// PRODUCCIÓN y una escritura de diagnóstico pisa los datos de verdad. Por eso todo esto acepta
// el flag: la app deja el default y los `seed-*.ts` lo pasan a mano.
//
// Y el nombre que sale de aquí es un dato guardado, no un identificador: cambiarlo no falla,
// deja sus datos huérfanos en Redis sin que nada lo diga. Renombrar es renombrar y migrar.

const esDev = (): boolean => process.env.NODE_ENV === "development";

/** La clave de un dato: `atlas:mazo` → `atlas:mazo-dev` en desarrollo. */
export const clave = (base: string, dev: boolean = esDev()): string => (dev ? `${base}-dev` : base);

/**
 * El prefijo de una familia cuya clave acaba en un dato variable (la IP, en el rate limit):
 * `arbol:login` → `arbol:login-dev:<ip>`. Aquí la marca va en la parte fija y no al final,
 * que al final rompería el barrido por prefijo — lo único que hace legible una familia así.
 */
export const prefijo = (base: string, dev: boolean = esDev()): string => `${clave(base, dev)}:`;
