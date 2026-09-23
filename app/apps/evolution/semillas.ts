/** Lo más larga que puede ser una semilla: la caja, el enlace y el dado, todos con la misma vara. */
export const MAX_SEMILLA = 20;

/** Las palabras del dado: paisaje, materia y bichos, que es de lo que está hecho el mundo. */
export const PALABRAS = [
  "alba", "arrecife", "bruma", "cardumen", "ciénaga", "coral", "delta", "duna", "escarcha", "espuma",
  "estuario", "fango", "fiordo", "glaciar", "granizo", "helecho", "humedal", "isla", "lago", "laguna",
  "liquen", "manglar", "musgo", "niebla", "oasis", "oleaje", "páramo", "pantano", "playa", "pradera",
  "remanso", "resaca", "rocío", "salina", "sabana", "selva", "sequía", "tundra", "turbera", "volcán",
  "ámbar", "arcilla", "basalto", "cuarzo", "grafito", "obsidiana", "pizarra", "sílex", "yeso", "azufre",
  "bellota", "semilla", "espora", "polen", "raíz", "savia", "corteza", "hongo", "trufa", "cáscara",
  "colmena", "hormiga", "larva", "crisálida", "oruga", "renacuajo", "medusa", "pulpo", "erizo", "nautilo",
  "anémona", "plancton", "krill", "caracola", "almeja", "cangrejo", "tortuga", "salamandra", "tritón", "lamprea",
  "aurora", "eclipse", "cometa", "órbita", "marejada", "tormenta", "relámpago", "monzón", "brisa", "ventisca",
  "ceniza", "brasa", "ascua", "chispa", "humo", "rescoldo", "deshielo", "crecida", "riada", "estiaje",
];

/** Una palabra del dado que no sea `actual`: tirar y que salga el mismo mundo parece que no ha hecho nada. */
export function tirarDado(actual: string): string {
  const otras = PALABRAS.filter((p) => p !== actual);
  return otras[Math.floor(Math.random() * otras.length)];
}
