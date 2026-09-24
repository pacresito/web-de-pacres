/** Lo más larga que puede ser una semilla: la caja, el enlace y el dado, todos con la misma vara. */
export const MAX_SEMILLA = 20;

/**
 * Las palabras del dado, que es también lo que abre la página sin enlace. **Cada una está medida**
 * (`semillas.medir.ts`): viva a los 300 días —en las islas, **las dos**, que una isla vacía no enseña
 * lo que es la forma—, y **tres por casilla** de cinco formas por cuatro familias de mundo por tres
 * climas, para que el dado enseñe todo lo que hay. Sin tildes ni eñes. **Quedarse en uno o dos bichos
 * no descarta**: un mundo al borde que remonta es de lo que más se puede mirar.
 *
 * **La criba es del motor de hoy**: si cambia el motor, se vuelve a pasar el medidor.
 */
export const PALABRAS = [
  "abeja", "abejero", "abeto", "abrojo", "abubilla", "aguacero", "alba", "albatros", "alce", "almeja",
  "alondra", "arce", "arcilla", "ardilla", "arena", "arrecife", "arrendajo", "ascua", "aurora", "avellano",
  "avestruz", "azucena", "azufre", "ballena", "barbo", "basalto", "becada", "begonia", "bellota", "bisonte",
  "bogavante", "brasa", "brisa", "bruma", "buey", "buitre", "caballa", "caballo", "cabra", "cachalote",
  "calamar", "calima", "cangrejo", "caracola", "carbonero", "cardumen", "carpa", "carpintero", "castor", "caverna",
  "cebada", "cedro", "ceniza", "cenote", "centeno", "cerceta", "cerezo", "chispa", "chorlito", "cierva",
  "ciervo", "cigarra", "cocodrilo", "codorniz", "colirrojo", "colmena", "comadreja", "conejo", "corzo", "crecida",
  "cuarzo", "culebra", "delta", "duna", "eclipse", "erial", "erizo", "espuma", "eucalipto", "fango",
  "fruto", "gacela", "gallo", "gamo", "ganso", "glaciar", "glicina", "golondrina", "grafito", "grajo",
  "granizo", "grava", "grillo", "gusano", "helecho", "hielo", "hiena", "higo", "hipocampo", "hisopo",
  "hongo", "hormiga", "humedal", "humo", "isla", "jibia", "koala", "krill", "lagartija", "lago",
  "laguna", "lamprea", "langosta", "langostino", "larva", "lavandera", "lemur", "limonero", "lino", "liquen",
  "lobo", "lombriz", "loro", "lucero", "mangle", "marejada", "marisma", "marmota", "meandro", "medusa",
  "mirlo", "mito", "mochuelo", "mora", "morsa", "mosca", "musgo", "nabo", "niebla", "oasis",
  "oleaje", "oso", "paloma", "pantano", "papamoscas", "pera", "perdiz", "piojo", "pizarra", "plancton",
  "playa", "polen", "polilla", "pomelo", "pradera", "pulpo", "rana", "rape", "raya", "regato",
  "remanso", "resaca", "rescoldo", "riada", "rodaballo", "salina", "saltamontes", "sauce", "savia", "semilla",
  "serpiente", "soja", "somormujo", "sorgo", "tomate", "tormenta", "tortuga", "yeso", "zarcero", "zorro",
];

/** Una palabra del dado que no sea `actual`: tirar y que salga el mismo mundo parece que no ha hecho nada. */
export function tirarDado(actual: string): string {
  const otras = PALABRAS.filter((p) => p !== actual);
  return otras[Math.floor(Math.random() * otras.length)];
}
