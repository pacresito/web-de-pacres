// Las fotos de la familia: quién sale en cada una, dónde está su cara, cómo se llaman al
// descargarlas y cómo se piden. Puro: `npx tsx lib/arbol/fotos.test.ts`.
//
// **Aquí no hay ninguna URL.** Los archivos viven en una store privada de Vercel Blob —el
// repo es público y esto son caras— y solo los sirve `/arbol/api/foto`, detrás de la misma
// cookie que el resto del árbol. Filtrar este archivo no enseña una foto a nadie.
//
// Y no viven en `arbol.json` porque una foto no es un dato del documento: no venía en los
// Word, como no venía el santo. Además así subir una foto es un push, y no un resembrado de
// Redis en dev y en prod.
//
// **Una foto no es de uno: es de los que salen en ella.** El archivo se guarda una vez y cada
// uno la enseña por su recuadro, así que una foto de diez primos no son diez copias ni diez
// recortes — es la misma cara vista desde diez fichas.
//
// **Cada id lleva el nombre al lado y el test comprueba que sigue siendo quien dice ser**:
// los ids del árbol cuentan apariciones y no gente, y una foto colgada de quien no es no la
// ve venir nadie.

import { añoDe, edadEntre, type Fecha } from "./fechas";

/**
 * Qué cuadrado de la foto se enseña en el marco, **en fracciones del ancho de la foto** —los
 * dos ejes en la misma unidad, porque el recuadro es cuadrado y así no hace falta saber el
 * alto para colocarlo, ni volver a medir nada el día que se resuba la foto mejor escaneada—.
 * Sin él, el marco enseña el centro, que es lo que sale bien cuando la foto ya venía
 * recortada y mal cuando la cara no está en medio.
 */
export interface Recuadro {
  /** Su borde izquierdo, desde el de la foto. */
  x: number;
  /** Su borde superior, desde el de la foto. */
  y: number;
  /** Su lado. 1 es el ancho entero. */
  lado: number;
}

/** Uno de los que salen en una foto, y dónde está su cara. */
export interface Aparicion {
  id: string;
  /** Su nombre, para poder leer esta lista. Manda el id; el test vigila que concuerden. */
  nombre: string;
  /** Qué trozo se enseña en su ficha, si no vale el centro. */
  recuadro?: Recuadro;
}

export interface Foto {
  /**
   * Cómo se llama la foto **cuando no es de uno solo**: «La Venta de La Paloma». Una foto de
   * diez no puede llamarse por su dueño porque no lo tiene, así que se la llama por donde se
   * hizo, que es como la nombra la familia. De aquí salen su clave y el nombre con el que se
   * descarga: **cambiarlo es cambiar la clave, y obliga a resubir el archivo**.
   */
  titulo?: string;
  /**
   * Cuándo se tomó, con la precisión que se sepa: `"1975"`, `"1975-08"` o la fecha entera.
   * **Es el único dato que se apunta**: la edad de la foto se calcula, porque dos datos que
   * dicen lo mismo acaban contradiciéndose. Con solo el año la cuenta puede fallar por uno,
   * y por eso se escribe el mes cuando se sabe.
   */
  tomada: Fecha;
  /** Quiénes salen. El primero es el dueño de la clave cuando la foto no tiene título. */
  gente: Aparicion[];
}

export const FOTOS: Foto[] = [
  { tomada: "2012", gente: [{ id: "p25", nombre: "Pablo" }] },
  {
    tomada: "2026-08",
    gente: [{ id: "p125", nombre: "Lola", recuadro: { x: 100 / 1067, y: 300 / 1067, lado: 900 / 1067 } }],
  },
  {
    titulo: "La Venta de La Paloma",
    tomada: "1962",
    // Los recuadros salen de medir sobre el escaneo de 1184 px de ancho; en fracciones, así
    // que un escaneo mejor de la misma copia los hereda sin volver a medir.
    gente: [
      { id: "p271", nombre: "Pepe", recuadro: r(352, 393, 195) },
      { id: "p528", nombre: "Paca", recuadro: r(580, 433, 175) },
      { id: "p427", nombre: "Flora", recuadro: r(725, 228, 150) },
      { id: "p125", nombre: "Lola", recuadro: r(621, 275, 175) },
      { id: "p413", nombre: "Flora", recuadro: r(812, 281, 175) },
      { id: "p418", nombre: "Pepe", recuadro: r(368, 618, 175) },
      { id: "p286", nombre: "Marijose", recuadro: r(462, 400, 160) },
      { id: "p388", nombre: "Paco", recuadro: r(163, 380, 160) },
      { id: "p435", nombre: "Félix", recuadro: r(737, 440, 160) },
      { id: "p429", nombre: "Juan José", recuadro: r(543, 706, 130) },
    ],
  },
];

/** Un recuadro medido en píxeles del escaneo, que es como se mira una foto con una regla. */
function r(x: number, y: number, lado: number, ancho = 1184): Recuadro {
  return { x: x / ancho, y: y / ancho, lado: lado / ancho };
}

/**
 * Cómo se pide una foto y cómo se llama su archivo en el blob. **Sale de la foto, no de quien
 * la mira**: del título si lo tiene y, si no, de su único dueño y el año, que es lo que
 * evita un tercer dato a mano. El test vigila que no se repita, que es lo único que la
 * derivación no puede garantizar sola.
 */
export const claveDeFoto = (f: Foto): string =>
  `${f.titulo ? sinAcentos(f.titulo) : f.gente[0].id}-${añoDe(f.tomada)}`;

/** Un título hecho clave: minúsculas, sin acentos y con guiones, porque viaja en una URL. */
const sinAcentos = (t: string): string =>
  t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export const rutaEnBlob = (clave: string): string => `arbol/${clave}.jpg`;

/** Si esa clave es de una foto que existe. La puerta no sirve lo que esta lista no conoce. */
export const hayFoto = (clave: string): boolean => FOTOS.some((f) => claveDeFoto(f) === clave);

/** La foto de esa clave, para quien tenga que rotular a los que salen en ella. */
export const fotoDe = (clave: string): Foto | undefined => FOTOS.find((f) => claveDeFoto(f) === clave);

/** Las tres medidas con las que el marco coloca la foto, en porcentaje del propio marco. */
export interface Encuadre {
  width: string;
  left: string;
  top: string;
}

/**
 * Del recuadro al CSS. La foto se estira hasta que su recuadro mide lo que el marco y se
 * desplaza hasta que empieza donde él: **el marco no recorta con `object-fit`**, que solo
 * sabe encajar la foto entera y no un trozo elegido de ella.
 */
export function encuadreDe(r?: Recuadro): Encuadre | undefined {
  if (!r) return undefined;
  const porciento = (v: number) => `${+((v / r.lado) * 100).toFixed(3)}%`;
  return { width: porciento(1), left: porciento(-r.x), top: porciento(-r.y) };
}

/** Una foto ya resuelta para pintarla: la ficha no calcula nada, solo la escribe. */
export interface FotoEnFicha {
  clave: string;
  /** Cómo se lee el link: «con 20 años». */
  rotulo: string;
  /** Cómo se coloca dentro del marco, ya en CSS; sin recuadro, el marco la centra él. */
  encuadre?: Encuadre;
  /** Cuántos salen. Con más de uno, abrirla entera es reconocer a los demás. */
  cuantos: number;
  /** De dónde se pide, con el nombre de la descarga en el último tramo. */
  url: string;
}

/**
 * Las suyas, de la más joven a la más vieja: la ficha las lista en el orden en que se vivieron
 * y así pasar de una a otra es verla envejecer.
 */
export function fotosDe(id: string, quien: { nombreCompleto: string; birth?: Fecha }): FotoEnFicha[] {
  return FOTOS.filter((f) => f.gente.some((g) => g.id === id))
    .sort((a, b) => a.tomada.localeCompare(b.tomada))
    .map((f) => ({
      clave: claveDeFoto(f),
      rotulo: rotuloDeFoto(f, quien.birth),
      encuadre: encuadreDe(f.gente.find((g) => g.id === id)!.recuadro),
      cuantos: f.gente.length,
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
 *
 * **La de varios se llama por la foto y no por quien la descarga**: se la baja uno desde su
 * ficha, pero lo que se lleva es la familia entera, y en el carrete eso no es «Lola».
 */
export function nombreDeArchivo(f: Foto, quien: { nombreCompleto: string; birth?: Fecha }): string {
  if (f.titulo) return `${f.titulo}, ${añoDe(f.tomada)}.jpg`;
  // La barra es el único carácter que rompería el tramo de la URL, y en un apellido con
  // barra —no lo hay, pero el nombre lo escribe una persona— partiría la ruta en dos.
  const nombre = quien.nombreCompleto.replace(/\//g, "-");
  const tomada = `tomada en ${añoDe(f.tomada)}`;
  if (!quien.birth) return `${nombre} - Foto ${tomada}.jpg`;
  return `${nombre} (${añoDe(quien.birth)}) - Foto ${rotuloDeFoto(f, quien.birth)} (${tomada}).jpg`;
}
