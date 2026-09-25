// El reparto de la población en la escala de cada gen, día a día: lo que pinta el panel de
// estratos. Usa la misma `posGen` que la tira y la leyenda, para que el pasado se lea con la vara
// del presente.

import { RASGOS, mediana, type Mundo } from "./engine";
import { posGen } from "./designs";

/** Franjas de la escala: menos es un pegote, más es el ruido del censo. */
export const BINS = 128;

/** Días guardados antes de tirar uno de cada dos y doblar el paso: nunca se pierde el principio. */
export const MAX_DIAS = 1024;

export type Dia = {
  dia: number;
  censo: number;
  /** `RASGOS.length × BINS`, por filas. */
  cuentas: Uint16Array;
  /** La mediana exacta de cada gen. */
  med: Float64Array;
};

/** La partida entera, indexada por día: revivir un día reescribe lo mismo. `paso` es cada cuántos se guarda. */
export type Historia = { paso: number; dias: Dia[] };

export const crearHistoria = (): Historia => ({ paso: 1, dias: [] });

/** Guarda el día que acaba de cerrarse. Corta antes lo que el mundo ha dejado atrás al volver. */
export function registrar(h: Historia, m: Mundo) {
  if (m.dia < 1) return;
  h.dias.length = Math.floor(m.dia / h.paso);
  if (m.dia % h.paso) return;

  const cuentas = new Uint16Array(RASGOS.length * BINS);
  const med = new Float64Array(RASGOS.length);
  for (let i = 0; i < RASGOS.length; i++) {
    const r = RASGOS[i];
    const xs: number[] = [];
    for (const b of m.bichos) {
      xs.push(b.g[r]);
      cuentas[i * BINS + Math.min(BINS - 1, Math.floor(posGen(r, b.g[r]) * BINS))]++;
    }
    med[i] = mediana(xs);
  }
  h.dias[m.dia / h.paso - 1] = { dia: m.dia, censo: m.bichos.length, cuentas, med };

  if (h.dias.length >= MAX_DIAS) {
    h.dias = h.dias.filter((_, i) => i % 2 === 1);   // se queda el día par: el nuevo paso es el doble
    h.paso *= 2;
  }
}

/** Un trozo de historia comprimido a una columna. */
export type Columna = {
  desde: number; hasta: number;
  censo: number;
  /** Fracción de la población en cada franja, por gen. */
  densidad: Float64Array;
  /** Mediana promediada de cada gen. */
  med: Float64Array;
};

/** La historia entera en `n` columnas como mucho, sumando histogramas de días consecutivos. */
export function columnas(h: Historia, n: number): Columna[] {
  const d = h.dias.filter(Boolean);
  if (d.length === 0 || n < 1) return [];
  const ancho = Math.ceil(d.length / n);
  const out: Columna[] = [];
  for (let k = 0; k < d.length; k += ancho) {
    const trozo = d.slice(k, k + ancho);
    const densidad = new Float64Array(RASGOS.length * BINS);
    const med = new Float64Array(RASGOS.length);
    let censo = 0;
    for (const dia of trozo) {
      censo += dia.censo;
      for (let i = 0; i < RASGOS.length; i++) med[i] += dia.med[i];
      for (let j = 0; j < densidad.length; j++) densidad[j] += dia.cuentas[j];
    }
    for (let i = 0; i < RASGOS.length; i++) {
      med[i] /= trozo.length;
      // Cada fila con su propia suma: un mundo extinto a mitad de columna no suma el censo.
      let suma = 0;
      for (let j = 0; j < BINS; j++) suma += densidad[i * BINS + j];
      if (suma > 0) for (let j = 0; j < BINS; j++) densidad[i * BINS + j] /= suma;
    }
    out.push({
      desde: trozo[0].dia, hasta: trozo[trozo.length - 1].dia,
      censo: censo / trozo.length, densidad, med,
    });
  }
  return out;
}
