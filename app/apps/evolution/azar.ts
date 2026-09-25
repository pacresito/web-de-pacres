// Azar determinista: solo aritmética entera de 32 bits, `+ - * /` y `sqrt`, que dan lo mismo en
// cualquier motor JS. `Math.sin/cos/exp/log` no están fijados por IEEE y partirían la semilla.

export type Azar = { s: number };

/** FNV-1a con avalancha: de palabra a entero sin signo. */
export function hashSemilla(texto: string): number {
  let h = 2166136261;
  for (const c of texto) {
    h ^= c.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 2246822507);
  h ^= h >>> 13;
  return h >>> 0;
}

export const azarCon = (semilla: string): Azar => ({ s: hashSemilla(semilla) | 0 });

/** mulberry32: uniforme en [0,1). */
export function sig(a: Azar): number {
  a.s = (a.s + 0x6d2b79f5) | 0;
  let t = a.s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Una secuencia propia, para lo que pinta y no decide nada. */
export function azarFijo(s: number): () => number {
  const a = { s: s | 0 };
  return () => sig(a);
}

/** Media 0 y desviación 0,5 (Irwin-Hall de 3): la gaussiana pediría `log` y `cos`. */
export const centrado = (a: Azar): number => sig(a) + sig(a) + sig(a) - 1.5;

/** Vector unitario uniforme, por rechazo en el cuadrado. */
export function unidad(a: Azar): [number, number] {
  for (;;) {
    const x = sig(a) * 2 - 1, y = sig(a) * 2 - 1;
    const d2 = x * x + y * y;
    if (d2 > 1e-6 && d2 <= 1) {
      const d = Math.sqrt(d2);
      return [x / d, y / d];
    }
  }
}
