// Motor de evolution: bichos que salen de casa cada mañana, buscan comida, se la llevan a cuestas
// y vuelven antes de que anochezca. El que no vuelve, muere; el que vuelve con uno, vive; cada dos
// bocados dan un hijo. Lógica pura, sin React ni canvas — render.ts lo pinta y page.tsx lo conecta.
//
// Tres promesas que el resto del archivo cumple línea a línea:
//
// 1. **Ningún gen mejor cuanto más alto.** Uno sin óptimo interior se clava en el tope en tres
//    generaciones y la gráfica se queda quieta pareciendo que funciona. Por eso el día se paga:
//    sin coste de movimiento el empuje no tendría freno.
// 2. **Ningún coeficiente inventado.** Un acoplamiento entra solo si sale de una magnitud que ya
//    se está contando: masa, energía, geometría. La fuerza de un músculo va con su sección
//    —masa^(2/3), o sea radio²—, así que fuerza = empuje·radio² y **velocidad = empuje/radio**;
//    el giro es inverso a la masa, te ven a distancia proporcional a tu radio (tamaño angular) y
//    **la comida pesa**, así que el segundo bocado te frena por la misma aritmética que frena a un
//    bicho grande. No hay tope de carga porque no hace falta. Un coeficiente elegido a mano es una
//    perilla que se acaba moviendo hasta que la simulación hace algo bonito, y entonces el
//    resultado es mío.
// 3. **Determinismo.** PRNG propio con semilla, paso de tiempo fijo (nunca delta de tiempo real)
//    y orden de actualización explícito. En el tick no entra una sola trigonométrica:
//    `Math.sin/cos/exp/pow/cbrt` no están fijados por IEEE y un bit de diferencia entre
//    navegadores parte la promesa de la semilla compartida sin que falle nada. Los rumbos son
//    vectores unitarios girados por multiplicación, las distancias se comparan al cuadrado, y
//    solo se usan `+ - * /` y `sqrt`, que sí son exactos por norma.
//
// Y la cuarta, que no es del modelo sino de quien lo mira: **las estrategias malas no se arreglan
// aquí.** Un bicho que se queda tonto no es un bug, es un perdedor, y borrarlo es trabajo de la
// selección. Solo se arregla la indefinición numérica: vector suma exactamente cero significa
// mantener el rumbo, nunca un ángulo indefinido que propague NaN en silencio.
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
export const centrado = (a: Azar): number => sig(a) + sig(a) + sig(a) - 1.5;

/** Vector unitario uniforme, por rechazo en el cuadrado: sin ángulos, sin trigonometría. */
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

// ─── Física ───────────────────────────────────────────────────────────────────

/** masa = radio³. Vale igual para un bicho y para un bocado: no hay dos leyes de materia. */
export const masaDe = (radio: number): number => radio * radio * radio;

export const RADIO_COMIDA = 3;
/** Un bocado es un cuerpo del radio de la comida, así que su energía es su masa. */
export const E_COMIDA = masaDe(RADIO_COMIDA);

/**
 * Capacidad de la despensa, en múltiplos de la masa: **el cuerpo es el granero**. Va con la masa
 * porque el gasto también, así que la autonomía en días no depende del tamaño — el grande no
 * aguanta más ni menos, solo es más lento y come a más gente. La cifra sale de `costes.medir.ts`.
 */
export const CAP_RESERVA = 1;
export const C_BASAL = 4e-4;      // metabolismo basal por unidad de masa y tick
export const C_EMPUJE = 2.5e-3;   // coste de moverse: masa · C_EMPUJE · v²
export const C_VISION = 7e-7;     // coste de ver: masa · C_VISION · visión²
export const GIRO = 24;           // tangente del giro máximo por tick = GIRO / masa
export const EFICIENCIA = 0.6;    // de la masa de la presa; el resto se pierde

/**
 * Ticks que tarda un bocado en pasar de la espalda a la despensa. **Es la única cifra del motor
 * elegida por el ojo y no por una magnitud**, y por eso está declarada aparte: vaciarse de golpe
 * no se veía, y con la carga mediana en un solo bocado cualquier ritmo proporcional sin constante
 * duraría un tick. No desequilibra nada porque en casa no se caza y solo corre el basal: cuesta
 * tiempo, no energía.
 */
export const TICKS_BOCADO = 5;

export type Rumbo = { hx: number; hy: number; masa: number };

/**
 * Gira el rumbo hacia `(dx,dy)` sin pasarse del máximo del tick, que es inverso a la masa: los
 * grandes maniobran mal. El giro se aplica multiplicando por el vector `(c,s)` —una rotación
 * compleja—, así que no hace falta ni un ángulo ni una trigonométrica.
 */
export function girar(b: Rumbo, dx: number, dy: number) {
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

/**
 * Raíz cúbica por Newton desde el radio de ahora: `Math.cbrt` no está fijado por IEEE y el radio
 * entra en todas las relaciones físicas, así que un bit de diferencia partiría la semilla.
 */
export function raizCubica(masa: number, desde: number): number {
  let r = desde > 0 ? desde : 1;
  for (let i = 0; i < 8; i++) r = (2 * r + masa / (r * r)) / 3;
  return r;
}

// ─── Estadística ──────────────────────────────────────────────────────────────

export function mediana(xs: number[]): number {
  if (xs.length === 0) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/**
 * Cómo está repartido un gen en la población viva: los extremos de verdad —el más y el menos de
 * todos— y el cuerpo central entre el décimo y el noveno decil, con la mediana dentro. Es lo que
 * la leyenda necesita para contestar «¿ya son lo más grandes que pueden?»: **no hay tope
 * genético**, la mutación multiplica y divide sin techo, así que lo único que se puede enseñar es
 * dónde está hoy la población y cuánto se ha ido de donde salió.
 *
 * Con `xs` vacío devuelve `null` y no una banda de `NaN`: quien pinta tiene que decidir qué hacer
 * cuando no queda nadie, y un `NaN` se cuela hasta el atributo del SVG sin que falle nada.
 */
export function banda(xs: number[]): { min: number; lo: number; med: number; hi: number; max: number } | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const en = (q: number) => s[Math.min(s.length - 1, Math.max(0, Math.round(q * (s.length - 1))))];
  return { min: s[0], lo: en(0.1), med: mediana(s), hi: en(0.9), max: s[s.length - 1] };
}

// ─── Genoma y mundo ───────────────────────────────────────────────────────────

/**
 * Seis genes, **y todos se ven**: tamaño, cola, tono y filo, aura y anillo están en el cuerpo; la
 * visión, en lo lejos que reacciona; el retorno, en que tuerce a casa en cuanto carga algo. Un gen
 * que solo existiera en la estadística no se puede mirar, y esto es un juguete para mirar.
 *
 * `retorno` es el propio de este mundo: cuánto tira el borde cuando ya llevas comida. Sin ese peso
 * nadie volvería salvo por azar, y con él puesto a mano sería una regla y no una estrategia.
 */
export const RASGOS = [
  "empuje", "talla", "vision", "sociabilidad", "fiereza", "retorno",
] as const;
export type Rasgo = (typeof RASGOS)[number];
export type Genoma = Record<Rasgo, number>;

/** Qué paga y qué cobra cada gen. Es la fuente de la tabla de reglas y de la leyenda. */
export const TABLA: Record<Rasgo, { paga: string; cobra: string }> = {
  empuje: { paga: "coste ∝ empuje² · radio; la despensa del día es la misma para todos", cobra: "velocidad = empuje / radio, y con carga menos" },
  talla: { paga: "coste ∝ masa con la misma despensa que el pequeño; giras peor", cobra: "derecho a comerte a quien sea un 20% menor" },
  vision: { paga: "coste ∝ visión²", cobra: "detectas a distancia ∝ radio del otro" },
  sociabilidad: { paga: "competencia por el mismo bocado", cobra: "peso al centro de masa de los visibles, con signo" },
  fiereza: { paga: "riesgo, y perseguir no es recoger", cobra: "peso de atracción al menor visible" },
  retorno: { paga: "volver pronto es dejar de buscar", cobra: "peso hacia casa cuando ya llevas comida" },
};

export type Config = {
  ancho: number;
  alto: number;
  /** Bocados que amanecen repartidos por el interior. Es el techo de la población. */
  comidas: number;
  censoInicial: number;
  /** Tope de duración del día. El que sigue fuera cuando se acaba, no volvió. */
  ticksDia: number;
  /**
   * Capacidad de la despensa, en múltiplos de la masa. La energía **no se regala cada mañana**:
   * la de mañana es lo que trajiste hoy, así que quemar se paga y el empuje tiene techo. Cuando
   * se regalaba, el hambre no mataba nunca —el 42% del tanque bastaba para un día entero—, correr
   * era gratis y el empuje subía sin freno hasta que un día mataba a toda la población de golpe.
   */
  capReserva: number;
  /**
   * Ancho de la franja del borde que es casa. **De vacío es pared:** no se entra, aunque desde
   * dentro siempre se pueda salir. Cargado es refugio, pero no basta con rozarla: se está a salvo
   * al llegar a su **línea media**, metido en la franja y no parado en su borde interior.
   */
  casa: number;
  caza: boolean;
  /**
   * Cuánto mayor hay que ser para comerse a otro, en radios. 1,2 es "un 20% más grande": el
   * umbral que hace de la talla una carta y no solo lastre.
   */
  boca: number;
  tasa: number;
  paso: number;
  fundador: Genoma;
};

export const FUNDADOR: Genoma = {
  empuje: 2, talla: 4.5, vision: 22, sociabilidad: 0, fiereza: 1, retorno: 1,
};

// Medido en `costes.medir.ts`, y **el tamaño del mundo lo decide que se coma la comida**. Con
// 448×320 sobraba la mitad del suelo todos los días y el centro del mapa no lo pisaba nadie: la
// comida sobrante por bandas del borde al centro iba 35% · 44% · 75% · 95% · **99%**. No era la
// jornada —alargarla cinco veces dejaba el 51%— sino la geometría: casa está en el perímetro, y
// pasado cierto radio el viaje de ida y vuelta no lo paga ningún bocado. A 320×224 sobra el 10% y
// **la mitad de los días el suelo queda limpio**; a 256×176, el 1% y tres de cada cuatro días.
//
// **La jornada es larga a propósito, y no solo para mirarla.** Con 1000 ticks el gasto de un día
// entero supera la despensa llena de un fundador (112 contra 91), así que **nadie aguanta el día
// sin traer nada**: hay que hacer varios viajes solo para no perder. Ahí está el que se va pronto
// a casa y se queda. Medido contra 600 ticks: el hambre pasa del 63% al 75% de las muertes, los
// viajes por bicho de 2,0 a 3,4, la comida sobrante del 10% al 3% y los días con el suelo limpio
// del 50% al 67%.
//
// **La comida del día es la perilla que mueve el mundo entero.** Con 100 bocados sobreviven seis
// de doce semillas al día 100 —la extinción tiene que seguir siendo un resultado posible— y el
// censo se asienta en 27. A 70 se extinguen más de la mitad; a 300, el censo se dobla y sobra
// comida en el suelo la mitad de los días.
export const CONFIG: Config = {
  ancho: 320, alto: 224,
  comidas: 100, censoInicial: 30,
  ticksDia: 1000, capReserva: CAP_RESERVA, casa: 18,
  caza: true, boca: 1.2,
  tasa: 0.08, paso: 0.06,
  fundador: FUNDADOR,
};

export type Bicho = {
  id: number; idMadre: number; gen: number;
  x: number; y: number; hx: number; hy: number;
  radio: number; masa: number;
  /** Bocados encima. Pesan: entran en la masa que hay que mover. */
  carga: number;
  reserva: number;
  vivo: boolean;
  /**
   * Está en casa ahora mismo, dentro de la línea media de la franja. **No es «por hoy ha
   * terminado»**, que es lo que fue un rato: con eso un bicho hacía un solo viaje al día —salía,
   * cogía uno, volvía y se aparcaba—, así que la cosecha de la población tenía techo pase lo que
   * pase y **sobraba comida todos los días**: el 51% del suelo sin tocar incluso con la jornada
   * cinco veces más larga, porque el día se acababa en cuanto estaban todos aparcados. Ahora
   * llegar a casa descarga y suelta, y lo que limita la cosecha es el reloj y las piernas.
   */
  aSalvo: boolean;
  /** Crías de esta noche. Vive solo entre el anochecer y el amanecer siguiente: es lo que se pinta. */
  hijos: number;
  /** Nacido en la noche que se está mirando. Se apaga al amanecer, y solo lo usa el pintado. */
  recien: boolean;
  g: Genoma;
};

/**
 * Una muerte, guardada lo justo para poder pintarla: dónde, cuándo, de qué tamaño era y con qué
 * tono —la fiereza, que es lo único del genoma que se ve—. Caducan en `MARCA` ticks. Solo hay dos
 * causas: **al anochecer ya no muere nadie**, así que el que se queda fuera sigue pintándose vivo,
 * que es lo que es.
 */
export type Marca = {
  x: number; y: number; r: number; t: number;
  causa: "comido" | "hambre";
  fiereza: number;
};

export type Mundo = {
  cfg: Config;
  azar: Azar;
  /** Días completos, que aquí son generaciones: todos crían a la vez. */
  dia: number;
  /** Descargas en casa en lo que va de día. Es la cosecha de la población, y no decide nada. */
  viajes: number;
  t: number;
  /** Lo que duró el último día. `t` no vale: amanecer lo pone a cero. */
  duracion: number;
  bichos: Bicho[];
  comida: { x: number; y: number }[];
  siguienteId: number;
  /**
   * El día ya está cerrado y las crías están puestas al lado de su madre: el mundo se queda así,
   * a la vista, hasta que alguien llame a `amanecer`. Quien mira decide cuánto dura la noche; el
   * motor no sabe de relojes.
   */
  noche: boolean;
  /**
   * Hasta dónde llega el parecido de familia hoy: la distancia genética típica de esta población
   * a su propio centro. Por debajo de ella dos bichos son de los mismos, y **no se comen entre
   * ellos** por grande que sea uno. Sale del mundo cada mañana, no de un número elegido a ojo.
   */
  especie: number;
  /** Quién ha muerto, dónde y de qué, para que el pintado pueda enseñarlo. No decide nada. */
  marcas: Marca[];
  extinto: boolean;
  eva: Genoma;
  /** `fuera` son **noches pasadas a la intemperie**, no muertes: al anochecer ya no muere nadie. */
  cuenta: { nacidos: number; hambre: number; fuera: number; comidos: number };
};

/** Masa que hay que mover: la propia más la que llevas encima. La comida pesa lo que vale. */
const masaCargada = (b: Bicho): number => b.masa + b.carga * E_COMIDA;
const radioCargado = (b: Bicho): number => raizCubica(masaCargada(b), b.radio);

/**
 * La semilla despeina al fundador: define el mundo *y* quién lo empezó. La población de partida
 * son clones de ese genoma, para ver divergir lo que empezó idéntico.
 *
 * Está fuera de `crearMundo` porque es **lo primero que sale del PRNG**, antes que nada del mundo:
 * así `evaDe(azarCon(palabra), CONFIG)` devuelve el fundador de esa partida sin sembrarla, que es
 * lo que necesita la leyenda para enseñar de dónde salió la población.
 */
export function evaDe(a: Azar, c: Config): Genoma {
  const eva = { ...c.fundador };
  for (const r of RASGOS) {
    eva[r] = r === "sociabilidad"
      ? eva[r] + centrado(a) * c.paso * 2
      : eva[r] * (1 + centrado(a) * 0.12);
  }
  return eva;
}

export function crearMundo(semilla: string, cfg: Partial<Config> = {}): Mundo {
  const c: Config = { ...CONFIG, ...cfg };
  const azar = azarCon(semilla);
  const eva = evaDe(azar, c);
  const m: Mundo = {
    cfg: c, azar, dia: 0, viajes: 0, t: 0, duracion: 0, bichos: [], comida: [], siguienteId: 1,
    noche: false, especie: 0, marcas: [],
    extinto: false, eva, cuenta: { nacidos: 0, hambre: 0, fuera: 0, comidos: 0 },
  };
  for (let i = 0; i < c.censoInicial; i++) nacer(m, { ...eva }, -1, 0);
  amanecer(m);
  return m;
}

/**
 * Un punto al azar en la línea media de la franja de casa: donde se está a salvo y, por tanto,
 * donde se amanece. Solo la usan los fundadores del primer día — a partir de ahí cada uno amanece
 * donde acabó y las crías, donde nacieron.
 */
function enCasaDelTodo(m: Mundo): [number, number] {
  const c = m.cfg;
  const u = sig(m.azar), v = c.casa / 2;
  const perimetro = 2 * (c.ancho + c.alto);
  let d = u * perimetro;
  if (d < c.ancho) return [d, v];
  d -= c.ancho;
  if (d < c.alto) return [c.ancho - v, d];
  d -= c.alto;
  if (d < c.ancho) return [c.ancho - d, c.alto - v];
  return [v, d - c.ancho];
}

/** Nace en la línea de salida, o donde se le diga — una cría nace pegada a su madre, y ahí se ve. */
function nacer(m: Mundo, g: Genoma, idMadre: number, gen: number, donde?: [number, number]): Bicho {
  const [x, y] = donde ?? enCasaDelTodo(m);
  const [hx, hy] = unidad(m.azar);
  const b: Bicho = {
    id: m.siguienteId++, idMadre, gen, x, y, hx, hy,
    // Nace con la despensa llena, y eso **es** lo que cuesta un hijo: se la paga su madre de lo
    // que trajo. Así una cría grande cuesta más que una pequeña, que es el contrapeso que la talla
    // no tenía —antes un hijo costaba dos bocados fuera cual fuera su tamaño—.
    radio: g.talla, masa: masaDe(g.talla), carga: 0, reserva: m.cfg.capReserva * masaDe(g.talla),
    vivo: true, aSalvo: false, hijos: 0, recien: false, g,
  };
  m.bichos.push(b);
  return b;
}

/**
 * Cuánto se diferencian dos genomas: gen a gen, lo que se separan **en proporción a su tamaño**,
 * promediado. Adimensional a propósito — sin eso la visión, que va en decenas, taparía a la talla
 * y a la fiereza, que van en unidades, y "parecerse" acabaría queriendo decir "ver parecido".
 */
export function distancia(a: Genoma, b: Genoma): number {
  let s = 0;
  for (const r of RASGOS) {
    const d = Math.abs(a[r] - b[r]), suma = Math.abs(a[r]) + Math.abs(b[r]);
    if (suma > 1e-9) s += d / suma;
  }
  return s / RASGOS.length;
}

/**
 * Lo lejos que está un bicho corriente del centro de su población, medido con la mediana en los
 * dos pasos. Es la vara de medir el parecido de familia, y **la pone la propia población**: en un
 * mundo de clones vale 0 y no se salva nadie por parecido; en uno partido en dos formas de vida
 * crece, y cada mitad queda protegida de sí misma.
 */
function dispersion(m: Mundo): number {
  if (m.bichos.length < 2) return 0;
  const centro = {} as Genoma;
  for (const r of RASGOS) centro[r] = mediana(m.bichos.map((b) => b.g[r]));
  return mediana(m.bichos.map((b) => distancia(b.g, centro)));
}

/**
 * Amanece: la comida se reparte de nuevo por el interior y todos abren los ojos **donde los
 * cerraron**, con el mismo rumbo y la despensa llena. Nadie se recoloca: el sitio donde llegaste
 * ayer es tu casa de hoy, y las crías amanecen donde nacieron, al lado de su madre. Un reparto en
 * la línea de salida cada mañana borraría eso, que es lo único que ata un día con el siguiente.
 *
 * **La comida no se acumula de un día para otro** — el mundo no tiene memoria, que es justo lo
 * que hace que un día no herede nada del anterior salvo dónde acabó cada uno.
 */
export function amanecer(m: Mundo) {
  const c = m.cfg;
  m.t = 0;
  m.viajes = 0;
  m.noche = false;
  m.comida.length = 0;
  m.marcas.length = 0;
  m.especie = dispersion(m);
  const margen = c.casa + RADIO_COMIDA;
  for (let i = 0; i < c.comidas; i++) {
    m.comida.push({
      x: margen + sig(m.azar) * (c.ancho - 2 * margen),
      y: margen + sig(m.azar) * (c.alto - 2 * margen),
    });
  }
  for (const b of m.bichos) {
    b.aSalvo = false;
    b.hijos = 0;
    b.recien = false;
    // **Ni se reparte despensa ni se vacía la carga.** La energía de hoy es la que quedó de ayer,
    // y el que no llegó a casa amanece donde le pilló la noche, con lo suyo todavía a cuestas.
    // Quien sí llegó ya lo canjeó al anochecer.
    //
    // Se sale de casa mirando al campo. No se le elige el rumbo —trae el de ayer— sino que se le
    // refleja la componente que apunta al muro: amanecer contra la pared de tu propia casa es
    // perder la mañana en un rebote, y eso no lo decide ningún gen. Solo a quien está en casa: al
    // de fuera, la pared que le estorba es otra.
    if (enCasa(c, b.x, b.y)) {
      const [dx, dy] = haciaCasa(m, b);
      if (b.hx * dx + b.hy * dy > 0) { if (dx !== 0) b.hx = -b.hx; else b.hy = -b.hy; }
    }
  }
}

/** Distancia al borde más cercano y hacia dónde está, sin trigonometría. */
function haciaCasa(m: Mundo, b: Bicho): [number, number, number] {
  const c = m.cfg;
  const izq = b.x, der = c.ancho - b.x, arr = b.y, aba = c.alto - b.y;
  let d = izq, dx = -1, dy = 0;
  if (der < d) { d = der; dx = 1; dy = 0; }
  if (arr < d) { d = arr; dx = 0; dy = -1; }
  if (aba < d) { d = aba; dx = 0; dy = 1; }
  return [dx, dy, d];
}

/**
 * **Decisión por suma de vectores**, nunca una pila de `if`: esa lista fijaría el repertorio de
 * comportamientos y todo lo que pudiera pasar estaría enumerado de antemano. Cuatro entradas
 * —comida visible, menor visible, centro de masa de los visibles y borde—, cada una por su peso, y
 * el bicho empuja hacia la suma. El arbitraje —"llevo uno y veo otro bocado, ¿vuelvo o me
 * arriesgo?"— no se programa: sale.
 *
 * El borde cambia de signo según lleves o no comida: vacío te empuja hacia dentro y es pared,
 * cargado te llama a casa con el peso de `retorno`. Y el menor pesa por **contraste de masas**,
 * no por masa absoluta: lo que se persigue no es lo pequeño, es lo pequeño comparado contigo.
 *
 * **Aquí ya no hay peso al mayor.** Era `audacia`, y no se veía: un bicho miedoso y uno temerario
 * se pintaban idénticos. Al quitarlo, apartarse del que te puede comer lo hace la sociabilidad
 * negativa —que sí se ve, en el anillo duro—, y medir dice que la población la usa: de −0,16 a
 * −0,44 de mediana en cuanto audacia deja de existir.
 */
function decidir(m: Mundo, b: Bicho, radioMax: number) {
  const g = b.g;
  let sx = 0, sy = 0;

  const alcanceC = g.vision * RADIO_COMIDA;
  let d2c = alcanceC * alcanceC, cx = 0, cy = 0, hay = false;
  for (const c of m.comida) {
    const dx = c.x - b.x, dy = c.y - b.y, d2 = dx * dx + dy * dy;
    if (d2 < d2c && d2 > 1e-9) { d2c = d2; cx = dx; cy = dy; hay = true; }
  }
  if (hay) { const d = Math.sqrt(d2c); sx += cx / d; sy += cy / d; }

  let mMenor = Infinity, xMenor = 0, yMenor = 0;
  let sumM = 0, sumX = 0, sumY = 0;
  const alcanceB = g.vision * radioMax;
  for (const o of m.bichos) {
    if (o === b || !o.vivo || o.aSalvo) continue;
    const dx = o.x - b.x, dy = o.y - b.y, d2 = dx * dx + dy * dy;
    if (d2 > alcanceB * alcanceB) continue;
    const alcance = g.vision * o.radio;
    if (d2 > alcance * alcance) continue;
    sumM += o.masa; sumX += o.masa * dx; sumY += o.masa * dy;
    if (o.masa < mMenor) { mMenor = o.masa; xMenor = dx; yMenor = dy; }
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

  const [hx, hy] = haciaCasa(m, b);
  if (b.carga > 0) { sx += hx * g.retorno; sy += hy * g.retorno; }

  const n2 = sx * sx + sy * sy;
  if (n2 < 1e-12) return;
  const n = Math.sqrt(n2);
  const r = { hx: b.hx, hy: b.hy, masa: masaCargada(b) };
  girar(r, sx / n, sy / n);   // muta lo que recibe: se le pasa un cuerpo prestado y se leen sus números
  b.hx = r.hx; b.hy = r.hy;
}

/**
 * Multiplicativa en los genes positivos y aditiva en el único que lleva signo. Multiplicar o
 * dividir por el mismo factor con la misma probabilidad es log-normal sin `exp`, que no está
 * fijado por IEEE; y sobre un gen acotado en 0 no puede producir el sesgo de recorte que sí
 * produce la aditiva y que el test de deriva está para cazar.
 */
export function mutar(a: Azar, g: Genoma, c: Config): Genoma {
  const h: Genoma = { ...g };
  for (const r of RASGOS) {
    const n = centrado(a);
    if (r === "sociabilidad") { h[r] = g[r] + n * c.paso; continue; }
    const f = 1 + Math.abs(n) * c.tasa;
    h[r] = n >= 0 ? g[r] * f : g[r] / f;
    if (h[r] < 1e-6) h[r] = 1e-6;
  }
  return h;
}

function comer(m: Mundo, dep: Bicho, presa: Bicho) {
  dep.reserva += presa.masa * EFICIENCIA;
  dep.carga += presa.carga;
  presa.vivo = false;
  m.marcas.push({ x: presa.x, y: presa.y, r: presa.radio, t: m.t, causa: "comido", fiereza: presa.g.fiereza });
  m.cuenta.comidos++;
}

/** Lo que dura en pantalla una muerte del día, en ticks. Solo la mira el pintado. */
export const MARCA = 14;

/** Si un punto cae en la franja del borde, que es casa. */
const enCasa = (c: Config, x: number, y: number): boolean =>
  x < c.casa || y < c.casa || x > c.ancho - c.casa || y > c.alto - c.casa;

/**
 * Mover y chocar, siempre rebotando y nunca pegándose: un rumbo clavado contra la pared deja al
 * bicho raspándola el día entero sin decidir nada, y el rebote no es genético — nadie evoluciona
 * a atravesar un muro.
 *
 * Dos paredes. La del mundo, que **cada uno tiene a su propio radio**: el cuerpo se para tangente
 * al borde en vez de centrado en él, que es como se pintaba media población partida por la mitad.
 * Más adentro no puede ir —probado en la línea media de la franja—: el aro exterior es la sala de
 * espera donde se hace noche, y cerrarlo hunde los nacimientos a la mitad en el mundo pobre.
 * Y la franja de casa, que **de vacío no se entra** —volver es traer algo— pero sí se sale: al
 * amanecer todo el mundo está dentro de ella, que es donde acabó el día anterior, y encerrarlos
 * ahí sería no dejar salir a nadie nunca.
 */
function mover(m: Mundo, b: Bicho, v: number) {
  const c = m.cfg;
  const puedeEntrar = b.carga > 0 || enCasa(c, b.x, b.y);
  let x = b.x + b.hx * v, y = b.y + b.hy * v;
  const lim = puedeEntrar ? b.radio : c.casa;
  if (x < lim) { x = lim; b.hx = Math.abs(b.hx); }
  else if (x > c.ancho - lim) { x = c.ancho - lim; b.hx = -Math.abs(b.hx); }
  if (y < lim) { y = lim; b.hy = Math.abs(b.hy); }
  else if (y > c.alto - lim) { y = c.alto - lim; b.hy = -Math.abs(b.hy); }
  b.x = x; b.y = y;
}

export function tick(m: Mundo) {
  // Un mundo extinto no avanza, y eso tiene que estar **aquí** y no en quien llame: la página da
  // los ticks de uno en uno y `correrDia` de golpe, y si el guardia vive solo en uno de los dos
  // caminos, los dos dejan de dar el mismo mundo en cuanto alguien sigue llamando tras la
  // extinción. Lo caza el test de «tick a tick = día de golpe».
  if (m.extinto) return true;
  const c = m.cfg;
  m.t++;
  if (m.marcas.length) m.marcas = m.marcas.filter((z) => m.t - z.t < MARCA);
  let radioMax = 1;
  for (const b of m.bichos) if (b.vivo && !b.aSalvo && b.radio > radioMax) radioMax = b.radio;

  for (const b of m.bichos) {
    if (!b.vivo) continue;   // el que está en casa **no** se salta: tiene que poder volver a salir
    decidir(m, b, radioMax);
    const v = b.g.empuje / radioCargado(b);
    mover(m, b, v);

    // El día se paga: basal, ver y mover, sobre la masa
    // que de verdad se está moviendo. Quedarse sin reserva es morir de hambre a media faena.
    //
    // Probado y descartado: cobrar el empuje como `v³` —la potencia real contra el arrastre, que
    // va con el cubo— para ponerle techo a la velocidad. Con la población mezclada el empuje pasa
    // de acabar en ×1,84 del abanico de partida a ×1,40: sigue sin techo, y a cambio la talla
    // pierde su óptimo. No compra lo que cuesta, y deja dos modelos hermanos con costes distintos
    // que ya no se pueden comparar.
    b.reserva -= masaCargada(b) * (C_BASAL + C_VISION * b.g.vision * b.g.vision + C_EMPUJE * v * v);
    if (b.reserva <= 0) {
      b.vivo = false;
      m.marcas.push({ x: b.x, y: b.y, r: b.radio, t: m.t, causa: "hambre", fiereza: b.g.fiereza });
      m.cuenta.hambre++;
      continue;
    }

    for (let i = m.comida.length - 1; i >= 0; i--) {
      const f = m.comida[i];
      const dx = f.x - b.x, dy = f.y - b.y, r = b.radio + RADIO_COMIDA;
      if (dx * dx + dy * dy <= r * r) { m.comida.splice(i, 1); b.carga++; break; }
    }

    // **Llegar a casa descarga y suelta**, bocado a bocado: la carga que se ve encima tiene que
    // tardar en entrar lo que tarda en desaparecer del dibujo. Se descarga al alcanzar la línea
    // media de la franja, no al pisarla: parándose en su borde interior la población entera se
    // alinearía sobre la misma raya, que es donde no está la casa de nadie.
    const [, , d] = haciaCasa(m, b);
    b.aSalvo = d <= c.casa / 2;
    if (b.aSalvo && b.carga > 0 && m.t % TICKS_BOCADO === 0) {
      b.reserva += E_COMIDA;
      if (--b.carga === 0) m.viajes++;   // el viaje se cuenta al vaciarse, no al llegar
    }
  }

  // **En casa no se caza ni se es cazado.** Es lo que hace de la franja un refugio y no solo una
  // meta: entrar corriendo es escaparse, y eso lo decide el genoma sin que nadie lo programe.
  if (c.caza) {
    for (let i = 0; i < m.bichos.length; i++) {
      const a = m.bichos[i];
      if (!a.vivo || a.aSalvo) continue;
      for (let j = i + 1; j < m.bichos.length; j++) {
        const b = m.bichos[j];
        if (!b.vivo || b.aSalvo) continue;
        const dx = b.x - a.x, dy = b.y - a.y, r = a.radio + b.radio;
        if (dx * dx + dy * dy > r * r) continue;
        // De los tuyos no se come, por grande que seas: por debajo de la dispersión de la
        // población sois la misma cosa. Con la población clonada (`especie` = 0) eso cubre a los
        // idénticos, que es exactamente lo que hay el primer día.
        if (distancia(a.g, b.g) <= m.especie) continue;
        // Comerse a otro da **dos cosas distintas**, y esa es la gracia: su cuerpo entra en la
        // despensa —con la eficiencia trófica, el resto se pierde— y su carga cambia de dueño,
        // todavía a cuestas y sin canjear. Las dos crían: lo robado nace esta misma noche y lo
        // cazado, en cuanto quepa. Cazar no es solo aguantar hasta casa.
        if (a.radio >= c.boca * b.radio) { comer(m, a, b); }
        else if (b.radio >= c.boca * a.radio) { comer(m, b, a); break; }
      }
    }
  }

  m.bichos = m.bichos.filter((b) => b.vivo);
  // El día se acaba cuando se acaba, no cuando todos están en casa: ya nadie «termina» su día.
  return m.t >= c.ticksDia;
}

/**
 * Anochece y se hace la cuenta. **Nadie muere aquí.** El que no llegó a casa se queda donde le
 * pilló la noche, con su carga a cuestas y con lo que le quede de despensa, y mañana lo vuelve a
 * intentar: un mal día es un día perdido, no una sentencia. Antes sí mataba, y mataba tanto que
 * era la única causa de muerte del mundo —131 muertes por no llegar y 0 de hambre en una partida
 * medida—, con dos consecuencias: un fundador solo se moría el primer día en cuatro de cada doce
 * semillas por la geometría que le tocó, y el empuje subía sin techo porque llegar a casa lo valía
 * todo, hasta que a empuje 9 la población entera se moría de hambre a la vez.
 *
 * Lo que sí pasa al llegar a casa: **la carga entra en la despensa, y criar es lo que no cabe.**
 * Es la misma idea que gobernaba el crecimiento en la economía anterior, y aquí hace tres cosas de
 * una vez — le pone precio a la energía quemada, le pone precio al tamaño del hijo (que se lleva
 * su despensa llena, y la de un grande es mayor) y deja de regalar el tanque cada mañana, que era
 * lo que hacía gratis correr.
 *
 * La despensa **no es un techo, es un umbral**: lo que la pasa espera ahí a ser un hijo, y no se
 * tira. Recortándolo cada noche —como estuvo un rato— una madre nunca podía ahorrar para criar:
 * un hijo cuesta más que un bocado, y trayendo uno por día no llegaba nunca. Sin recorte, la
 * reserva sigue acotada sola —en cuanto pasa de la despensa más un hijo, nace el hijo— y criar
 * pasa a ser lo que es: varios días de traer más de lo que gastas.
 */
export function anochecer(m: Mundo) {
  m.duracion = m.t;
  const c = m.cfg;
  for (const b of m.bichos) {
    // Quien está en casa ya descargó al llegar, en su propio tick: aquí solo se cría.
    if (!b.aSalvo) { m.cuenta.fuera++; continue; }   // la noche fuera: ni cría
    const cap = c.capReserva * b.masa;
    // Se mutan los hijos de uno en uno y **se comprueba si caben antes de nacer**: uno grande
    // cuesta más que uno pequeño, así que a la madre le puede sobrar para un hijo cualquiera y no
    // para el que le ha salido. Eso es lo que le pone precio a la talla al criar.
    for (;;) {
      const sobra = b.reserva - cap;
      if (sobra <= 0) break;
      const g = mutar(m.azar, b.g, c);
      const coste = c.capReserva * masaDe(g.talla);
      if (coste > sobra) break;
      b.reserva -= coste;
      const h = nacer(m, g, b.id, b.gen + 1, [b.x, b.y]);
      const [ux, uy] = unidad(m.azar);
      const d = b.radio + h.radio + 1;
      // Al lado de su madre, pero de este lado del muro: se cría pegada a él, y la cría que cayera
      // fuera amanecería pintada a medias.
      const muro = h.radio;
      h.x = Math.min(Math.max(b.x + ux * d, muro), c.ancho - muro);
      h.y = Math.min(Math.max(b.y + uy * d, muro), c.alto - muro);
      h.recien = true;
      b.hijos++;
      m.cuenta.nacidos++;
    }
  }
  m.dia++;
  m.noche = true;
  if (m.bichos.length === 0) m.extinto = true;
}

/** Un día entero: ticks hasta que todos están en casa o se acaba el tiempo, la cuenta y el alba. */
export function correrDia(m: Mundo) {
  if (m.extinto) return;
  for (;;) if (tick(m)) break;
  anochecer(m);
  if (!m.extinto) amanecer(m);
}

/**
 * Velocidad de un bicho de vacío con ese genoma. La realizada lee la masa que de verdad lleva
 * encima —cargado se va más lento—; esta es la del genoma, que es lo que se compara entre
 * poblaciones.
 */
export const velocidadAdulta = (g: Genoma): number => g.empuje / g.talla;

/**
 * La foto del mundo: censo, día y **mediana** de cada gen. Nunca la media: si la población se
 * parte en cazadores grandes y recolectores diminutos, la media dice "mediano, estable" y esconde
 * justo el resultado que se busca.
 */
export function resumen(m: Mundo) {
  const medianas = {} as Genoma;
  for (const r of RASGOS) medianas[r] = mediana(m.bichos.map((b) => b.g[r]));
  return {
    dia: m.dia, censo: m.bichos.length, extinto: m.extinto, medianas, cuenta: m.cuenta,
    viajes: m.viajes, comida: m.comida.length,
    velocidad: mediana(m.bichos.map((b) => velocidadAdulta(b.g))),
  };
}

/**
 * Una copia completa e independiente del mundo, para poder volver a un día anterior. Va por
 * `structuredClone` y no por una lista de campos a mano: **el mundo entero es dato** —números,
 * arrays y objetos planos, ni una función ni un `Map`—, y una lista escrita a mano se olvida del
 * campo que se añada mañana. Olvidarse del estado del PRNG, por ejemplo, no falla: solo hace que
 * el mundo restaurado se separe del original sin que nadie lo note, y ahí se acaba la promesa de
 * la semilla. Que no se separa lo comprueba `engine.test.ts`.
 */
export const copiar = (m: Mundo): Mundo => structuredClone(m);

/** Estado completo comparable: dos mundos con la misma semilla deben dar la misma cadena. */
export function huella(m: Mundo): string {
  const partes = [String(m.dia), String(m.t), String(m.bichos.length), String(m.comida.length)];
  for (const b of m.bichos) {
    partes.push(`${b.id}:${b.x.toFixed(9)},${b.y.toFixed(9)},${b.hx.toFixed(9)},` +
      `${b.reserva.toFixed(9)},${b.carga},${b.g.empuje.toFixed(9)},${b.g.retorno.toFixed(9)}`);
  }
  return partes.join("|");
}
