// Prototipo del **mundo por días**: comida fija repartida cada mañana, todo el perímetro es casa,
// y al anochecer quien no volvió con nada muere, quien volvió con una vive y cada dos tiene un
// hijo. Es la alternativa a la economía de `engine.ts` —energía cerrada, suelo y parches—, y
// está aquí para decidirla midiendo, no para sustituir nada todavía.
//
// Reutiliza de `engine.ts` todo lo que no depende de la economía: el PRNG con semilla, el
// genoma y su mutación, la geometría de masas y el giro. Lo que cambia es **qué se paga y qué se
// cobra**, no la física.
//
// Las tres reglas del proyecto siguen valiendo aquí:
//
// 1. **Ningún gen mejor cuanto más alto.** Por eso el día se paga: sin coste de movimiento el
//    empuje se clavaría en el tope en tres generaciones.
// 2. **Ningún coeficiente inventado.** No hay tope de carga: la comida **pesa**, así que la
//    segunda te frena por la misma aritmética que frena a un bicho grande, y los hijos salen de
//    dividir entre dos lo que traes. Los costes son los mismos que ya usa el otro mundo.
// 3. **Determinismo.** Mismo PRNG, mismo paso fijo, cero trigonométricas en el tick.

import {
  C_BASAL, C_EMPUJE, C_VISION, E_COMIDA, EFICIENCIA, RADIO_COMIDA,
  azarCon, centrado, girar, masaDe, mediana, raizCubica, sig, unidad,
  type Azar,
} from "./engine";

/**
 * Siete genes. Se van dos del otro mundo —`umbral`, que aquí no existe porque criar no es una
 * decisión sino la cuenta de lo que traes, y `aguante`, que frena una vejez que en días no da
 * tiempo a llegar— y entra `retorno`: cuánto tira el borde cuando ya llevas comida. Sin ese
 * peso nadie volvería salvo por azar, y con él puesto a mano sería una regla y no una estrategia.
 */
export const RASGOS_DIA = [
  "empuje", "talla", "vision", "sociabilidad", "audacia", "fiereza", "retorno",
] as const;
export type RasgoDia = (typeof RASGOS_DIA)[number];
export type GenomaDia = Record<RasgoDia, number>;

export type ConfigDia = {
  ancho: number;
  alto: number;
  /** Bocados que amanecen repartidos por el interior. Es el techo de la población. */
  comidas: number;
  censoInicial: number;
  /** Tope de duración del día. El que sigue fuera cuando se acaba, no volvió. */
  ticksDia: number;
  /**
   * Con cuánta energía amanece cada uno, en bocados. **Igual para todos**, y ahí está el freno de
   * la talla: un bocado es un bocado, así que el grande gasta por masa lo que el pequeño y recibe
   * lo mismo. Repartiéndola en proporción a la masa —como estaba— el modelo le daba de comer al
   * gigante y la talla se disparaba a 19 en cuanto sobraba comida, que es un gen mejor cuanto más
   * alto y eso invalida el mundo entero.
   */
  reservaDia: number;
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
  fundador: GenomaDia;
};

export const FUNDADOR_DIA: GenomaDia = {
  empuje: 2, talla: 4.5, vision: 22, sociabilidad: 0, audacia: 1, fiereza: 1, retorno: 1,
};

// Medido en `dia.medir.ts`: con el mundo de 896×640 del otro motor y esta reserva no se llega al
// centro y vuelta —385 ticks de autonomía para 900 px de mundo—, y se extinguen las ocho semillas.
// A la mitad de mundo y con reserva para un día entero, las ocho llegan a los 120 días.
export const CONFIG_DIA: ConfigDia = {
  ancho: 448, alto: 320,
  comidas: 50, censoInicial: 30,
  ticksDia: 800, reservaDia: 8, casa: 24,
  caza: true, boca: 1.2,
  tasa: 0.08, paso: 0.06,
  fundador: FUNDADOR_DIA,
};

export type BichoDia = {
  id: number; idMadre: number; gen: number;
  x: number; y: number; hx: number; hy: number;
  radio: number; masa: number;
  /** Bocados encima. Pesan: entran en la masa que hay que mover. */
  carga: number;
  reserva: number;
  vivo: boolean;
  /** Ya está en casa con al menos un bocado: por hoy ha terminado. */
  aSalvo: boolean;
  /** Crías de esta noche. Vive solo entre el anochecer y el amanecer siguiente: es lo que se pinta. */
  hijos: number;
  /** Nacido en la noche que se está mirando. Se apaga al amanecer, y solo lo usa el pintado. */
  recien: boolean;
  g: GenomaDia;
};

/**
 * Una muerte, guardada lo justo para poder pintarla: dónde, cuándo, de qué tamaño era y con qué
 * tono —la fiereza, que es lo único del genoma que se ve—. Las de `comido` y `hambre` caducan en
 * `MARCA` ticks; las de `fuera` las pone el anochecer y duran lo que dure la noche.
 */
export type Marca = {
  x: number; y: number; r: number; t: number;
  causa: "comido" | "hambre" | "fuera";
  fiereza: number;
};

export type MundoDia = {
  cfg: ConfigDia;
  azar: Azar;
  /** Días completos, que aquí son generaciones: todos crían a la vez. */
  dia: number;
  t: number;
  /** Lo que duró el último día. `t` no vale: amanecer lo pone a cero. */
  duracion: number;
  bichos: BichoDia[];
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
  eva: GenomaDia;
  cuenta: { nacidos: number; hambre: number; fuera: number; comidos: number };
};

/** Masa que hay que mover: la propia más la que llevas encima. La comida pesa lo que vale. */
const masaCargada = (b: BichoDia): number => b.masa + b.carga * E_COMIDA;
const radioCargado = (b: BichoDia): number => raizCubica(masaCargada(b), b.radio);

export function crearDia(semilla: string, cfg: Partial<ConfigDia> = {}): MundoDia {
  const c: ConfigDia = { ...CONFIG_DIA, ...cfg };
  const azar = azarCon(semilla);
  const eva = { ...c.fundador };
  for (const r of RASGOS_DIA) {
    eva[r] = r === "sociabilidad"
      ? eva[r] + centrado(azar) * c.paso * 2
      : eva[r] * (1 + centrado(azar) * 0.12);
  }
  const m: MundoDia = {
    cfg: c, azar, dia: 0, t: 0, duracion: 0, bichos: [], comida: [], siguienteId: 1,
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
function enCasaDelTodo(m: MundoDia): [number, number] {
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
function nacer(m: MundoDia, g: GenomaDia, idMadre: number, gen: number, donde?: [number, number]): BichoDia {
  const [x, y] = donde ?? enCasaDelTodo(m);
  const [hx, hy] = unidad(m.azar);
  const b: BichoDia = {
    id: m.siguienteId++, idMadre, gen, x, y, hx, hy,
    // Nace con la despensa del día ya puesta: `amanecer` se la volverá a dar igual, y así una cría
    // recién nacida no se pinta famélica durante la noche en que se la está mirando.
    radio: g.talla, masa: masaDe(g.talla), carga: 0, reserva: m.cfg.reservaDia * E_COMIDA,
    vivo: true, aSalvo: false, hijos: 0, recien: false, g,
  };
  m.bichos.push(b);
  return b;
}

/**
 * Cuánto se diferencian dos genomas: gen a gen, lo que se separan **en proporción a su tamaño**,
 * promediado. Adimensional a propósito — sin eso la visión, que va en decenas, taparía a la talla
 * y a la audacia, que van en unidades, y "parecerse" acabaría queriendo decir "ver parecido".
 */
export function distancia(a: GenomaDia, b: GenomaDia): number {
  let s = 0;
  for (const r of RASGOS_DIA) {
    const d = Math.abs(a[r] - b[r]), suma = Math.abs(a[r]) + Math.abs(b[r]);
    if (suma > 1e-9) s += d / suma;
  }
  return s / RASGOS_DIA.length;
}

/**
 * Lo lejos que está un bicho corriente del centro de su población, medido con la mediana en los
 * dos pasos. Es la vara de medir el parecido de familia, y **la pone la propia población**: en un
 * mundo de clones vale 0 y no se salva nadie por parecido; en uno partido en dos formas de vida
 * crece, y cada mitad queda protegida de sí misma.
 */
function dispersion(m: MundoDia): number {
  if (m.bichos.length < 2) return 0;
  const centro = {} as GenomaDia;
  for (const r of RASGOS_DIA) centro[r] = mediana(m.bichos.map((b) => b.g[r]));
  return mediana(m.bichos.map((b) => distancia(b.g, centro)));
}

/**
 * Amanece: la comida se reparte de nuevo por el interior y todos abren los ojos **donde los
 * cerraron**, con el mismo rumbo y la despensa llena. Nadie se recoloca: el sitio donde llegaste
 * ayer es tu casa de hoy, y las crías amanecen donde nacieron, al lado de su madre. Un reparto en
 * la línea de salida cada mañana borraría eso, que es lo único que ata un día con el siguiente.
 *
 * **La comida no se acumula de un día para otro** — el mundo no tiene memoria, que es justo lo
 * que este modelo cambia respecto al de energía cerrada.
 */
export function amanecer(m: MundoDia) {
  const c = m.cfg;
  m.t = 0;
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
    b.carga = 0;
    b.aSalvo = false;
    b.hijos = 0;
    b.recien = false;
    b.reserva = c.reservaDia * E_COMIDA;
    // Se sale de casa mirando al campo. No se le elige el rumbo —trae el de ayer— sino que se le
    // refleja la componente que apunta al muro: amanecer contra la pared de tu propia casa es
    // perder la mañana en un rebote, y eso no lo decide ningún gen.
    const [dx, dy] = haciaCasa(m, b);
    if (b.hx * dx + b.hy * dy > 0) { if (dx !== 0) b.hx = -b.hx; else b.hy = -b.hy; }
  }
}

/** Distancia al borde más cercano y hacia dónde está, sin trigonometría. */
function haciaCasa(m: MundoDia, b: BichoDia): [number, number, number] {
  const c = m.cfg;
  const izq = b.x, der = c.ancho - b.x, arr = b.y, aba = c.alto - b.y;
  let d = izq, dx = -1, dy = 0;
  if (der < d) { d = der; dx = 1; dy = 0; }
  if (arr < d) { d = arr; dx = 0; dy = -1; }
  if (aba < d) { d = aba; dx = 0; dy = 1; }
  return [dx, dy, d];
}

/**
 * Los mismos cinco vectores del otro mundo, con el borde cambiado de signo según lleves o no
 * comida: vacío te empuja hacia dentro, cargado te llama a casa con el peso de `retorno`. El
 * arbitraje —"llevo uno y veo otro bocado, ¿vuelvo o me arriesgo?"— no se programa: sale.
 */
function decidirDia(m: MundoDia, b: BichoDia, radioMax: number) {
  const g = b.g;
  let sx = 0, sy = 0;

  const alcanceC = g.vision * RADIO_COMIDA;
  let d2c = alcanceC * alcanceC, cx = 0, cy = 0, hay = false;
  for (const c of m.comida) {
    const dx = c.x - b.x, dy = c.y - b.y, d2 = dx * dx + dy * dy;
    if (d2 < d2c && d2 > 1e-9) { d2c = d2; cx = dx; cy = dy; hay = true; }
  }
  if (hay) { const d = Math.sqrt(d2c); sx += cx / d; sy += cy / d; }

  let mMayor = 0, xMayor = 0, yMayor = 0, mMenor = Infinity, xMenor = 0, yMenor = 0;
  let sumM = 0, sumX = 0, sumY = 0;
  const alcanceB = g.vision * radioMax;
  for (const o of m.bichos) {
    if (o === b || !o.vivo || o.aSalvo) continue;
    const dx = o.x - b.x, dy = o.y - b.y, d2 = dx * dx + dy * dy;
    if (d2 > alcanceB * alcanceB) continue;
    const alcance = g.vision * o.radio;
    if (d2 > alcance * alcance) continue;
    sumM += o.masa; sumX += o.masa * dx; sumY += o.masa * dy;
    if (o.masa > mMayor) { mMayor = o.masa; xMayor = dx; yMayor = dy; }
    if (o.masa < mMenor) { mMenor = o.masa; xMenor = dx; yMenor = dy; }
  }
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
 * Mutación, igual que la del otro mundo: multiplicativa en los positivos y aditiva en el único
 * que lleva signo. Va aparte porque el genoma es otro —siete genes, no ocho— y hacerla genérica
 * costaría más de lo que ahorra mientras esto sea un prototipo.
 */
export function mutarDia(a: Azar, g: GenomaDia, c: ConfigDia): GenomaDia {
  const h: GenomaDia = { ...g };
  for (const r of RASGOS_DIA) {
    const n = centrado(a);
    if (r === "sociabilidad") { h[r] = g[r] + n * c.paso; continue; }
    const f = 1 + Math.abs(n) * c.tasa;
    h[r] = n >= 0 ? g[r] * f : g[r] / f;
    if (h[r] < 1e-6) h[r] = 1e-6;
  }
  return h;
}

function comer(m: MundoDia, dep: BichoDia, presa: BichoDia) {
  dep.reserva += presa.masa * EFICIENCIA;
  dep.carga += presa.carga;
  presa.vivo = false;
  m.marcas.push({ x: presa.x, y: presa.y, r: presa.radio, t: m.t, causa: "comido", fiereza: presa.g.fiereza });
  m.cuenta.comidos++;
}

/** Lo que dura en pantalla una muerte del día, en ticks. Solo la mira el pintado. */
export const MARCA = 14;

/** Si un punto cae en la franja del borde, que es casa. */
const enCasa = (c: ConfigDia, x: number, y: number): boolean =>
  x < c.casa || y < c.casa || x > c.ancho - c.casa || y > c.alto - c.casa;

/**
 * Mover y chocar, siempre rebotando y nunca pegándose: un rumbo clavado contra la pared deja al
 * bicho raspándola el día entero sin decidir nada, y el rebote no es genético — nadie evoluciona
 * a atravesar un muro.
 *
 * Dos paredes. El borde del mundo, para todos. Y la franja de casa, que **de vacío no se entra**
 * —volver es traer algo— pero sí se sale: al amanecer todo el mundo está dentro de ella, que es
 * donde acabó el día anterior, y encerrarlos ahí sería no dejar salir a nadie nunca.
 */
function mover(m: MundoDia, b: BichoDia, v: number) {
  const c = m.cfg;
  const puedeEntrar = b.carga > 0 || enCasa(c, b.x, b.y);
  let x = b.x + b.hx * v, y = b.y + b.hy * v;
  const lim = puedeEntrar ? 0 : c.casa;
  if (x < lim) { x = lim; b.hx = Math.abs(b.hx); }
  else if (x > c.ancho - lim) { x = c.ancho - lim; b.hx = -Math.abs(b.hx); }
  if (y < lim) { y = lim; b.hy = Math.abs(b.hy); }
  else if (y > c.alto - lim) { y = c.alto - lim; b.hy = -Math.abs(b.hy); }
  b.x = x; b.y = y;
}

export function tickDia(m: MundoDia) {
  const c = m.cfg;
  m.t++;
  if (m.marcas.length) m.marcas = m.marcas.filter((z) => m.t - z.t < MARCA);
  let radioMax = 1;
  for (const b of m.bichos) if (b.vivo && !b.aSalvo && b.radio > radioMax) radioMax = b.radio;

  for (const b of m.bichos) {
    if (!b.vivo || b.aSalvo) continue;
    decidirDia(m, b, radioMax);
    const v = b.g.empuje / radioCargado(b);
    mover(m, b, v);

    // El día se paga con los mismos costes que el otro mundo: basal, ver y mover, sobre la masa
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

    // A salvo al llegar a la línea media de la franja, no al pisarla: parándose en su borde
    // interior la población entera acaba el día alineada sobre la misma raya, que es donde no
    // está la casa de nadie.
    const [, , d] = haciaCasa(m, b);
    if (b.carga > 0 && d <= c.casa / 2) b.aSalvo = true;
  }

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
        // Comerse a otro da **dos cosas distintas**, y esa es la gracia: su cuerpo es energía para
        // seguir el día —con la misma eficiencia trófica del otro mundo, el resto se pierde— y su
        // carga cambia de dueño. Solo la carga cuenta para criar, así que el robo es una manera
        // de reproducirse y la caza, solo de aguantar hasta casa.
        if (a.radio >= c.boca * b.radio) { comer(m, a, b); }
        else if (b.radio >= c.boca * a.radio) { comer(m, b, a); break; }
      }
    }
  }

  m.bichos = m.bichos.filter((b) => b.vivo);
  return m.bichos.every((b) => b.aSalvo) || m.t >= c.ticksDia;
}

/**
 * Anochece y se hace la cuenta: el que no volvió muere, el que volvió con uno vive y cada dos
 * bocados dan un hijo. No hay techo de hijos porque no hace falta: traer cuatro exige haber
 * cargado con cuatro todo el camino, y eso ya se paga en el día.
 *
 * **Las crías nacen pegadas a su madre y el mundo se queda parado ahí** (`noche`), sin repartir la
 * comida ni devolver a nadie a la salida: eso lo hace `amanecer`, y quien mira decide cuándo. Es
 * el único momento en que se ve quién ha criado y cuánto.
 */
export function anochecer(m: MundoDia) {
  m.duracion = m.t;
  const vivos: BichoDia[] = [];
  for (const b of m.bichos) {
    if (!b.aSalvo) {
      // El que no volvió se queda a la vista donde le pilló la noche, apagándose mientras al
      // otro lado nacen las crías: el saldo del día, en la misma imagen.
      m.marcas.push({ x: b.x, y: b.y, r: b.radio, t: m.t, causa: "fuera", fiereza: b.g.fiereza });
      m.cuenta.fuera++;
      continue;
    }
    vivos.push(b);
  }
  m.bichos = vivos;
  const madres = [...vivos];
  for (const b of madres) {
    b.hijos = Math.floor(b.carga / 2);
    for (let k = 0; k < b.hijos; k++) {
      const h = nacer(m, mutarDia(m.azar, b.g, m.cfg), b.id, b.gen + 1, [b.x, b.y]);
      const [ux, uy] = unidad(m.azar);
      const d = b.radio + h.radio + 1;
      h.x = b.x + ux * d; h.y = b.y + uy * d;
      h.recien = true;
      m.cuenta.nacidos++;
    }
  }
  m.dia++;
  m.noche = true;
  if (m.bichos.length === 0) m.extinto = true;
}

/** Un día entero: ticks hasta que todos están en casa o se acaba el tiempo, la cuenta y el alba. */
export function correrDia(m: MundoDia) {
  if (m.extinto) return;
  for (;;) if (tickDia(m)) break;
  anochecer(m);
  if (!m.extinto) amanecer(m);
}

export function resumenDia(m: MundoDia) {
  const medianas = {} as GenomaDia;
  for (const r of RASGOS_DIA) {
    const xs = m.bichos.map((b) => b.g[r]).sort((a, b) => a - b);
    medianas[r] = xs.length ? (xs.length % 2 ? xs[xs.length >> 1] : (xs[(xs.length >> 1) - 1] + xs[xs.length >> 1]) / 2) : NaN;
  }
  return { dia: m.dia, censo: m.bichos.length, extinto: m.extinto, medianas, cuenta: m.cuenta };
}
