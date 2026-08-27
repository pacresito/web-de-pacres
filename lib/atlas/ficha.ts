// Las dos cuentas de texto de la ficha de explorar: cuánto encoge un nombre para caber y cómo se
// escribe una superficie. Las dos tienen que dar lo mismo en el server y en el navegador.
//
// Lógica pura: se verifica con `npx tsx lib/atlas/ficha.test.ts`.

// Los caracteres que caben en una línea del nombre a tamaño entero. La fuente es mono y la
// columna mide lo mismo en móvil y a lo ancho, así que sale una cuenta y no una medición: medir
// el DOM daría un número que el HTML del server no tiene.
const CARACTERES = 15;

/** Las escalas que se prueban, de mayor a menor; la última es el suelo. */
const ESCALAS = [1, 0.85, 0.75, 0.68, 0.55];

/**
 * Cuánto encoge el nombre para caber en dos líneas. La ficha reserva dos siempre —así no se
 * mueve nada al pasar de España a Bosnia y Herzegovina— y de los 195 solo la República
 * Democrática del Congo pide una tercera: encogerla es preferible a bajar todo lo que va debajo.
 */
export function escalaDelNombre(nombre: string): number {
  const palabras = nombre.split(" ");
  return ESCALAS.find((escala) => {
    const ancho = Math.floor(CARACTERES / escala);
    let lineas = 1, largo = 0;
    for (const palabra of palabras) {
      if (!largo) largo = palabra.length;
      else if (largo + 1 + palabra.length <= ancho) largo += 1 + palabra.length;
      else { lineas++; largo = palabra.length; }
    }
    return lineas <= 2;
  }) ?? ESCALAS[ESCALAS.length - 1];
}

/**
 * Una superficie en km², con el punto de los miles. Los dos decimales son para Tuvalu y Mónaco,
 * que por debajo de 10 km² se quedarían en un número redondo que no dice nada.
 *
 * Sin `toLocaleString`: el ICU del server y el del navegador no tienen por qué coincidir, y un
 * número distinto en cada lado es un desajuste de hidratación, que sale como un error ilegible.
 */
export function km2(n: number): string {
  const [entera, decimal] = n.toFixed(n < 10 ? 2 : 0).split(".");
  return entera.replace(/\B(?=(\d{3})+$)/g, ".") + (decimal ? `,${decimal}` : "");
}
