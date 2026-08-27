// Genera el borrador de data/atlas/orden.ts, el recorrido geográfico de Atlas. Uso puntual:
// `npx tsx scripts/build-atlas-orden.mts`. Solo lee lo ya generado (lon/lat de formas.ts), así
// que no baja nada ni tarda.
//
// El recorrido es uno solo y sirve para dos cosas: el orden de la pestaña explorar y el de
// entrada de países nuevos en la cola. Que sean el mismo es deliberado — los países entran en
// el orden en que se recorren, así que lo nuevo siempre cae al lado de lo ya visto.
//
// Dentro de cada continente va en barrido en S: de norte a sur por filas, y cada fila barre al
// contrario que la anterior. Las filas NO son bandas fijas cada n grados: una rejilla fija en
// múltiplos de 8° parte a España de Portugal por medio grado de nada. Cada fila la abre el país
// más al norte que queda y se lleva a todos los que caigan dentro de la banda desde él.
import fs from "node:fs";
import { PAISES, type Continente } from "../lib/atlas/paises";
import { FORMAS } from "../data/atlas/formas";

const SALIDA = new URL("../data/atlas/orden.ts", import.meta.url);
const BANDA = 8; // grados de latitud: lo que cabe en una fila del barrido

// De lo lejano a lo cercano: lo cercano se aprende solo. El reparto es el de Natural Earth, que
// resuelve los transcontinentales sin que haya que arbitrar nada.
const CONTINENTES: Continente[] = ["Asia", "Oceanía", "África", "América del Norte", "América del Sur", "Europa"];

// El marco del minimapa de cada continente, en [lon0, lat0, lon1, lat1]. Elegido a ojo, no
// calculado de los países: el marco tiene que ser el continente desde el primer país que se
// tenga, y con 195 tampoco mejoraría. El de Europa deja fuera Siberia a propósito —metiéndola,
// Malta es un píxel— y Rusia se sale por el este, que es justo lo que hay que entender de Rusia.
const MARCO: Record<Continente, [number, number, number, number]> = {
  "Asia":              [26, -11, 147, 78],
  // Oceanía se pasa de los 180° a propósito: Samoa, Tonga y las Line de Kiribati están al otro
  // lado del antimeridiano, y con el marco cortado ahí no salían en su propio continente. Por
  // arriba llega a 12°N porque Micronesia entera —Palau, Marshall, los Estados Federados— cae
  // por encima del ecuador, que es donde el marco terminaba.
  "Oceanía":           [110, -48, 205, 12],
  // África llega hasta Cabo Verde por el oeste y hasta Mauricio por el este: son países, no
  // adornos del océano, y fuera del marco su punto no se pintaba en ninguna parte.
  "África":            [-26, -36, 60, 38],
  "América del Norte": [-172, 7, -52, 72],
  "América del Sur":   [-82, -56, -34, 13],
  "Europa":            [-25, 34, 60, 72],
};

function barrido(ids: string[]): string[] {
  const filas: string[][] = [];
  for (const id of [...ids].sort((a, b) => FORMAS[b].lat - FORMAS[a].lat)) {
    const fila = filas.at(-1);
    if (fila && FORMAS[fila[0]].lat - FORMAS[id].lat <= BANDA) fila.push(id);
    else filas.push([id]);
  }
  return filas.flatMap((fila, i) => {
    const aleste = [...fila].sort((a, b) => FORMAS[a].lon - FORMAS[b].lon);
    return i % 2 ? aleste.reverse() : aleste;
  });
}

const grupos = CONTINENTES
  .map((continente) => ({ continente, marco: MARCO[continente], paises: barrido(PAISES.filter((p) => p.continente === continente).map((p) => p.id)) }))
  .filter((g) => g.paises.length);

// Una línea por continente si cabe, y si no partida: el fichero se edita a mano moviendo ids.
const lista = grupos.map(({ continente, marco, paises }) => {
  const ids = paises.map((id) => `"${id}"`);
  const filas: string[] = [];
  for (const id of ids) {
    if (filas.length && (filas.at(-1)! + " " + id).length <= 92) filas[filas.length - 1] += " " + id;
    else filas.push(id);
  }
  const cuerpo = filas.length === 1 ? filas[0].replaceAll(" ", ", ") : "\n    " + filas.map((f) => f.replaceAll(" ", ", ")).join(",\n    ") + ",\n  ";
  return `  { continente: "${continente}", marco: [${marco.join(", ")}], paises: [${cuerpo}] },`;
}).join("\n");

fs.writeFileSync(SALIDA, `// El recorrido geográfico de Atlas: por continente, y dentro de cada uno en barrido en S —de
// norte a sur por filas, cada fila al contrario que la anterior—. Es a la vez el orden de la
// pestaña explorar y el de entrada de países nuevos, para que lo nuevo caiga al lado de lo visto.
//
// Los continentes van de lo lejano a lo cercano: lo cercano se aprende solo.
//
// BORRADOR de scripts/build-atlas-orden.mts, hecho para RETOCARSE A MANO — la geografía de
// verdad no cabe en una regla de bandas. Volver a correr el script pisa los retoques: mirar el
// diff antes de quedárselo.
import type { Continente } from "@/lib/atlas/paises";

/** El marco del minimapa del continente: [lon0, lat0, lon1, lat1]. */
export type Marco = [number, number, number, number];

export const ORDEN: { continente: Continente; marco: Marco; paises: string[] }[] = [
${lista}
];

/** El recorrido entero, sin continentes: el orden en que entran los países nuevos. */
export const RECORRIDO = ORDEN.flatMap((g) => g.paises);
`);

for (const { continente, paises } of grupos)
  console.log(`  ${continente.padEnd(18)} ${String(paises.length).padStart(3)}  ${paises.join(" ")}`);
console.log(`\norden.ts ${(fs.statSync(SALIDA).size / 1024).toFixed(1)} KB · ${grupos.reduce((n, g) => n + g.paises.length, 0)} países`);
