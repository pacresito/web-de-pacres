// Las fotos de la familia: quién tiene cuáles, cómo se llaman al descargarlas y cómo se
// piden. Puro: `npx tsx lib/arbol/fotos.test.ts`.
//
// **Aquí no hay ninguna URL.** Los archivos viven en una store privada de Vercel Blob —el
// repo es público y esto son caras— y solo los sirve `/arbol/api/foto`, detrás de la misma
// cookie que el resto del árbol. Filtrar este archivo no enseña una foto a nadie.
//
// Y no viven en `arbol.json` porque una foto no es un dato del documento: no venía en los
// Word, como no venía el santo. Además así subir una foto es un push, y no un resembrado de
// Redis en dev y en prod.
//
// **Cada id lleva el nombre al lado y el test comprueba que sigue siendo quien dice ser**:
// los ids del árbol cuentan apariciones y no gente, y una foto colgada de quien no es no la
// ve venir nadie.

import { añoDe, edadEntre, type Fecha } from "./fechas";

export interface Foto {
  /** De quién es. Una foto tiene un dueño: las de grupo no se reparten entre fichas. */
  id: string;
  /** Su nombre, para poder leer esta lista. Manda el id; el test vigila que concuerden. */
  nombre: string;
  /**
   * Cuándo se tomó, con la precisión que se sepa: `"1975"`, `"1975-08"` o la fecha entera.
   * **Es el único dato que se apunta**: la edad de la foto se calcula, porque dos datos que
   * dicen lo mismo acaban contradiciéndose. Con solo el año la cuenta puede fallar por uno,
   * y por eso se escribe el mes cuando se sabe.
   */
  tomada: Fecha;
}

export const FOTOS: Foto[] = [
  { id: "p25", nombre: "Pablo", tomada: "2012" },
];

/**
 * Cómo se pide una foto y cómo se llama su archivo en el blob. **Sale del dueño y del año**,
 * así que no hay un tercer dato que mantener a mano; el test vigila que no se repita, que es
 * lo único que la derivación no puede garantizar sola.
 */
export const claveDeFoto = (f: Foto): string => `${f.id}-${añoDe(f.tomada)}`;

export const rutaEnBlob = (clave: string): string => `arbol/${clave}.jpg`;

/** Si esa clave es de una foto que existe. La puerta no sirve lo que esta lista no conoce. */
export const hayFoto = (clave: string): boolean => FOTOS.some((f) => claveDeFoto(f) === clave);

/** Una foto ya resuelta para pintarla: la ficha no calcula nada, solo la escribe. */
export interface FotoEnFicha {
  clave: string;
  /** Cómo se lee el link: «con 20 años». */
  rotulo: string;
  /** De dónde se pide, con el nombre de la descarga en el último tramo. */
  url: string;
}

/**
 * Las suyas, de la más joven a la más vieja: la ficha las lista en el orden en que se vivieron
 * y así pasar de una a otra es verla envejecer.
 */
export function fotosDe(id: string, quien: { nombreCompleto: string; birth?: Fecha }): FotoEnFicha[] {
  return FOTOS.filter((f) => f.id === id)
    .sort((a, b) => a.tomada.localeCompare(b.tomada))
    .map((f) => ({
      clave: claveDeFoto(f),
      rotulo: rotuloDeFoto(f, quien.birth),
      url: `/arbol/api/foto/${claveDeFoto(f)}/${encodeURIComponent(nombreDeArchivo(f, quien))}`,
    }));
}

/**
 * Cómo se lee el link. **La edad se cuenta, no se teclea**, y los dos bordes se dicen como se
 * dicen: nadie llama «con 0 años» a una foto de bebé, y a quien no le consta el nacimiento no
 * hay edad que restarle, así que su foto se sitúa por el año.
 */
export function rotuloDeFoto(f: Foto, birth?: Fecha): string {
  if (!birth) return `en ${añoDe(f.tomada)}`;
  const edad = edadEntre(birth, f.tomada);
  if (edad === 0) return "de bebé";
  return `con ${edad} ${edad === 1 ? "año" : "años"}`;
}

/**
 * El nombre con el que se guarda al descargarla, y por eso lleva el nombre entero y los dos
 * años: una foto suelta en la carpeta de descargas tiene que decir de quién es sin que haya
 * que abrirla. **Va en la propia URL** y no solo en la cabecera, que es lo único que respetan
 * por igual el «guardar imagen» del móvil y el clic derecho del escritorio.
 */
export function nombreDeArchivo(f: Foto, quien: { nombreCompleto: string; birth?: Fecha }): string {
  // La barra es el único carácter que rompería el tramo de la URL, y en un apellido con
  // barra —no lo hay, pero el nombre lo escribe una persona— partiría la ruta en dos.
  const nombre = quien.nombreCompleto.replace(/\//g, "-");
  const tomada = `tomada en ${añoDe(f.tomada)}`;
  if (!quien.birth) return `${nombre} - Foto ${tomada}.jpg`;
  return `${nombre} (${añoDe(quien.birth)}) - Foto ${rotuloDeFoto(f, quien.birth)} (${tomada}).jpg`;
}
