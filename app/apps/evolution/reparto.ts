/**
 * Cómo se lee un gen: dónde cae un valor en su escala y cómo se reparte la población en ella,
 * hoy y en toda la partida. **La escala vive aquí y no en cada sitio que la pinta**: la leyenda
 * enseña la banda de ahora y el panel la enseña en el tiempo, y con dos varas de medir el mismo
 * gen se leería en dos sitios con dos reglas distintas.
 *
 * La escala es la del propio gen, no una común: **multiplicativa alrededor del fundador** en los
 * cinco que mutan multiplicando y lineal alrededor del cero en el que lleva signo. No hay máximo
 * ni mínimo genético que enseñar —la mutación multiplica y divide sin techo—, así que lo único
 * que se puede leer es la distancia a lo que salió, y las franjas de los extremos son abiertas:
 * la de abajo dice «÷8 o menos», no «÷8».
 */

import { RASGOS, mediana, signado, type Genoma, type Mundo } from "./engine";

/**
 * La escala abarca de ÷4 a ×4 del fundador, y las dos cifras salen de medir la partida entera:
 * a mil días el gen que más se va —el `retorno`— llega a 1,3 octavas del fundador y a 1,5 en la
 * peor semilla, mientras que el cuerpo de la población (del décimo al noveno decil) mide entre
 * 0,18 y 0,32. Dos octavas a cada lado dejan sitio a lo primero sin que lo segundo sea una
 * rendija: la población ocupa un 8% de la escala, y con las tres de antes, un 5%.
 *
 * **Y son las mismas dos octavas de la leyenda**, que enseña la foto de hoy donde el panel enseña
 * la historia: con una ventana por sitio el mismo gen se leería con dos varas de medir.
 */
export const OCTAVAS = 2;
/**
 * La sociabilidad lleva signo, así que su escala es lineal y va de −1 a +1. Medido igual: a mil
 * días llega a 0,41 del cero y a 0,64 en la peor semilla, con un cuerpo de 0,16 — el mismo 8% de
 * la escala que los otros cinco, que es lo que hace que las seis bandas se puedan comparar.
 */
export const SOC = 1;

/**
 * Dónde cae un valor en la escala de su gen, en [0,1] y recortado a los extremos. Pregunta por el
 * signo y no por el gen: lo que cambia la escala es que el gen cruce el cero, no cuál sea.
 */
export function sitio(x: number, eva: number, signo: boolean): number {
  const t = signo ? 0.5 + x / (2 * SOC) : 0.5 + Math.log2(x / eva) / (2 * OCTAVAS);
  return Math.min(1, Math.max(0, t));
}

/**
 * Franjas en que se parte la escala para contar la población. Ciento veintiocho son treinta y dos
 * por octava, y con ellas el cuerpo de la población ocupa entre seis y diez: por debajo la banda
 * es un pegote que enseña igual una población partida en dos que una ancha —que es justo lo que
 * el panel está para distinguir—, y por encima cada franja cuenta un bicho o ninguno y lo que se
 * dibuja es el ruido del censo, no la forma.
 */
export const BINS = 128;

/**
 * Días guardados antes de bajar la resolución. Al llegar se tira uno de cada dos y el paso se
 * dobla, así que la historia sigue siendo la entera —nunca se pierde el principio, que es lo que
 * una ventana móvil sí pierde— y ocupa lo mismo pase lo que pase: kilobyte y medio por día, un
 * mega y medio en total. Mil son más columnas de las que cabe pintar en ninguna pantalla, y más
 * días de los que dura una partida mirada.
 */
export const MAX_DIAS = 1024;

/** El reparto de los seis genes un día: la población contada por franjas, y su mediana exacta. */
export type Dia = {
  dia: number;
  censo: number;
  /** `RASGOS.length × BINS`, por filas: cuántos bichos caen en cada franja de la escala del gen. */
  cuentas: Uint16Array;
  /** La mediana de cada gen. Va aparte porque la franja no la da con precisión suficiente para
   *  la línea fina que se pinta encima de la banda. */
  med: Float64Array;
};

/**
 * La partida entera. **Se indexa por día y no se apila**: volver diez días atrás y revivirlos
 * reescribe lo mismo —el mundo es determinista—, así que el observador no necesita saber que se
 * ha vuelto. `paso` es cada cuántos días se guarda uno: 1 hasta `MAX_DIAS`, y de ahí para arriba
 * se dobla.
 */
export type Historia = { eva: Genoma; paso: number; dias: Dia[] };

export const crearHistoria = (eva: Genoma): Historia => ({ eva, paso: 1, dias: [] });

/**
 * Guarda el reparto del día que acaba de cerrarse, crías incluidas. Se llama al amanecer, que es
 * cuando el día anterior ya está contado y el siguiente no ha empezado.
 *
 * Lo primero que hace es **cortar lo que ya no ha pasado**: si el mundo ha vuelto atrás, los días
 * guardados por delante de él dejan de existir en vez de quedarse ahí como futuro de un mundo que
 * ya no va a ocurrir. Que revivirlos escribe exactamente lo mismo lo comprueba `reparto.test.ts`.
 */
export function registrar(h: Historia, m: Mundo) {
  if (m.dia < 1) return;
  h.dias.length = Math.floor(m.dia / h.paso);
  if (m.dia % h.paso) return;

  const cuentas = new Uint16Array(RASGOS.length * BINS);
  const med = new Float64Array(RASGOS.length);
  for (let i = 0; i < RASGOS.length; i++) {
    const r = RASGOS[i], eva = h.eva[r], signo = signado(r);
    const xs: number[] = [];
    for (const b of m.bichos) {
      xs.push(b.g[r]);
      cuentas[i * BINS + Math.min(BINS - 1, Math.floor(sitio(b.g[r], eva, signo) * BINS))]++;
    }
    med[i] = mediana(xs);
  }
  h.dias[m.dia / h.paso - 1] = { dia: m.dia, censo: m.bichos.length, cuentas, med };

  if (h.dias.length >= MAX_DIAS) {
    h.dias = h.dias.filter((_, i) => i % 2 === 1);   // se queda el día par: el nuevo paso es el doble
    h.paso *= 2;
  }
}

/** Un trozo de historia comprimido a una columna de lo que se pinta. */
export type Columna = {
  desde: number; hasta: number;
  /** Censo medio de los días que junta. */
  censo: number;
  /** `RASGOS.length × BINS`: **qué fracción** de la población cae en cada franja. Es fracción y
   *  no cuenta para que una columna de censo 5 y una de 50 se puedan comparar de un vistazo. */
  densidad: Float64Array;
  /** Mediana de cada gen, promediada sobre los días que junta. */
  med: Float64Array;
};

/**
 * La historia entera en `n` columnas o menos, juntando días consecutivos. **Comprimir es sumar
 * histogramas**, que es exacto: una columna de cuatro días es la misma banda que se vería con
 * cuatro veces más ancho. La mediana no se suma —se promedia—, que es lo que se hace con una
 * serie en el tiempo cuando se baja su resolución.
 *
 * Nunca es una ventana móvil: el pasado es la historia, y una partida de trescientos días se ve
 * entera y más apretada, no recortada por el final.
 */
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
      // Cada fila se normaliza con su propia suma y no con el censo total: un mundo extinto a
      // mitad de columna dejaría filas que no suman uno y una banda que se apaga sin decirlo.
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
