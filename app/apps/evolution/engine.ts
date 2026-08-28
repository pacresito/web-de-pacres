// Motor de evolution: bichos que comen, crecen, se reproducen y mutan en un mundo de energía
// cerrada. Lógica pura, sin React ni canvas — render.ts lo pinta y page.tsx lo conecta.
//
// Tres promesas que el resto del archivo cumple línea a línea:
//
// 1. **Determinismo.** PRNG propio con semilla, paso de tiempo fijo (nunca delta de tiempo real)
//    y orden de actualización explícito. En el tick no entra una sola trigonométrica:
//    `Math.sin/cos/exp/pow/cbrt` no están fijados por IEEE y un bit de diferencia entre
//    navegadores parte la promesa de la semilla compartida sin que falle nada. Los rumbos son
//    vectores unitarios girados por multiplicación, las distancias se comparan al cuadrado, y
//    solo se usan `+ - * /` y `sqrt`, que sí son exactos por norma.
// 2. **Ningún coeficiente inventado.** Un acoplamiento entra solo si sale de una magnitud que ya
//    se está contando: masa, energía, geometría. La fuerza de un músculo va con su sección
//    —masa^(2/3), o sea radio²—, así que fuerza = empuje·radio² y **velocidad = empuje/radio**;
//    el giro es inverso a la masa, el hijo cuesta su masa, te ven a distancia proporcional a tu
//    radio (tamaño angular) y comer cuesta tiempo proporcional a lo comido. Un coeficiente elegido a mano es una perilla que se
//    acaba moviendo hasta que la simulación hace algo bonito, y entonces el resultado es mío.
// 3. **Las estrategias malas no se arreglan aquí.** Un bicho que se queda tonto no es un bug, es
//    un perdedor, y borrarlo es trabajo de la selección. Solo se arregla la indefinición
//    numérica: vector suma exactamente cero significa mantener el rumbo, nunca un ángulo
//    indefinido que propague NaN en silencio.
//
// Y la regla que decide si un gen está bien modelado: **ninguno puede ser mejor cuanto más alto
// en todo su rango.** Uno sin óptimo interior se clava en el tope en tres generaciones y la
// gráfica se queda quieta pareciendo que funciona.
//
// Las cifras de las constantes salen de `costes.medir.ts`, no de la intuición.

// ─── Azar determinista ────────────────────────────────────────────────────────

export type Azar = { s: number };

/** FNV-1a con avalancha: una palabra ("hola") entra como semilla y sale como entero. */
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

/** mulberry32: uniforme en [0,1). Solo aritmética entera de 32 bits, idéntica en todo motor JS. */
export function sig(a: Azar): number {
  a.s = (a.s + 0x6d2b79f5) | 0;
  let t = a.s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/**
 * Ruido centrado, media 0 y desviación 0.5 (Irwin-Hall de 3). Sustituye a la gaussiana porque
 * Box-Muller pide `log` y `cos`, y ninguno de los dos está fijado por IEEE.
 */
const centrado = (a: Azar): number => sig(a) + sig(a) + sig(a) - 1.5;

/** Vector unitario uniforme, por rechazo en el cuadrado: sin ángulos, sin trigonometría. */
function unidad(a: Azar): [number, number] {
  for (;;) {
    const x = sig(a) * 2 - 1, y = sig(a) * 2 - 1;
    const d2 = x * x + y * y;
    if (d2 > 1e-6 && d2 <= 1) {
      const d = Math.sqrt(d2);
      return [x / d, y / d];
    }
  }
}

// ─── Genoma ───────────────────────────────────────────────────────────────────

// Los ocho genes. Nombres ASCII sin mutilar tildes: `talla` es el tamaño adulto, `fiereza` la
// agresión y `aguante` la reparación que frena la senescencia.
export const RASGOS = [
  "empuje", "talla", "vision", "sociabilidad", "audacia", "fiereza", "umbral", "aguante",
] as const;
export type Rasgo = (typeof RASGOS)[number];
export type Genoma = Record<Rasgo, number>;

/**
 * Los que llevan signo mutan **aditivo**; el resto, **multiplicativo** (log-normal aproximada).
 * La mutación aditiva sobre un gen acotado en 0 produce el sesgo de recorte que el test de deriva
 * está para cazar, así que solo la usa el gen que de verdad puede ser negativo.
 */
const CON_SIGNO: Rasgo[] = ["sociabilidad"];

/** Qué paga y qué cobra cada gen. Es la fuente de la tabla de reglas de la app (paso 8). */
export const TABLA: Record<Rasgo, { paga: string; cobra: string }> = {
  empuje: { paga: "coste ∝ empuje² · radio (= fuerza × velocidad)", cobra: "velocidad = empuje / radio actual" },
  talla: { paga: "coste ∝ masa; giras peor; te ven desde más lejos; tus hijos cuestan más", cobra: "reserva ∝ masa; derecho a comerte a otro" },
  vision: { paga: "coste ∝ visión²", cobra: "detectas a distancia ∝ radio del otro" },
  sociabilidad: { paga: "competencia", cobra: "peso al centro de masa de los visibles, con signo" },
  audacia: { paga: "comida no comida", cobra: "peso de repulsión al mayor visible" },
  fiereza: { paga: "riesgo", cobra: "peso de atracción al menor visible" },
  umbral: { paga: "oportunidad", cobra: "a cuánta reserva te divides" },
  aguante: { paga: "metabolismo basal extra", cobra: "frena la senescencia" },
};

// ─── Constantes del mundo ─────────────────────────────────────────────────────

/** Exponentes admitidos: los que salen con `*` y `sqrt` exactos. `Math.pow` no está fijado. */
export type Exponente = 0.75 | 1 | 1.5 | 2 | 2.5 | 3;

function pot(x: number, e: Exponente): number {
  switch (e) {
    case 0.75: return Math.sqrt(x * Math.sqrt(x));
    case 1: return x;
    case 1.5: return x * Math.sqrt(x);
    case 2: return x * x;
    case 2.5: return x * x * Math.sqrt(x);
    case 3: return x * x * x;
  }
}

/** masa = radio³. Vale igual para un bicho y para un bocado: no hay dos leyes de materia. */
export const masaDe = (radio: number): number => radio * radio * radio;

export const RADIO_COMIDA = 3;
/** Un bocado es un cuerpo de radio 2, así que su energía es su masa. */
export const E_COMIDA = masaDe(RADIO_COMIDA);
export const RADIO_CRIA = 2;

export const CELDA = 64;          // lado de celda de la rejilla espacial y del suelo
export const CAP_RESERVA = 0.5;   // capacidad de reserva = CAP_RESERVA · masa
export const C_BASAL = 4e-4;    // metabolismo basal por unidad de masa y tick
export const C_EMPUJE = 2.5e-3;    // coste de moverse: masa · C_EMPUJE · v²
export const C_VISION = 7e-7;   // coste de ver: masa · C_VISION · visión²
export const C_SENESCENCIA = 4e-8; // riesgo de morir de viejo por tick: C · edad² / (1 + aguante)
export const GIRO = 24;           // tangente del giro máximo por tick = GIRO / masa
export const MASTICAR = 0.5;      // ticks inmóvil = MASTICAR · masa de lo comido
export const EFICIENCIA = 0.6;    // de la masa de la presa; el resto va al suelo
export const BOCA = 0.6;         // te comes a quien quepa: radio del otro ≤ BOCA · tu radio
export const BORDE = 4;           // repulsión del muro: fija y no genética, nadie evoluciona a atravesarlo
export const MARGEN = 48;         // a qué distancia del muro empieza a empujar
/**
 * Ticks de mundo sin bichos antes de soltarlos. Sin esto la partida empieza sin un solo bocado en
 * el suelo y las primeras generaciones se mueren buscando lo que aún no ha brotado: la mitad de
 * las semillas se extinguía por cómo arranca el mundo, no por cómo son sus bichos.
 */
export const CALENTAR = 600;

// ─── De dónde salen estas cifras ──────────────────────────────────────────────
//
// Todas de `costes.medir.ts`, y **se vuelven a sacar cada vez que se mueva una**:
//
// · **boca 0,6** (sección `mundo`): es la rodilla. Con 0,5 la depredación causa el 13-15% de las
//   muertes y con 0,7 el 32-38%, lo mismo que con 0,6 — así que es la boca más pequeña que
//   enciende el mecanismo. Por debajo de 0,45 no se come nadie a nadie, y media mitad del modelo
//   (fiereza, audacia, persecución) no la nota ningún genoma.
// · **expMasa 1 y expVision 2** (sección `exponentes`): son los que dice la geometría —coste ∝
//   masa, coste de ver ∝ área—, y medir confirma que son además los viables: con expMasa 1,5 se
//   extinguen las cinco semillas, y con 0,75 el empuje no deja de subir (+9% a mitad de partida,
//   +17% al final, sin señal de asentarse).
// · **tasa 0,08** (sección `mutacion`): la varianza de la talla se ve en la generación 9 y el
//   rango intercuartílico se queda en el 22% de la mediana. Con 0,03 tarda 25 generaciones —media
//   hora de mirar—; con 0,2 se ve en 5, pero un 41% de dispersión ya no deja ver hacia dónde va nada.
// · **senescencia 4e-8**: deja la vejez en el 19% de las muertes. Con 9e-9 es el 11% y el aguante
//   no lo selecciona nadie; con 5e-7 sube al 43%, pero tres de cada cinco mundos se extinguen.
// · **fundador** (secciones `fundador` y `regla1`): la talla vuelve a 4,1-5,2 salga de 3, 4 o 5, y
//   cualquier talla lejos de ahí extingue el mundo; el empuje baja de 6 a 4,5 y sube de 0,6 a 0,9;
//   la visión baja de 66 a 38 y sube de 6,6 a 8,5. El fundador está puesto en ese centro para que
//   la partida no se gaste en el transitorio de llegar hasta él.
//
// · **cien semillas** (sección `cien`): 67 de 100 siguen vivas en la generación 100, y las 33 que
//   se extinguen llegan antes a la generación 82 de mediana — son partidas que acaban, no mundos
//   que nacen muertos. Van a 245 ticks por generación y censo mediano 46.
//
// Y lo que el medidor dice que **no** está bien: el `aguante` es el gen más flojo del modelo —de 8
// se queda en 4,8 en cincuenta generaciones—, así que su banda del panel se abrirá más por deriva
// que por selección. Está medido y no arreglado: subir la vejez hasta que muerda extingue mundos.

export type Config = {
  ancho: number;
  alto: number;
  /** Presupuesto cerrado: toda la energía del mundo, repartida al empezar entre suelo y bichos. */
  energia: number;
  censoInicial: number;
  /** Parches vivos a la vez y su radio: juntos son "abundante y repartida" o "escasa en parches". */
  parches: number;
  radioParche: number;
  reservaParche: number;
  /** Probabilidad por tick de que un parche suelte un bocado. Es la perilla de clima. */
  brote: number;
  /** Ticks que aguanta un bocado antes de pudrirse y volver al suelo. Cierra el ciclo. */
  vidaComida: number;
  caza: boolean;
  /**
   * Riesgo de morir de viejo por tick: `senescencia · edad² / (1 + aguante)`. En 0 no se muere de
   * vejez —y entonces el aguante no compra nada, así que deja de ser un gen y pasa a ser ruido en
   * el panel—. Es un número y no un interruptor porque cuánto pesa la vejez es lo que decide si
   * el aguante está seleccionado.
   */
  senescencia: number;
  /** Radio del otro que te cabe en la boca, en fracción del tuyo. El umbral de la depredación. */
  boca: number;
  /** Ticks inmóvil por unidad de masa comida. Es lo que pone techo a la cosecha de cada bicho. */
  masticar: number;
  hambre: boolean;
  /**
   * Modo laboratorio del test de deriva: reserva siempre llena, sin muerte —tampoco de vejez, que
   * el riesgo de morir viejo depende del aguante y eso ya sería selección—, replicación por edad
   * y censo fijo por sorteo neutral. **Rompe el presupuesto cerrado a propósito**: la comida sale
   * de la nada, que es justo lo que hace falta para ver mutar sin que nada seleccione.
   */
  neutral: number;
  expMasa: Exponente;
  expVision: Exponente;
  /** Mutación: `tasa` es multiplicativa (genes positivos), `paso` aditiva (genes con signo). */
  tasa: number;
  paso: number;
  fundador: Genoma;
};

/** Fundador viable medido en `costes.medir.ts`; la semilla lo jitterea antes de clonarlo. */
export const FUNDADOR: Genoma = {
  empuje: 2, talla: 4.5, vision: 22, sociabilidad: 0, audacia: 1, fiereza: 1, umbral: 0.8, aguante: 1,
};

export const CONFIG: Config = {
  ancho: 900, alto: 640,
  energia: 42000,
  censoInicial: 24,
  parches: 20, radioParche: 46, reservaParche: 900,
  brote: 0.15, vidaComida: 260,
  caza: true, senescencia: C_SENESCENCIA, boca: BOCA, masticar: MASTICAR, hambre: true, neutral: 0,
  expMasa: 1, expVision: 2,
  tasa: 0.08, paso: 0.06,
  fundador: FUNDADOR,
};

// ─── Estado ───────────────────────────────────────────────────────────────────

export type Bicho = {
  id: number;
  idMadre: number;
  /** Número de generación: la fundadora es 0. Va desde el primer commit — añadirlo luego es tocar el motor entero. */
  gen: number;
  x: number; y: number;
  /**
   * Rumbo, siempre unitario. Girarlo es multiplicar por un vector de giro, nunca sumar ángulos.
   * La velocidad no es estado: sale de `empuje / radio` en cada tick, así que no hay inercia de
   * traslación — solo de giro, que es la que hace que ver tarde tenga consecuencias.
   */
  hx: number; hy: number;
  radio: number;
  masa: number;
  reserva: number;
  edad: number;
  mastica: number;
  hijos: number;
  vivo: boolean;
  g: Genoma;
};

/** Un bocado y el tick en el que se pudre. Sin caducidad, la comida que nadie come es un almacén
 * del que no sale nada: el mundo mete su energía ahí, el suelo se queda sin con qué abrir parches
 * y la partida se muere de estreñimiento con el campo alfombrado de comida. */
export type Bocado = { x: number; y: number; hasta: number };
export type Parche = { x: number; y: number; r: number; reserva: number };

export type Mundo = {
  cfg: Config;
  azar: Azar;
  t: number;
  bichos: Bicho[];
  comida: Bocado[];
  parches: Parche[];
  /** Energía del suelo por celda. Ahí vuelve todo lo que se gasta y todo lo que muere. */
  suelo: Float64Array;
  cols: number;
  filas: number;
  siguienteId: number;
  extinto: boolean;
  /** El genoma fundador de esta partida, ya jittereado por la semilla. Todos descienden de él. */
  eva: Genoma;
  /** Generación más alta alcanzada por alguien vivo. */
  gen: number;
  /** Quién mata y cuánto se nace. Es lo que el narrador cuenta y lo que el medidor mira. */
  cuenta: { nacidos: number; hambre: number; viejos: number; comidos: number };
  /** Rejillas y marcas reutilizadas cada tick. Estado de trabajo, no del mundo. */
  rejB: Rejilla;
  rejC: Rejilla;
  comidos: boolean[];
};

const celdaDe = (m: Mundo, x: number, y: number): number => {
  const cx = Math.min(m.cols - 1, Math.max(0, Math.floor(x / CELDA)));
  const cy = Math.min(m.filas - 1, Math.max(0, Math.floor(y / CELDA)));
  return cy * m.cols + cx;
};

/** Devuelve energía al suelo del sitio exacto: el cadáver fertiliza donde cayó. */
const alSuelo = (m: Mundo, x: number, y: number, e: number) => { m.suelo[celdaDe(m, x, y)] += e; };

export function crearMundo(semilla: string, cfg: Partial<Config> = {}): Mundo {
  const c: Config = { ...CONFIG, ...cfg };
  const azar = azarCon(semilla);
  const cols = Math.max(1, Math.ceil(c.ancho / CELDA));
  const filas = Math.max(1, Math.ceil(c.alto / CELDA));
  const m: Mundo = {
    cfg: c, azar, t: 0, bichos: [], comida: [], parches: [],
    suelo: new Float64Array(cols * filas), cols, filas,
    siguienteId: 1, eva: { ...c.fundador }, extinto: false, gen: 0,
    cuenta: { nacidos: 0, hambre: 0, viejos: 0, comidos: 0 },
    rejB: rejillaVacia(cols * filas), rejC: rejillaVacia(cols * filas), comidos: [],
  };

  // La semilla jitterea al fundador: define el mundo *y* quién lo empezó. La población de
  // partida son clones de ese genoma, para ver divergir lo que empezó idéntico.
  const eva = m.eva;
  for (const r of RASGOS) {
    eva[r] = CON_SIGNO.includes(r)
      ? eva[r] + centrado(azar) * c.paso * 2
      : eva[r] * (1 + centrado(azar) * 0.12);
  }

  let repartida = 0;
  for (let i = 0; i < c.censoInicial; i++) {
    const b = nacer(m, { ...eva }, -1, 0, sig(azar) * c.ancho, sig(azar) * c.alto);
    // Los fundadores arrancan adultos y con la despensa casi llena: si empezaran de crías, la
    // partida se decidiría antes de que nadie se reproduzca una sola vez.
    b.radio = b.g.talla;
    b.masa = masaDe(b.radio);
    b.reserva = b.masa * CAP_RESERVA * 0.9;
    repartida += b.masa + b.reserva;
  }
  // Todo lo que no está en un cuerpo empieza en el suelo, repartido por igual.
  const porCelda = Math.max(0, c.energia - repartida) / (cols * filas);
  m.suelo.fill(porCelda);
  for (let i = 0; i < CALENTAR; i++) brotar(m); // el mundo existe antes que sus bichos
  return m;
}

function nacer(m: Mundo, g: Genoma, idMadre: number, gen: number, x: number, y: number): Bicho {
  const [hx, hy] = unidad(m.azar);
  const b: Bicho = {
    id: m.siguienteId++, idMadre, gen,
    x, y, hx, hy,
    radio: RADIO_CRIA, masa: masaDe(RADIO_CRIA), reserva: 0,
    edad: 0, mastica: 0, hijos: 0, vivo: true, g,
  };
  m.bichos.push(b);
  if (gen > m.gen) m.gen = gen;
  return b;
}

// ─── Rejilla espacial ─────────────────────────────────────────────────────────

// Visión y depredación son cuadráticas: a 64 ticks por fotograma, sin rejilla son millones de
// pares por segundo.
type Rejilla = number[][];

const rejillaVacia = (n: number): Rejilla => Array.from({ length: n }, () => []);

/**
 * Rellena una rejilla ya reservada. Se reutiliza tick a tick en vez de crearla: a x64 son 3.840
 * rejillas por segundo, y construirlas de cero se lleva más tiempo que consultarlas.
 */
function rejilla(m: Mundo, rej: Rejilla, pts: { x: number; y: number }[]): Rejilla {
  for (let i = 0; i < rej.length; i++) rej[i].length = 0;
  for (let i = 0; i < pts.length; i++) rej[celdaDe(m, pts[i].x, pts[i].y)].push(i);
  return rej;
}

// ─── Comida: parches que nacen, emiten y se agotan ────────────────────────────

function brotar(m: Mundo) {
  const c = m.cfg;
  while (m.parches.length < c.parches) {
    // Sorteo de celda ponderado por suelo: donde hubo una matanza hay energía, y donde hay
    // energía brota comida. La memoria espacial del mundo sale de aquí sin programar nada más.
    let total = 0;
    for (let i = 0; i < m.suelo.length; i++) total += m.suelo[i];
    if (total < E_COMIDA) break;
    let r = sig(m.azar) * total, celda = m.suelo.length - 1;
    for (let i = 0; i < m.suelo.length; i++) {
      r -= m.suelo[i];
      if (r <= 0) { celda = i; break; }
    }
    // El parche bebe de su celda y de las ocho vecinas: la energía de los cadáveres queda
    // repartida en celdas pequeñas, y exigiendo que una sola llegue a un bocado los parches
    // dejaban de nacer para siempre con el suelo aún lleno.
    const cx = celda % m.cols, cy = Math.floor(celda / m.cols);
    let drenado = 0;
    for (let y = Math.max(0, cy - 1); y <= Math.min(m.filas - 1, cy + 1); y++) {
      for (let x = Math.max(0, cx - 1); x <= Math.min(m.cols - 1, cx + 1); x++) {
        const i = y * m.cols + x;
        const bebe = Math.min(c.reservaParche - drenado, m.suelo[i]);
        m.suelo[i] -= bebe;
        drenado += bebe;
      }
    }
    if (drenado < E_COMIDA) { m.suelo[celda] += drenado; break; }
    m.parches.push({
      x: cx * CELDA + sig(m.azar) * CELDA,
      y: cy * CELDA + sig(m.azar) * CELDA,
      r: c.radioParche,
      reserva: drenado,
    });
  }

  for (const p of m.parches) {
    if (p.reserva < E_COMIDA || sig(m.azar) >= c.brote) continue;
    p.reserva -= E_COMIDA;
    const [ux, uy] = unidad(m.azar);
    const d = Math.sqrt(sig(m.azar)) * p.r; // sqrt para que salga uniforme en el disco
    m.comida.push({
      x: Math.min(c.ancho, Math.max(0, p.x + ux * d)),
      y: Math.min(c.alto, Math.max(0, p.y + uy * d)),
      hasta: m.t + c.vidaComida * (0.5 + sig(m.azar)),
    });
  }

  // Lo que nadie se comió se pudre donde estaba y fertiliza ese sitio.
  for (let i = m.comida.length - 1; i >= 0; i--) {
    if (m.comida[i].hasta > m.t) continue;
    alSuelo(m, m.comida[i].x, m.comida[i].y, E_COMIDA);
    m.comida.splice(i, 1);
  }

  for (let i = m.parches.length - 1; i >= 0; i--) {
    const p = m.parches[i];
    if (p.reserva >= E_COMIDA) continue;
    alSuelo(m, p.x, p.y, p.reserva); // las migajas vuelven al suelo, no se evaporan
    m.parches.splice(i, 1);
  }
}

// ─── Percepción y rumbo ───────────────────────────────────────────────────────

/**
 * Cinco entradas —comida, mayor, menor, centro de masa de los visibles y borde—, cada una por su
 * peso, y el bicho empuja hacia la suma. No hay arbitraje que programar: "veo comida y un
 * depredador" se resuelve solo y distinto según el genoma. Una pila de `if` pondría techo a la
 * sorpresa, porque todo lo que pudiera pasar lo habría enumerado yo.
 *
 * Mayor y menor pesan por **contraste de masas** `(m₁−m₂)/(m₁+m₂)`, no por masa absoluta: lo que
 * amenaza no es que algo sea grande, es que lo sea comparado contigo. Y acotado en [0,1], que si
 * no la razón de masas aplasta a las otras cuatro entradas y los genes de decisión dejan de competir.
 */
function decidir(m: Mundo, b: Bicho, rb: Rejilla, rc: Rejilla, radioMax: number) {
  const g = b.g;
  let sx = 0, sy = 0;

  // 1. La comida visible más cercana. Se detecta a distancia ∝ su radio: tamaño angular.
  const alcanceC = g.vision * RADIO_COMIDA;
  let d2c = alcanceC * alcanceC, cx = 0, cy = 0, hayComida = false;
  recorrer(m, rc, b.x, b.y, alcanceC, (i) => {
    const c = m.comida[i];
    const dx = c.x - b.x, dy = c.y - b.y, d2 = dx * dx + dy * dy;
    if (d2 < d2c && d2 > 1e-9) { d2c = d2; cx = dx; cy = dy; hayComida = true; }
  });
  if (hayComida) {
    const d = Math.sqrt(d2c);
    sx += cx / d; sy += cy / d;
  }

  // 2. Los bichos visibles: el mayor, el menor y el centro de masa.
  const alcanceB = g.vision * radioMax;
  let mMayor = 0, xMayor = 0, yMayor = 0, mMenor = Infinity, xMenor = 0, yMenor = 0;
  let sumM = 0, sumX = 0, sumY = 0;
  recorrer(m, rb, b.x, b.y, alcanceB, (i) => {
    const o = m.bichos[i];
    if (o === b || !o.vivo) return;
    const dx = o.x - b.x, dy = o.y - b.y, d2 = dx * dx + dy * dy;
    const alcance = g.vision * o.radio;
    if (d2 > alcance * alcance) return;
    sumM += o.masa; sumX += o.masa * dx; sumY += o.masa * dy;
    if (o.masa > mMayor) { mMayor = o.masa; xMayor = dx; yMayor = dy; }
    if (o.masa < mMenor) { mMenor = o.masa; xMenor = dx; yMenor = dy; }
  });

  if (mMayor > b.masa) {
    const d = Math.sqrt(xMayor * xMayor + yMayor * yMayor);
    if (d > 1e-6) {
      const w = g.audacia * ((mMayor - b.masa) / (mMayor + b.masa));
      sx -= (xMayor / d) * w; sy -= (yMayor / d) * w;
    }
  }
  if (mMenor < b.masa) {
    const d = Math.sqrt(xMenor * xMenor + yMenor * yMenor);
    if (d > 1e-6) {
      const w = g.fiereza * ((b.masa - mMenor) / (b.masa + mMenor));
      sx += (xMenor / d) * w; sy += (yMenor / d) * w;
    }
  }
  if (sumM > 0) {
    const dx = sumX / sumM, dy = sumY / sumM;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d > 1e-6) { sx += (dx / d) * g.sociabilidad; sy += (dy / d) * g.sociabilidad; }
  }

  // 3. El muro empuja hacia dentro. Fijo y no genético.
  if (b.x < MARGEN) sx += BORDE * (1 - b.x / MARGEN);
  if (b.y < MARGEN) sy += BORDE * (1 - b.y / MARGEN);
  const dx1 = m.cfg.ancho - b.x, dy1 = m.cfg.alto - b.y;
  if (dx1 < MARGEN) sx -= BORDE * (1 - dx1 / MARGEN);
  if (dy1 < MARGEN) sy -= BORDE * (1 - dy1 / MARGEN);

  // Vector nulo = mantener el rumbo. Es indefinición numérica, no una estrategia mala: sin esto
  // el ángulo no existe y el NaN se propaga en silencio.
  const n2 = sx * sx + sy * sy;
  if (n2 < 1e-12) return;
  const n = Math.sqrt(n2);
  girar(b, sx / n, sy / n);
}

/**
 * Gira el rumbo hacia `(dx,dy)` sin pasarse del máximo del tick, que es inverso a la masa: los
 * grandes maniobran mal. El giro se aplica multiplicando por el vector `(c,s)` —una rotación
 * compleja—, así que no hace falta ni un ángulo ni una trigonométrica.
 */
function girar(b: Bicho, dx: number, dy: number) {
  const t = GIRO / b.masa;                  // tangente del giro máximo
  const c = 1 / Math.sqrt(1 + t * t), s = t * c;
  const cos = b.hx * dx + b.hy * dy;
  if (cos >= c) { b.hx = dx; b.hy = dy; return; } // cabe en un tick: apunta y listo
  const signo = b.hx * dy - b.hy * dx >= 0 ? 1 : -1;
  const nx = b.hx * c - b.hy * s * signo;
  const ny = b.hx * s * signo + b.hy * c;
  const n = Math.sqrt(nx * nx + ny * ny);   // renormaliza: el error se acumularía en miles de ticks
  b.hx = nx / n; b.hy = ny / n;
}

/** Recorre los índices de `rej` que caen en las celdas alcanzables a `radio` de `(x,y)`. */
function recorrer(m: Mundo, rej: Rejilla, x: number, y: number, radio: number, f: (i: number) => void) {
  const cx0 = Math.max(0, Math.floor((x - radio) / CELDA)), cx1 = Math.min(m.cols - 1, Math.floor((x + radio) / CELDA));
  const cy0 = Math.max(0, Math.floor((y - radio) / CELDA)), cy1 = Math.min(m.filas - 1, Math.floor((y + radio) / CELDA));
  for (let cy = cy0; cy <= cy1; cy++) {
    for (let cx = cx0; cx <= cx1; cx++) {
      const celda = rej[cy * m.cols + cx];
      for (let k = 0; k < celda.length; k++) f(celda[k]);
    }
  }
}

// ─── Choques: comer y empujarse ───────────────────────────────────────────────

function comer(m: Mundo, dep: Bicho, presa: Bicho) {
  const total = presa.masa + presa.reserva;
  const tomado = total * EFICIENCIA;
  guardar(m, dep, tomado);
  alSuelo(m, presa.x, presa.y, total - tomado); // la pérdida trófica no se evapora: cae al suelo
  dep.mastica += m.cfg.masticar * presa.masa;         // mientras mastica ni se mueve ni escapa
  presa.vivo = false;
  m.cuenta.comidos++;
}

/**
 * Raíz cúbica por Newton desde el radio de ahora: `Math.cbrt` no está fijado por IEEE y el radio
 * entra en todas las relaciones físicas, así que un bit de diferencia partiría la semilla.
 */
function raizCubica(masa: number, desde: number): number {
  let r = desde > 0 ? desde : 1;
  for (let i = 0; i < 8; i++) r = (2 * r + masa / (r * r)) / 3;
  return r;
}

/**
 * Mete energía en la reserva, y **lo que no cabe se hace cuerpo**: crecer no es una tasa elegida,
 * es el destino de lo que sobra, y el gen solo fija hasta dónde. Lo que ya no cabe ni en el cuerpo
 * cae al suelo. La despensa va con la masa, así que grande aguanta más sin comer.
 */
function guardar(m: Mundo, b: Bicho, e: number) {
  const cap = b.masa * CAP_RESERVA;
  const hueco = cap - b.reserva;
  if (e <= hueco) { b.reserva += e; return; }
  b.reserva = cap;
  let sobra = e - Math.max(0, hueco);
  const techo = masaDe(b.g.talla);
  if (b.masa < techo) {
    if (b.masa + sobra >= techo) {
      // Al llegar al techo el radio se clava en la talla exacta, no en lo que devuelva Newton:
      // ser adulto es una comparación que decide si te reproduces, y no puede depender del
      // último bit de una raíz.
      sobra -= techo - b.masa;
      b.masa = techo; b.radio = b.g.talla;
    } else {
      const r = raizCubica(b.masa + sobra, b.radio);
      const real = masaDe(r);        // la masa que de verdad tiene ese radio, no la pedida
      sobra -= real - b.masa;        // se paga la construida: así el balance cierra al último bit
      b.masa = real; b.radio = r;
    }
  }
  if (sobra !== 0) alSuelo(m, b.x, b.y, sobra);
}

function choques(m: Mundo, rb: Rejilla, rc: Rejilla, comidos: boolean[], radioMax: number) {
  for (const b of m.bichos) {
    if (!b.vivo || b.mastica > 0) continue;
    // Comer del suelo.
    recorrer(m, rc, b.x, b.y, b.radio + RADIO_COMIDA, (i) => {
      if (comidos[i] || b.mastica > 0) return;
      const c = m.comida[i];
      const dx = c.x - b.x, dy = c.y - b.y, r = b.radio + RADIO_COMIDA;
      if (dx * dx + dy * dy > r * r) return;
      comidos[i] = true;
      guardar(m, b, E_COMIDA);
      b.mastica += m.cfg.masticar * E_COMIDA;
    });
  }

  // Pares: cada uno una vez. Cuerpos sólidos — se empujan sin rebote ni rotación, y cede menos
  // el de más masa. Con cuerpo, el tamaño ocupa sitio y aglomerarse cuesta.
  for (let i = 0; i < m.bichos.length; i++) {
    const a = m.bichos[i];
    if (!a.vivo) continue;
    recorrer(m, rb, a.x, a.y, a.radio + radioMax, (j) => {
      if (j <= i) return;
      const b = m.bichos[j];
      if (!a.vivo || !b.vivo) return;
      const dx = b.x - a.x, dy = b.y - a.y, r = a.radio + b.radio;
      const d2 = dx * dx + dy * dy;
      if (d2 > r * r || d2 < 1e-9) return;

      if (m.cfg.caza) {
        // Te comes a quien te quepa en la boca, que abarca media cara. Es un umbral relativo,
        // no una curva: por eso la talla puede oscilar en ciclos en vez de asentarse.
        if (a.mastica === 0 && b.radio <= m.cfg.boca * a.radio) { comer(m, a, b); return; }
        if (b.mastica === 0 && a.radio <= m.cfg.boca * b.radio) { comer(m, b, a); return; }
      }
      const d = Math.sqrt(d2);
      const solape = (r - d) / 2;
      const ux = dx / d, uy = dy / d;
      const total = a.masa + b.masa;
      const fa = (b.masa / total) * solape, fb = (a.masa / total) * solape;
      a.x -= ux * fa; a.y -= uy * fa;
      b.x += ux * fb; b.y += uy * fb;
    });
  }
}

// ─── Tick ─────────────────────────────────────────────────────────────────────

/**
 * Un paso de mundo, en este orden y siempre el mismo: brotar → percibir y moverse → chocar →
 * metabolismo, crecer, criar y morir → limpiar. El orden es parte de la promesa de la semilla.
 */
export function tick(m: Mundo) {
  if (m.extinto) return;
  const c = m.cfg;
  m.t++;

  if (!c.neutral) brotar(m);

  let radioMax = RADIO_CRIA;
  for (const b of m.bichos) if (b.radio > radioMax) radioMax = b.radio;

  const rc = rejilla(m, m.rejC, m.comida);
  const rb = rejilla(m, m.rejB, m.bichos);

  for (const b of m.bichos) {
    if (b.mastica > 0) { b.mastica--; continue; }
    decidir(m, b, rb, rc, radioMax);
    const v = b.g.empuje / b.radio;
    b.x = Math.min(c.ancho, Math.max(0, b.x + b.hx * v));
    b.y = Math.min(c.alto, Math.max(0, b.y + b.hy * v));
  }

  rejilla(m, m.rejB, m.bichos); // se han movido: la rejilla de los choques es otra
  const comidos = m.comidos;
  comidos.length = m.comida.length;
  comidos.fill(false);
  if (!c.neutral) choques(m, rb, rc, comidos, radioMax);

  // Por índice y hasta la longitud de antes: `nacer` hace push, y un `for...of` alcanzaría a los
  // recién nacidos en su propio tick de nacimiento — que además podrían criar en cadena.
  const vivos = m.bichos.length;
  for (let i = 0; i < vivos; i++) {
    const b = m.bichos[i];
    if (!b.vivo) continue;
    b.edad++;

    // Metabolismo. Todo se paga en la misma moneda y por unidad de masa: basal (con el recargo
    // del aguante), ver y moverse. El de moverse es la potencia física —fuerza por velocidad,
    // que con fuerza = empuje·radio² sale masa·v²—, no un número elegido: coste convexo en la
    // velocidad contra un beneficio lineal (terreno cubierto), que es lo que le da óptimo interior.
    if (!c.neutral) {
      const v = b.mastica > 0 ? 0 : b.g.empuje / b.radio;
      const coste = pot(b.masa, c.expMasa) *
        (C_BASAL * (1 + b.g.aguante) + C_VISION * pot(b.g.vision, c.expVision) + C_EMPUJE * v * v);
      b.reserva -= coste;
      alSuelo(m, b.x, b.y, coste);
    } else {
      b.reserva = b.masa * CAP_RESERVA;
    }

    if (c.hambre && b.reserva < 0) { m.cuenta.hambre++; morir(m, b); continue; }

    // Senescencia: el riesgo crece con la edad, sin corte seco. Una edad máxima fija haría que
    // los nacidos a rachas murieran a rachas, y saldrían oscilaciones que parecen un ciclo
    // ecológico y son un efecto de cohorte.
    if (!c.neutral && sig(m.azar) < c.senescencia * b.edad * b.edad / (1 + b.g.aguante)) {
      m.cuenta.viejos++; morir(m, b); continue;
    }

    // Criar. El hijo cuesta su masa más la despensa con la que sale, y nace junto a la madre:
    // una línea, y el mundo gana estructura de parentesco espacial sin ningún gen de reconocerla.
    const cap = b.masa * CAP_RESERVA;
    const masaCria = masaDe(RADIO_CRIA);
    const dote = masaCria * CAP_RESERVA * 0.5;
    // En modo laboratorio se replica por edad y gratis: si criar dependiera del umbral genético,
    // el mundo "sin selección" estaría seleccionando por fecundidad y el test de deriva mentiría.
    // **Se cría de adulto**, no antes. Sin esto la talla por encima de lo que un bicho llega a
    // crecer no cuesta nada ni compra nada: es un gen invisible para la selección, y medido sale
    // que un mundo que arranca con talla 36 se queda en 38 sin que nadie lo baje. Con esto, una
    // talla que no se alcanza es una estirpe que no tiene hijos, que es la selección más dura que
    // hay. Y de paso la talla pasa a decidir también *cuándo* se empieza a criar, que es el
    // trade-off entre pocos hijos caros y muchos baratos.
    const cria = c.neutral
      ? b.edad > 0 && b.edad % 40 === 0
      : b.radio >= b.g.talla && b.reserva >= b.g.umbral * cap && b.reserva >= masaCria + dote;
    if (cria) {
      if (!c.neutral) b.reserva -= masaCria + dote;
      const [ux, uy] = unidad(m.azar);
      const d = b.radio + RADIO_CRIA + 0.5;
      const hijo = nacer(m, mutar(m.azar, b.g, c), b.id, b.gen + 1,
        Math.min(c.ancho, Math.max(0, b.x + ux * d)),
        Math.min(c.alto, Math.max(0, b.y + uy * d)));
      hijo.reserva = dote;
      b.hijos++;
      m.cuenta.nacidos++;
    }
  }
  for (let i = m.comida.length - 1; i >= 0; i--) if (comidos[i]) m.comida.splice(i, 1);
  m.bichos = m.bichos.filter((b) => b.vivo);

  if (c.neutral) sorteoNeutral(m);

  if (m.bichos.length === 0) m.extinto = true;
}

function morir(m: Mundo, b: Bicho) {
  // La reserva va con su signo: quien muere de hambre debe energía, y esa deuda la paga su masa.
  // Devolver solo lo positivo crearía energía en cada muerte, y el presupuesto dejaría de cerrar.
  alSuelo(m, b.x, b.y, b.masa + b.reserva);
  b.vivo = false;
}

/** Solo en modo laboratorio: recorta el censo por sorteo uniforme, que no selecciona nada. */
function sorteoNeutral(m: Mundo) {
  while (m.bichos.length > m.cfg.neutral) {
    m.bichos.splice(Math.floor(sig(m.azar) * m.bichos.length), 1);
  }
}

/**
 * Multiplicativa en los genes positivos y aditiva en los que llevan signo. Multiplicar o dividir
 * por el mismo factor con la misma probabilidad es log-normal sin `exp`, que no está fijado por
 * IEEE; y sobre un gen acotado en 0 no puede producir el sesgo de recorte de la aditiva.
 */
export function mutar(a: Azar, g: Genoma, c: Config): Genoma {
  const h: Genoma = { ...g };
  for (const r of RASGOS) {
    const n = centrado(a);
    if (CON_SIGNO.includes(r)) { h[r] = g[r] + n * c.paso; continue; }
    const f = 1 + Math.abs(n) * c.tasa;
    h[r] = n >= 0 ? g[r] * f : g[r] / f;
    if (h[r] < 1e-6) h[r] = 1e-6;
  }
  return h;
}

export function avanzar(m: Mundo, ticks: number) {
  for (let i = 0; i < ticks && !m.extinto; i++) tick(m);
}

// ─── Lectura del mundo ────────────────────────────────────────────────────────

export function mediana(xs: number[]): number {
  if (xs.length === 0) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/**
 * Velocidad de un adulto con ese genoma. La velocidad realizada de un bicho vivo lee su radio
 * actual —una cría es más rápida que su madre—; esta es la del genoma, que es lo que se compara
 * entre poblaciones.
 */
export const velocidadAdulta = (g: Genoma): number => g.empuje / g.talla;

/**
 * La foto del mundo: censo, generación y **mediana** de cada gen. Nunca la media: si la población
 * se parte en depredadores enormes y presas diminutas, la media dice "mediano, estable" y esconde
 * justo el resultado que se busca.
 */
export function resumen(m: Mundo) {
  const medianas = {} as Genoma;
  for (const r of RASGOS) medianas[r] = mediana(m.bichos.map((b) => b.g[r]));
  return {
    t: m.t,
    censo: m.bichos.length,
    gen: m.bichos.length ? Math.max(...m.bichos.map((b) => b.gen)) : m.gen,
    comida: m.comida.length,
    extinto: m.extinto,
    velocidad: mediana(m.bichos.map((b) => velocidadAdulta(b.g))),
    medianas,
  };
}

/** Toda la energía del mundo. Con presupuesto cerrado, esto no puede cambiar: es el test. */
export function balance(m: Mundo): number {
  let e = 0;
  for (let i = 0; i < m.suelo.length; i++) e += m.suelo[i];
  for (const p of m.parches) e += p.reserva;
  e += m.comida.length * E_COMIDA;
  for (const b of m.bichos) e += b.masa + b.reserva;
  return e;
}

/** Estado completo comparable: dos mundos con la misma semilla deben dar la misma cadena. */
export function huella(m: Mundo): string {
  const partes = [String(m.t), String(m.bichos.length), String(m.comida.length), balance(m).toFixed(6)];
  for (const b of m.bichos) {
    partes.push(`${b.id}:${b.x.toFixed(9)},${b.y.toFixed(9)},${b.hx.toFixed(9)},${b.radio.toFixed(9)},${b.reserva.toFixed(9)},${b.g.empuje.toFixed(9)}`);
  }
  return partes.join("|");
}
