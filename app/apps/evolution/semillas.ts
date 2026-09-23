/** Lo más larga que puede ser una semilla: la caja, el enlace y el dado, todos con la misma vara. */
export const MAX_SEMILLA = 20;

/**
 * Las palabras del dado, que es también lo que abre la página sin enlace. **Cada una está medida**
 * (`semillas.medir.ts`): viva a los 300 días, y repartidas a partes iguales entre las cuatro
 * familias de mundo y los tres climas, para que el dado enseñe todo lo que hay. Sin tildes ni
 * eñes. **Quedarse en uno o dos bichos no descarta**: un mundo al borde que remonta es de lo que
 * más se puede mirar.
 *
 * **La criba es del motor de hoy**: si cambia el motor, se vuelve a pasar el medidor.
 */
export const PALABRAS = [
  "abrojo", "aguacero", "alba", "almeja", "alondra", "arcilla", "arena", "arrecife", "ascua", "aurora",
  "azufre", "basalto", "bellota", "brasa", "brisa", "bruma", "caldera", "calima", "cangrejo", "caracola",
  "cardumen", "castor", "caverna", "cedro", "ceniza", "cenote", "charca", "chispa", "colmena", "cometa",
  "crecida", "cuarzo", "cumbre", "delta", "deshielo", "duna", "eclipse", "erial", "erizo", "escarabajo",
  "escarcha", "espuma", "fango", "fiordo", "fuente", "gamo", "glaciar", "glicina", "grafito", "granizo",
  "grava", "hiedra", "hielo", "hongo", "hormiga", "humedal", "humo", "isla", "krill", "lago",
  "laguna", "lamprea", "larva", "liquen", "llovizna", "lucero", "manantial", "marejada", "marisma", "meandro",
  "medusa", "musgo", "niebla", "oasis", "oleaje", "pantano", "pizarra", "plancton", "playa", "polen",
  "pradera", "pulpo", "regato", "remanso", "resaca", "rescoldo", "riada", "sabana", "salina", "sauce",
  "savia", "semilla", "sendero", "tormenta", "tortuga", "trufa", "tundra", "turbera", "yeso", "zorzal",
];

/** Una palabra del dado que no sea `actual`: tirar y que salga el mismo mundo parece que no ha hecho nada. */
export function tirarDado(actual: string): string {
  const otras = PALABRAS.filter((p) => p !== actual);
  return otras[Math.floor(Math.random() * otras.length)];
}
