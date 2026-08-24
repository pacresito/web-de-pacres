// El plural de un nombre de pila, para poder decir «el día de los Luises». Puro:
// `npx tsx lib/arbol/plural.test.ts`.
//
// La regla es la del castellano para cualquier palabra, que con los nombres propios funciona
// igual, y lo que no acierta se apunta a mano —como el santoral—: son casos de ortografía,
// no un patrón que se le escapara a la regla.

const VOCALES = "aeiouáéíóú";
const TILDES: Record<string, string> = { á: "a", é: "e", í: "i", ó: "o", ú: "u" };

/** Los que la regla no acierta. En «Cármenes» la tilde nace al alargar la palabra. */
const EXCEPCIONES: Record<string, string> = { carmen: "Cármenes" };

/** Cómo se llama a todos los que se llaman así. */
export function pluralDeNombre(nombre: string): string {
  const excepcion = EXCEPCIONES[nombre.toLowerCase()];
  if (excepcion) return excepcion;

  const ultima = nombre.slice(-1).toLowerCase();
  if (ultima in TILDES || VOCALES.includes(ultima)) return `${nombre}s`; // Pablo → Pablos, José → Josés
  if (ultima === "z") return `${nombre.slice(0, -1)}ces`; // Beatriz → Beatrices
  // Los acabados en -s solo se alargan si la fuerza cae en la última sílaba —Luis, Andrés—.
  // Los demás se quedan como están, y son «las Dolores» y «los Lucas».
  if (ultima === "s") return agudo(nombre) ? `${sinTilde(nombre)}es` : nombre;
  if (ultima === "n") return `${sinTilde(nombre)}es`; // Ramón → Ramones, Rubén → Rubenes
  return `${nombre}es`; // Miguel → Migueles, Pilar → Pilares, Raúl → Raúles
}

/** Si la fuerza de la palabra cae en la última sílaba: la lleva escrita, o no hay otra. */
function agudo(nombre: string): boolean {
  const silabas = nombre.toLowerCase().split(new RegExp(`[^${VOCALES}]+`)).filter(Boolean);
  return silabas.length === 1 || [...silabas.at(-1)!].some((vocal) => vocal in TILDES);
}

/**
 * Y sin la tilde de la última vocal, que solo se le quita a los que acaban en -n o en -s: la
 * llevaban por ser agudos acabados así, y con una sílaba más ya no lo son. La de Raúl es de
 * otra clase —parte la palabra en dos, no dice dónde carga— y por eso ahí no se toca.
 */
const sinTilde = (nombre: string): string =>
  nombre.replace(new RegExp(`[${Object.keys(TILDES).join("")}](?=[^${VOCALES}]*$)`), (vocal) => TILDES[vocal]);
