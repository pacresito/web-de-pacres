// Pintado de evolution en canvas: el mundo entero a escala, la franja de casa, la comida del día
// y cada bicho con su genoma encima. Sin React ni estado propio.
//
// **Solo se codifica lo que es gen o estado energético**, y nunca solo con color: azul→naranja
// es la rampa que sobrevive al daltonismo (verde→rojo es justo la que no), y aun así la fiereza
// se lee también en la forma —el fiero es estrecho y afilado, el pacífico redondo—, así que la
// imagen sigue diciendo lo mismo en blanco y negro.
//
// Lo que **no** se pinta: un arco de visión. El motor ve en todas direcciones —alcance ∝ radio
// del otro, que es tamaño angular—, así que un cono frontal dibujaría un mecanismo que no existe.
// Cuando haya inspector, la visión será un anillo de alcance del bicho que se esté mirando.

import { MARCA, RADIO_COMIDA, type Mundo } from "./engine";

const TAU = Math.PI * 2;

// Las dos proporciones de la silueta, en radios del propio bicho. Aquí arriba y no incrustadas en
// el trazo porque la leyenda tiene que encajar una fila entera a una sola escala, y para eso
// necesita saber hasta dónde llega lo que se va a pintar (ver `extensionCuerpo`).
const COLA = 2.2;   // largo máximo de la estela
const HALO = 2.4;   // hasta dónde llega el aura del sociable

export type Paleta = {
  fondo: string;
  /** Relleno del disco de visión de la leyenda. Tenue: es alcance, no un cuerpo. */
  alcance: string;
  comida: string;
  /**
   * Rampa de fiereza, de cuatro paradas. **Interpolar entre dos extremos no vale**: azul y
   * naranja se cruzan por el gris, y el gris es justo donde cae casi toda la población —la
   * fiereza se mueve alrededor de 1—, así que el mundo entero salía del color del barro. Pasar
   * por el púrpura y el magenta (la familia de `plasma`) mantiene separados los valores medios y
   * no usa el verde, que aquí ya significa comida.
   */
  rampa: [number, number, number][];
  contorno: string;
  halo: [number, number, number];
  tenue: string;
  /** Para lo poco que se escribe encima del mundo: los hijos de cada madre al anochecer. */
  tinta: string;
};

/**
 * Dos paletas propias, una por tema. Aquí el color **es** el dato: no puede virar con la cascada
 * de tokens como la UI genérica, o el mismo genoma diría cosas distintas en claro y en oscuro.
 */
export function paletaDe(tema: "light" | "dark"): Paleta {
  return tema === "dark"
    ? {
        fondo: "#12100e", alcance: "rgba(150,180,120,0.10)", comida: "#6f9440",
        rampa: [[86, 122, 235], [150, 80, 200], [222, 92, 148], [250, 150, 60]],
        contorno: "rgba(255,255,255,0.55)", halo: [255, 255, 255], tenue: "rgba(255,255,255,0.16)",
        tinta: "#e8e2d6",
      }
    : {
        fondo: "#efe9dd", alcance: "rgba(90,130,60,0.10)", comida: "#8aa762",
        rampa: [[28, 62, 168], [116, 40, 158], [196, 44, 110], [214, 104, 24]],
        contorno: "rgba(0,0,0,0.45)", halo: [0, 0, 0], tenue: "rgba(0,0,0,0.14)",
        tinta: "#2a2622",
      };
}

/**
 * El mundo tiene tamaño fijo y el lienzo no, así que la vista escala y centra en vez de estirar:
 * la semilla promete el mismo mundo en cualquier pantalla, y un mundo que midiera lo que mide la
 * ventana daría partidas distintas en el móvil y en el portátil.
 */
export type Vista = { escala: number; ox: number; oy: number };

export function vistaDe(W: number, H: number, ancho: number, alto: number): Vista {
  const escala = Math.min(W / ancho, H / alto);
  return { escala, ox: (W - ancho * escala) / 2, oy: (H - alto * escala) / 2 };
}

/** A [0,1] por saturación, sin techo inventado: `x/(1+x)`, que en 1 vale 0,5. */
const sat = (x: number): number => x / (1 + x);

/**
 * La misma saturación, **estirada donde vive la población**. Sin esto casi todo el mundo cae en el
 * mismo punto de la rampa y dos genomas distintos se pintan igual: la fiereza se mueve alrededor
 * de 1, donde `sat` apenas tiene pendiente, y la sociabilidad alrededor de 0, donde le sobra
 * recorrido. Es contraste, no dato: el fundador sigue cayendo en el centro y el mismo gen da
 * siempre el mismo color, así que dos días distintos se pueden comparar.
 */
const satFiereza = (f: number): number => sat(f * f * f);
const satSoc = (s: number): number => sat(3 * s);

function tono(p: Paleta, fiereza: number, vigor: number, fondo: [number, number, number]): string {
  const t = satFiereza(fiereza) * (p.rampa.length - 1);
  const i = Math.min(p.rampa.length - 2, Math.floor(t)), f = t - i;
  const a = p.rampa[i], b = p.rampa[i + 1];
  // `vigor` (reserva sobre su capacidad) desvanece hacia el fondo, no hacia un gris: el famélico
  // se apaga como si el mundo se lo estuviera tragando, y el tono —que es el gen— no cambia.
  const k = 0.5 + 0.5 * vigor;
  const c = (j: number) => Math.round((a[j] + (b[j] - a[j]) * f) * k + fondo[j] * (1 - k));
  return `rgb(${c(0)},${c(1)},${c(2)})`;
}

/** El fondo en canales, para desvanecer contra él. `#rrggbb` — no hay otro formato en la paleta. */
function canales(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Lo que hace falta para pintar un bicho, venga del mundo que venga: dónde está, hacia dónde va, y los dos genes que se ven. */
export type Cuerpo = {
  x: number; y: number; hx: number; hy: number; radio: number;
  g: { fiereza: number; sociabilidad: number; empuje: number };
};

/**
 * Un bicho: elipse orientada al rumbo, **inscrita en su radio de colisión** —el cuerpo dibujado
 * nunca sobresale del que el motor usa para chocar y para comer—, con la proa marcada.
 *
 * · tamaño = masa actual · tono y estrechez = fiereza · claridad = reserva
 * · halo = sociabilidad: aura si es positiva (buscar compañía), anillo duro si es negativa (huir de ella)
 *
 * El `vigor` —reserva sobre lo que le cabe, en [0,1]— lo calcula quien llama: pintar una muestra
 * de leyenda no tiene por qué saber de despensas, y quien pinta el mundo sí.
 */
export function pintarCuerpo(ctx: CanvasRenderingContext2D, b: Cuerpo, vigor: number, p: Paleta) {
  const fiereza = satFiereza(b.g.fiereza);
  const estrechez = 1 - 0.55 * fiereza;           // el fiero es afilado; el pacífico, redondo
  const soc = b.g.sociabilidad;
  const color = tono(p, b.g.fiereza, vigor, canales(p.fondo));

  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.transform(b.hx, b.hy, -b.hy, b.hx, 0, 0);   // rotar por el rumbo: sin ángulos ni trigonometría

  // Estela: lo que corre este cuerpo, que es empuje partido por lo que hay que mover. La velocidad
  // solo se ve mirando un rato y comparando, y lo que se compara son dos bichos a la vez.
  //
  // **Medida en radios, no en píxeles.** La velocidad va con 1/radio, así que en píxeles la cola
  // de un enano rápido crece sin fin: se veía el mundo lleno de tallos más largos que su bicho.
  // Saturada contra el propio cuerpo dice lo mismo —quien corre más, más cola— y nunca se lo come.
  const largo = b.radio * COLA * sat(b.g.empuje / b.radio);
  if (largo > 0.5) {
    // Triángulo y no una línea con la punta redonda: a cinco píxeles esa punta es un circulito
    // que parece perseguir al bicho, y lo que tiene que leerse es una cola que se va apagando.
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.22;
    ctx.beginPath();
    ctx.moveTo(-b.radio * 0.5, b.radio * 0.42);
    ctx.lineTo(-b.radio - largo, 0);
    ctx.lineTo(-b.radio * 0.5, -b.radio * 0.42);
    ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
  }

  if (soc > 0) {
    const a = Math.min(0.34, satSoc(soc) * 0.5);
    const halo = ctx.createRadialGradient(0, 0, b.radio * 0.8, 0, 0, b.radio * HALO);
    halo.addColorStop(0, `rgba(${p.halo[0]},${p.halo[1]},${p.halo[2]},${a.toFixed(3)})`);
    halo.addColorStop(1, `rgba(${p.halo[0]},${p.halo[1]},${p.halo[2]},0)`);
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(0, 0, b.radio * HALO, 0, TAU); ctx.fill();
  }

  // Anillo del color del fondo antes del cuerpo: son decenas de bichos contra cientos de bocados,
  // y sin despegarlos del fondo la mirada solo ve la alfombra de comida. No codifica nada — es
  // separación, como el filete blanco de un mapa entre dos países del mismo color.
  ctx.strokeStyle = p.fondo;
  ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.ellipse(0, 0, b.radio + 0.7, b.radio * estrechez + 0.7, 0, 0, TAU); ctx.stroke();

  ctx.fillStyle = color;
  ctx.beginPath(); ctx.ellipse(0, 0, b.radio, b.radio * estrechez, 0, 0, TAU); ctx.fill();

  if (soc < 0) {                                   // el huraño se marca con un borde duro
    ctx.strokeStyle = p.contorno;
    ctx.lineWidth = Math.min(1.6, 0.4 + satSoc(-soc) * 1.6);
    ctx.beginPath(); ctx.ellipse(0, 0, b.radio, b.radio * estrechez, 0, 0, TAU); ctx.stroke();
  }

  // Proa: el rumbo tiene que verse también en un bicho redondo, o la mitad de la población
  // parece quieta. Es un punto claro, no una flecha: a cinco píxeles una flecha es un borrón.
  ctx.fillStyle = `rgba(255,255,255,${(0.35 + 0.45 * vigor).toFixed(2)})`;
  ctx.beginPath(); ctx.arc(b.radio * 0.45, 0, Math.max(0.6, b.radio * 0.22), 0, TAU); ctx.fill();
  ctx.restore();
}

// ─── Muestras de leyenda ──────────────────────────────────────────────────────
//
// La leyenda no dibuja bichos: los pide. Todo lo que enseña sale de `pintarCuerpo` y de las
// constantes del motor, así que el día que cambie la forma del bicho o el alcance de la visión,
// la leyenda cambia con ellos. Una silueta escrita aparte miente en silencio en cuanto alguien
// toque el pintado del mundo — y una leyenda que miente es peor que no tenerla.

/** El lienzo, en píxeles CSS `W`×`H` con `dpr` de dispositivo, con el fondo del mundo puesto. */
function lienzo(ctx: CanvasRenderingContext2D, W: number, H: number, dpr: number, p: Paleta) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = p.fondo;
  ctx.fillRect(0, 0, W, H);
}

/**
 * Un bicho suelto, centrado y a la escala que se le diga. `escala` la fija quien pinta la fila
 * entera y es **la misma para las tres muestras**: si cada celda se ajustara a lo suyo, la fila
 * de la talla enseñaría tres bichos del mismo tamaño, que es justo lo contrario de lo que dice.
 */
export function pintarMuestra(
  ctx: CanvasRenderingContext2D, W: number, H: number, dpr: number, p: Paleta,
  g: Cuerpo["g"], radio: number, escala: number, vigor = 1,
) {
  lienzo(ctx, W, H, dpr, p);
  const e = escala * dpr;
  ctx.setTransform(e, 0, 0, e, (W / 2) * dpr, (H / 2) * dpr);
  pintarCuerpo(ctx, { x: 0, y: 0, hx: 1, hy: 0, radio, g }, vigor, p);
}

/**
 * La visión, contra el mundo entero: el rectángulo del mundo a escala, el bicho en el centro y el
 * disco hasta donde detecta un bocado —`visión · RADIO_COMIDA`, el mismo alcance que usa
 * `decidir`—. Dos discos: el del fundador y el de la población de ahora, para que se vea si el
 * gen se ha movido y hacia dónde.
 *
 * Es la única forma de contestar la pregunta que importa de este gen, que no es cuánto vale sino
 * cuánto vale **comparado con el mundo**: si un bicho ve el mundo entero, moverse no es una
 * decisión; si no ve nada, todo es paseo aleatorio.
 */
export function pintarAlcance(
  ctx: CanvasRenderingContext2D, W: number, H: number, dpr: number, p: Paleta,
  ancho: number, alto: number, radio: number, visionEva: number, visionHoy: number | null,
) {
  lienzo(ctx, W, H, dpr, p);
  const escala = Math.min((W - 2) / ancho, (H - 2) / alto);
  const e = escala * dpr;
  ctx.setTransform(e, 0, 0, e, ((W - ancho * escala) / 2) * dpr, ((H - alto * escala) / 2) * dpr);
  const fino = 1 / escala;

  ctx.strokeStyle = p.tenue;
  ctx.lineWidth = fino;
  ctx.strokeRect(0, 0, ancho, alto);

  const cx = ancho / 2, cy = alto / 2;
  const disco = (v: number, relleno: boolean, guiones: boolean) => {
    ctx.beginPath();
    ctx.arc(cx, cy, v * RADIO_COMIDA, 0, TAU);
    if (relleno) { ctx.fillStyle = p.alcance; ctx.fill(); }
    ctx.setLineDash(guiones ? [4 * fino, 4 * fino] : []);
    ctx.strokeStyle = p.comida;
    ctx.lineWidth = fino * (guiones ? 1 : 1.6);
    ctx.stroke();
    ctx.setLineDash([]);
  };
  disco(visionEva, false, true);
  if (visionHoy !== null) disco(visionHoy, true, false);

  ctx.fillStyle = p.contorno;
  ctx.beginPath(); ctx.arc(cx, cy, Math.max(radio, 1.5 * fino), 0, TAU); ctx.fill();
}

/**
 * Hasta dónde llega, en unidades de mundo, lo que `pintarCuerpo` acaba de dibujar: el cuerpo, su
 * estela o su aura, lo que sobresalga más. Lo usa la leyenda para encajar las tres muestras de
 * una fila **a una sola escala** — ajustando cada celda a lo suyo, la fila de la talla enseñaría
 * tres bichos del mismo tamaño, que es lo contrario de lo que esa fila dice.
 */
export function extensionCuerpo(g: Cuerpo["g"], radio: number): number {
  const cola = radio + radio * COLA * sat(g.empuje / radio);
  return Math.max(cola, g.sociabilidad > 0 ? radio * HALO : radio);
}

/**
 * El mundo entero, en un lienzo de `W`×`H` px CSS con `dpr` píxeles de dispositivo por cada uno.
 * No hay suelo que pintar —la comida amanece y se acaba, el mundo no recuerda nada—, así que
 * sobre el cuerpo de cada bicho solo se añade lo que decide la partida: **dónde está casa** (la
 * franja del perímetro) y **cuánto lleva encima cada uno**, que es de lo que salen los hijos al
 * anochecer.
 */
export function pintar(ctx: CanvasRenderingContext2D, m: Mundo, p: Paleta, v: Vista, W: number, H: number, dpr: number, noche = 1) {
  const c = m.cfg;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = p.fondo;
  ctx.fillRect(0, 0, W, H);
  const e = v.escala * dpr;
  ctx.setTransform(e, 0, 0, e, v.ox * dpr, v.oy * dpr);

  // Casa, en gris de estructura y no en el verde de la comida: no es un recurso, es el borde
  // donde se amanece y donde hay que estar al anochecer. Se pinta dos veces, así que **la mitad
  // exterior queda más oscura**: esa es la meta —donde uno está a salvo—, y la interior, el zaguán
  // por el que se pasa. Sin ese segundo tono la franja no dice dónde hay que llegar.
  const franja = (w: number) => {
    ctx.fillRect(0, 0, c.ancho, w);
    ctx.fillRect(0, c.alto - w, c.ancho, w);
    ctx.fillRect(0, w, w, c.alto - 2 * w);
    ctx.fillRect(c.ancho - w, w, w, c.alto - 2 * w);
  };
  ctx.fillStyle = p.tenue;
  franja(c.casa);
  franja(c.casa / 2);

  ctx.fillStyle = p.comida;
  for (const f of m.comida) { ctx.beginPath(); ctx.arc(f.x, f.y, RADIO_COMIDA, 0, TAU); ctx.fill(); }

  // Las muertes, debajo de los vivos. Comido es un anillo que se abre —el zarpazo— y el hambre es
  // el cuerpo apagándose y encogiendo, que es lo que se ve cuando alguien se para y ya no vuelve a
  // moverse. El que se quedó fuera al anochecer no está aquí: no muere, así que se sigue pintando
  // vivo donde le pilló la noche.
  const [zr, zg, zb] = p.rampa[p.rampa.length - 1];
  const fondo = canales(p.fondo);
  for (const z of m.marcas) {
    const k = (m.t - z.t) / MARCA;
    if (k < 0 || k > 1) continue;
    if (z.causa === "comido") {
      ctx.strokeStyle = `rgba(${zr},${zg},${zb},${(1 - k).toFixed(2)})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(z.x, z.y, z.r * (1 + 3 * k), 0, TAU); ctx.stroke();
      continue;
    }
    ctx.globalAlpha = (1 - k) * 0.85;
    ctx.fillStyle = tono(p, z.fiereza, 0, fondo);
    ctx.beginPath(); ctx.arc(z.x, z.y, z.r * (1 - 0.65 * k), 0, TAU); ctx.fill();
    // Y el aro del depósito cerrándose con él: lo que se acabó fue eso.
    ctx.strokeStyle = p.tinta;
    ctx.globalAlpha = (1 - k) * 0.4;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(z.x, z.y, (z.r + 2.2) * (1 - 0.5 * k), 0, TAU); ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // Una cría no aparece hecha: durante la primera parte de la noche crece desde nada hasta su
  // tamaño, con el anillo del parto abriéndose a su alrededor. Es lo único que se anima aquí, y se
  // anima porque nacer es justo lo que no se veía.
  const brote = Math.min(1, noche / 0.6);
  for (const b of m.bichos) {
    // La despensa llena va con la masa, así que el aro de cada uno se mide contra la suya: un
    // grande a medio gas y un pequeño a medio gas se pintan igual de apagados, que es lo justo.
    const vigor = Math.max(0, Math.min(1, b.reserva / (c.capReserva * b.masa)));
    if (b.recien && m.noche) {
      if (brote > 0.02) pintarCuerpo(ctx, { ...b, radio: b.radio * brote }, vigor, p);
      if (brote < 1) {
        ctx.strokeStyle = p.comida;
        ctx.globalAlpha = 1 - brote;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(b.x, b.y, b.radio * (0.5 + 2.5 * brote), 0, TAU); ctx.stroke();
        ctx.globalAlpha = 1;
      }
      continue;
    }
    pintarCuerpo(ctx, b, vigor, p);

    // Fuera, la energía; dentro, la comida. El aro es un depósito que se vacía a lo largo del día
    // —arranca completo y va perdiendo arco— y los puntos son bocados que se acumulan, así que la
    // misma mirada ve lo que se gasta y lo que se gana sin confundirlos.
    if (vigor > 0) {
      ctx.strokeStyle = p.tinta;
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radio + 2.2, -Math.PI / 2, -Math.PI / 2 + TAU * vigor);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    if (b.carga <= 0) continue;
    // En fila sobre su eje mayor, que es el rumbo: ahí caben dentro del cuerpo esté como esté
    // girado. Tres como mucho, que es lo que se cuenta de un vistazo.
    const n = Math.min(3, b.carga), rp = Math.max(0.6, b.radio * 0.2);
    ctx.fillStyle = p.comida;
    for (let i = 0; i < n; i++) {
      const t = (i - (n - 1) / 2) * b.radio * 0.5;
      ctx.beginPath(); ctx.arc(b.x + b.hx * t, b.y + b.hy * t, rp, 0, TAU); ctx.fill();
    }
  }

  // De noche, lo único que se escribe encima del mundo: cuántas crías ha puesto cada madre, al
  // lado del montón que acaba de aparecer a su alrededor.
  if (m.noche) {
    ctx.font = "bold 9px ui-monospace, monospace";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 2.5;
    ctx.lineJoin = "round";
    ctx.strokeStyle = p.fondo;   // filete del color del fondo: el número cae encima de lo que sea
    for (const b of m.bichos) {
      if (b.hijos <= 0) continue;
      const t = `+${b.hijos}`, x = b.x + b.radio + 2, y = b.y - b.radio - 2;
      ctx.strokeText(t, x, y);
      ctx.fillStyle = p.tinta;
      ctx.fillText(t, x, y);
    }
  }

  ctx.strokeStyle = p.tenue;
  ctx.lineWidth = 1 / v.escala;
  ctx.strokeRect(0, 0, c.ancho, c.alto);
}
