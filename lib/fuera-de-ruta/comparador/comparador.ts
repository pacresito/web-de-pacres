// Comparador: campos lado a lado y frases condicionales («si buscas X, esta encaja
// mejor»). Nunca dice «esta es mejor»: la regla vive en las plantillas.
import type { Destino } from "../tipos";
import { enumerar, rango } from "../formato";
import { nivelesDificultad } from "../filtrar";

export type Fila = { etiqueta: string; valores: (string | null)[] };
export type Comparativa = { nombres: string[]; filas: Fila[]; frases: string[] };

const boolTxt = (b?: boolean): string | null => (b === true ? "Sí" : b === false ? "No" : null);

// null = no consta. La fila que nadie tiene no se pinta.
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
// El nivel más alto que abarca el texto: "fácil media" → media.
const dificultadOrd = (d: Destino): number | null => {
  const n = nivelesDificultad(d.dificultad).map((x) => NIVEL[x]);
  return n.length ? Math.max(...n) : null;
};
const duracionMed = (d: Destino): number | null =>
  d.duracionHoras ? (d.duracionHoras[0] + d.duracionHoras[1]) / 2 : null;

// Si hay diferencia real, una frase para cada extremo.
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

// Solo discriminan si alguno cumple y otro NO de forma explícita; "no consta" no cuenta.
const REGLAS_BOOL: { valor: (d: Destino) => boolean | undefined; frase: (n: string) => string }[] = [
  { valor: (d) => d.bano, frase: (n) => `Si te apetece poder bañarte, ${n} lo permite.` },
  { valor: (d) => d.ninos, frase: (n) => `Si viajáis con niños, ${n} es la apta.` },
  { valor: (d) => d.carrito, frase: (n) => `Si vais con carrito, ${n} es apta.` },
  { valor: (d) => d.perros, frase: (n) => `Si viajáis con perro, ${n} lo permite.` },
];

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
    if (aptos.length && algunoNo) frases.push(r.frase(enumerar(aptos)));
  }

  return { nombres, filas, frases };
}
