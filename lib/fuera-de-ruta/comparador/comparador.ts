// Comparador Inteligente (Fase F, §4.8): ayuda a elegir entre 2+ actividades similares
// enseñando sus campos lado a lado. NUNCA dice «esta es mejor» —esa es la regla del
// briefing—: las frases son condicionales por plantilla («si buscas X, esta encaja
// mejor»), y la restricción vive en la plantilla por construcción, no en un juicio que
// se pueda colar. Puro; los datos son los de la Fase A. Test al lado.
import type { Destino } from "../tipos";
import { rango } from "../formato";
import { nivelesDificultad } from "../filtrar";

export type Fila = { etiqueta: string; valores: (string | null)[] };
export type Comparativa = { nombres: string[]; filas: Fila[]; frases: string[] };

const boolTxt = (b?: boolean): string | null => (b === true ? "Sí" : b === false ? "No" : null);

// Una fila por campo de §4.8. El valor de cada destino se formatea o queda null si no
// consta (dato ausente = "no consta", nunca "no"); una fila que nadie tiene no se pinta.
const CAMPOS: { etiqueta: string; valor: (d: Destino) => string | null }[] = [
  { etiqueta: "Distancia", valor: (d) => (d.distanciaKm ? rango(d.distanciaKm, "km") : null) },
  { etiqueta: "Duración", valor: (d) => d.duracion ?? (d.duracionHoras ? rango(d.duracionHoras, "h") : null) },
  { etiqueta: "Desnivel", valor: (d) => (d.desnivelM ? rango(d.desnivelM, "m") : null) },
  { etiqueta: "Dificultad", valor: (d) => d.dificultad ?? null },
  { etiqueta: "Terreno", valor: (d) => d.terreno ?? null },
  { etiqueta: "Recorrido", valor: (d) => d.recorrido ?? null },
  { etiqueta: "Niños", valor: (d) => boolTxt(d.ninos) },
  { etiqueta: "Carrito", valor: (d) => boolTxt(d.carrito) },
  { etiqueta: "Perros", valor: (d) => boolTxt(d.perros) },
  { etiqueta: "Baño", valor: (d) => boolTxt(d.bano) },
  { etiqueta: "Mejor época", valor: (d) => d.mejorEpoca ?? null },
  { etiqueta: "Mejor momento", valor: (d) => d.mejorMomento ?? null },
  { etiqueta: "Señalización", valor: (d) => d.senalizacion ?? null },
];

const NIVEL: Record<string, number> = { "fácil": 1, media: 2, "difícil": 3 };
// Ordinal de dificultad para comparar: el nivel más alto que el texto abarca ("fácil
// media" → media). Null si no consta.
const dificultadOrd = (d: Destino): number | null => {
  const n = nivelesDificultad(d.dificultad).map((x) => NIVEL[x]);
  return n.length ? Math.max(...n) : null;
};
const duracionMed = (d: Destino): number | null =>
  d.duracionHoras ? (d.duracionHoras[0] + d.duracionHoras[1]) / 2 : null;

// Reglas numéricas: si hay diferencia real (min ≠ max entre los que traen el dato), una
// frase apunta al extremo bajo («menos») y otra al alto («más»). Ambas condicionales:
// nombran a quién encaja según una preferencia, nunca decretan un ganador.
const REGLAS_NUM: {
  valor: (d: Destino) => number | null;
  menos: (n: string) => string;
  mas: (n: string) => string;
}[] = [
  {
    valor: duracionMed,
    menos: (n) => `Si prefieres algo más corto y tranquilo, ${n} encaja mejor.`,
    mas: (n) => `Si te apetece caminar más rato, ${n} encaja mejor.`,
  },
  {
    valor: dificultadOrd,
    menos: (n) => `Si buscas algo más sencillo, ${n} encaja mejor.`,
    mas: (n) => `Si te apetece más desafío, ${n} encaja mejor.`,
  },
];

// Reglas booleanas: solo discriminan cuando alguno cumple y otro NO lo cumple de forma
// explícita (los "no consta" no cuentan, no inventamos). La frase nombra al/los que sí.
const REGLAS_BOOL: { valor: (d: Destino) => boolean | undefined; frase: (n: string) => string }[] = [
  { valor: (d) => d.bano, frase: (n) => `Si te apetece poder bañarte, ${n} lo permite.` },
  { valor: (d) => d.ninos, frase: (n) => `Si viajáis con niños, ${n} es la apta.` },
  { valor: (d) => d.carrito, frase: (n) => `Si vais con carrito, ${n} es apta.` },
  { valor: (d) => d.perros, frase: (n) => `Si viajáis con perro, ${n} lo permite.` },
];

const juntar = (nombres: string[]): string =>
  nombres.length <= 1 ? nombres[0] ?? "" : `${nombres.slice(0, -1).join(", ")} y ${nombres.at(-1)}`;

export function comparar(destinos: Destino[]): Comparativa {
  const nombres = destinos.map((d) => d.nombre);
  if (destinos.length < 2) return { nombres, filas: [], frases: [] };

  const filas = CAMPOS.map((c) => ({ etiqueta: c.etiqueta, valores: destinos.map(c.valor) }))
    .filter((f) => f.valores.some((v) => v !== null));

  const frases: string[] = [];
  for (const r of REGLAS_NUM) {
    const vals = destinos.map(r.valor);
    const presentes = vals.filter((v): v is number => v !== null);
    if (presentes.length < 2 || Math.min(...presentes) === Math.max(...presentes)) continue;
    const iMin = vals.indexOf(Math.min(...presentes));
    const iMax = vals.indexOf(Math.max(...presentes));
    frases.push(r.menos(nombres[iMin]));
    frases.push(r.mas(nombres[iMax]));
  }
  for (const r of REGLAS_BOOL) {
    const vals = destinos.map(r.valor);
    const aptos = destinos.filter((_, i) => vals[i] === true).map((d) => d.nombre);
    const algunoNo = vals.some((v) => v === false);
    if (aptos.length && algunoNo) frases.push(r.frase(juntar(aptos)));
  }

  return { nombres, filas, frases };
}
