"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import TerminalShell from "../../components/TerminalShell";
import WhyFooter from "../../components/WhyFooter";
import { useTema } from "../../components/usePersistedTheme";
import { CONFIG, RASGOS, TABLA, amanecer, anochecer, copiar, crearMundo, tick, type Bicho, type Mundo } from "./engine";
import Leyenda from "./leyenda";
import Diario from "./diario";
import Tira from "./tira";
import Estratos from "./estratos";
import Inspector from "./inspector";
import Reglas from "./reglas";
import { designFor, paletaDe, pintar, vistaDe, vistaSobre, type Design, type Paleta, type Vista as Camara } from "./render";
import { crearHistoria, registrar, type Historia } from "./reparto";
import { crearDiario, narrar, olvidar, type Diario as Cronica, type Evento } from "./narrador";
import { IconoInfo, IconoPantallaCompleta } from "../../components/Iconos";
import BarraEstado from "../../components/BarraEstado";

// Cuántos ticks se intentan por fotograma. Es un objetivo, no una promesa: el bucle corta por
// presupuesto de tiempo (abajo), así que en un mundo lleno x64 va tan rápido como dé la máquina.
// Que corte no toca el determinismo — el mundo depende de cuántos ticks ha dado, no de cuándo.
/**
 * Ticks por fotograma. **×1 es un tick por fotograma**, y eso deja el día en unos diecisiete
 * segundos: es la velocidad de mirar a un bicho concreto e ir siguiéndolo, que es para lo que está
 * el ×1. Para ver pasar generaciones están las otras dos. El motor no es el límite —un tick cuesta
 * 0,2 µs, así que en el presupuesto de abajo caben cincuenta mil—: lo es el ojo.
 */
const VELOCIDADES = [-1, 1, 8, 64] as const;
const NORMAL = VELOCIDADES.indexOf(1);
/**
 * Cada cuántos ticks se guarda un hito del día que se está rebobinando. **El motor no va hacia
 * atrás**: ir a un tick anterior es volver a vivir el día desde su amanecer, y con el censo lleno
 * eso son siete milisegundos —medio fotograma— por cada tick que se desanda. Con los hitos, cada
 * fotograma revive un tramo y no un día: dos décimas de milisegundo. Los guarda la primera pasada,
 * que es la que ya está reviviendo el día entero, y se tiran al cambiar de día.
 */
const TRAMO = 25;
const PRESUPUESTO_MS = 12;   // por fotograma, para que la interfaz siga respondiendo a 60 fps
const SALTO_DIAS = 100;      // lo que adelanta el botón de saltar días
const RETROCESO = 10;        // lo que echa atrás el botón de volver
/**
 * Amaneceres guardados: seis retrocesos seguidos. Solo harían falta `RETROCESO`, pero volver una
 * vez y quedarse sin historia es peor que no poder volver — y cada amanecer es una copia del mundo
 * entero, que con censos de decenas son kilobytes. Solo con censos de cientos llega a megas, y ahí
 * lo que manda es cuánto quieres poder deshacer, no la memoria.
 */
const HISTORIA = 60;
/**
 * Milisegundos que el mundo se queda parado al anochecer, para ver nacer a las crías — **a ×1**.
 * Las velocidades lo dividen: si no, ×64 adelanta los días a toda prisa y luego se planta 1,3 s en
 * cada noche, que es donde se iba casi todo el tiempo de mirar. Es reloj de pared, no de mundo,
 * así que no toca el determinismo: el mundo depende de cuántos ticks ha dado, no de cuándo.
 */
const PAUSA_NOCHE = 1500;

// **La de por defecto se elige mirándola**: clima de en medio, viva a los trescientos días y con
// población de sobra para que la tira diga algo desde el principio. No vale cualquiera que no se
// extinga — una que sobrevive con cuatro bichos abre la página en un mundo que no se mueve.
const SEMILLA_POR_DEFECTO = "marea";

/**
 * Lo que se puede tener abierto, que es una cosa o ninguna. `poblacion` va debajo del mundo y las
 * otras son paneles encima, pero todas compiten por el mismo alto: el del lienzo. Dos no tienen
 * botón de texto porque se abren desde donde se miran: el diario desde su carril, que está siempre
 * a la vista, y las reglas desde su icono.
 *
 * **El bicho no es una vista**, aunque su panel viva donde ellas: no se abre, se marca — y lo
 * marcado dura lo que dure la marca, no lo que dure un panel. Cuelga de `sel` y se pinta siempre
 * que el mundo se vea, que es donde la marca significa algo.
 */
type Vista = "leyenda" | "poblacion" | "partida" | "diario" | "reglas" | null;
const VISTAS: [Vista, string][] = [["leyenda", "leyenda"], ["poblacion", "población"], ["partida", "la partida"]];

/**
 * Margen de acierto al pulsar un bicho, **en píxeles de pantalla y no en unidades de mundo**: lo
 * que tiene que caber es un dedo, y un dedo mide lo mismo esté la cámara donde esté.
 */
const TACTO = 9;
/**
 * Lo que la cámara recorta por fotograma de lo que le falta para estar donde debe. Suaviza dos
 * cosas a la vez: el salto al elegir a alguien y el temblor de seguir a quien anda. **Solo se
 * suaviza el desplazamiento, nunca la escala** — el suelo se cuece a la escala que se pinta, así
 * que una escala que se mueva por centésimas rehace mil quinientas figuras en cada fotograma.
 */
const SEGUIMIENTO = 0.14;
/**
 * Lo que la cámara se queda **después** de que no quede cuerpo que mirar, en ms de reloj de pared.
 * Sin ella, el bicho desaparece del censo y el mismo fotograma devuelve la vista al mundo entero:
 * lo último que se ve del que llevabas media partida mirando es un salto hacia atrás.
 *
 * **Es una cola y no un plazo fijo**, porque el cuerpo se disuelve en ticks y la cámara espera en
 * segundos: contando desde la muerte, los cinco segundos que a ×1 cubren la noche, la disolución y
 * un respiro se convertían a ×64 en cinco segundos de suelo vacío con treinta días pasando por
 * detrás. Siguiendo al cuerpo, la espera dura lo que dura lo que hay que ver, a la velocidad que
 * sea — y en pausa no se acaba nunca, que es justo lo que se quiere al pararse a mirar un muerto.
 *
 * Es tiempo de quien mira y no del mundo, así que corre igual en pausa y no toca el determinismo.
 */
const COLA = 2000;

const ACENTO = (x: string | number) => `<span style="color:var(--t-accent)">${x}</span>`;
const ETQ = (x: string) => `<span class="be-etq">${x}</span>`;

/**
 * Cuánto lleva corrida la noche en curso, en reloj de pared. Lo lleva la página y no el motor,
 * que no sabe de milisegundos ni debe: adelantando 100 días no hay nadie mirando.
 */
type Noche = { fin: number; dura: number };

/**
 * Un paso de reloj. El tick es siempre el mismo; quien sabe cuándo se acaba el día es el motor,
 * que lo cierra en cuanto están todos en casa o se agota la jornada. **La noche se queda a la
 * vista un momento** —las crías nacen pegadas a su madre y sin esa parada no se ven nunca—, y esa
 * parada dura menos cuanto más rápido va el mundo: segundo y medio a ×1, dos décimas a ×8.
 * `saltando` avisa de que nadie está mirando: ahí no hay pausa que valga.
 */
function paso(m: Mundo, saltando: boolean, vel: number, noche: Noche): boolean {
  if (m.extinto) return false;
  if (m.noche) {
    if (!saltando && performance.now() < noche.fin) return false;
    amanecer(m);
    return true;   // acaba de empezar un día: es donde se puede volver
  }
  if (tick(m)) {
    anochecer(m);
    noche.dura = PAUSA_NOCHE / vel;
    noche.fin = performance.now() + noche.dura;
  }
  return false;
}

/** La línea de estado, en HTML y una vez por fotograma. De noche cuenta lo que se acaba de ver. */
function linea(m: Mundo): string {
  if (m.noche) {
    let crias = 0, madres = 0;
    for (const b of m.bichos) if (b.hijos > 0) { crias += b.hijos; madres++; }
    const cria = crias === 1 ? "cría" : "crías", madre = madres === 1 ? "madre" : "madres";
    return `anochece · ${ACENTO(`${crias} ${cria}`)} de ${madres} ${madre} · ${ETQ("censo")} ${m.bichos.length}`;
  }
  return `${ETQ("día")} ${ACENTO(m.dia)} · ${ETQ("censo")} ${m.bichos.length} · ${ETQ("viajes")} ${m.viajes}` +
    ` · ${ETQ("comida")} ${m.comida.length} · ${ETQ("tick")} ${m.t}`;
}


const ExpandIcon = () => <IconoPantallaCompleta size={14} />;
const CollapseIcon = () => <IconoPantallaCompleta size={16} salir />;

export default function Evolution() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const mundoRef = useRef<Mundo | null>(null);
  const nocheRef = useRef<Noche>({ fin: 0, dura: PAUSA_NOCHE });
  // Los últimos amaneceres, del más viejo al más nuevo. El mundo es determinista, así que volver
  // atrás también se podría hacer resembrando y corriendo hasta el día que toca — pero eso crece
  // con la partida y a los doscientos días son segundos de espera. Copiar el mundo es constante.
  const historiaRef = useRef<Mundo[]>([]);
  /**
   * El reparto de cada día, que es lo que mira el panel de estratos. **Se registra en el bucle y no
   * al abrirlo**: rehacerlo al abrir exigiría revivir la partida entera, y lo que cuesta guardarlo
   * es kilobyte y medio por día. Sobrevive a volver atrás sin ayuda —`registrar` corta el futuro
   * que ya no va a ocurrir—, así que aquí no hay nada que deshacer.
   */
  const repartoRef = useRef<Historia>(crearHistoria());
  /**
   * El diario de la partida y la última línea que escribió. Va con el reparto —se narra en el
   * mismo amanecer en que se registra— y se corta solo al volver atrás: lo único que hay que
   * hacerle desde aquí es tirarlo cuando se siembra otro mundo.
   */
  const cronicaRef = useRef<Cronica>(crearDiario());
  const ultimoRef = useRef<Evento | null>(null);
  const hayAtrasRef = useRef(false);   // espejo de `historiaRef.length > 0`, para poder pintar el botón
  /**
   * El bicho que se está mirando, por id, o `0`. Va en un ref además de en estado porque quien lo
   * usa en cada fotograma es el bucle, que no re-renderiza nada.
   */
  const selRef = useRef(0);
  /**
   * Dónde está la cámara ahora mismo, que no es dónde debería —va detrás, ver `SEGUIMIENTO`—. Y es
   * también lo que convierte un clic en coordenadas del mundo: lo que se pulsa es lo que se ve.
   */
  const camRef = useRef<Camara | null>(null);
  /**
   * Dónde está el marcado y hasta cuándo se le espera ahí. `hasta` en 0 es que sigue vivo: la
   * cámara le hace el seguimiento y no hay plazo que contar. **La marca no se suelta al morir**
   * —el panel sigue contando quién fue— y quien vuelve atrás lo encuentra vivo otra vez, así que
   * la espera se rehace sola.
   */
  const esperaRef = useRef<{ id: number; x: number; y: number; hasta: number } | null>(null);
  const rafRef = useRef(0);
  const sizeRef = useRef({ W: 0, H: 0 });
  const dprRef = useRef(1);
  // Dos sitios donde sale la línea de estado —la de la página y la de la barra que flota en
  // pantalla completa—, y las dos se escriben en el mismo sitio del bucle: sin esto, en pantalla
  // completa no hay ni día ni censo, que es lo único que dice si la partida avanza.
  const estadoRef = useRef<HTMLSpanElement>(null);
  const estadoFsRef = useRef<HTMLSpanElement>(null);
  // La última línea del diario, escrita desde el bucle y solo cuando cambia: es texto que se
  // queda quieto días enteros. El sello arranca con un valor que ningún evento puede tener, para
  // que la primera vuelta escriba el carril aunque todavía no haya pasado nada.
  const ultimoElRef = useRef<HTMLSpanElement>(null);
  const ultimoPintadoRef = useRef("?");
  const paletaRef = useRef<Paleta>(paletaDe(SEMILLA_POR_DEFECTO, "light"));
  const disenoRef = useRef<Design>(designFor(SEMILLA_POR_DEFECTO));
  const corriendoRef = useRef(true);
  const velRef = useRef<number>(VELOCIDADES[NORMAL]);
  /**
   * Los hitos del día que se rebobina, uno cada `TRAMO` ticks desde su amanecer. Es caché y no
   * estado: se tira entera en cuanto el mundo cambia por cualquier otro camino —sembrar, volver,
   * adelantar—, porque un hito del día 12 de otra partida es el día 12 de otro mundo.
   */
  const rebRef = useRef<{ dia: number; hitos: Mundo[] } | null>(null);
  const saltoRef = useRef(0);          // día objetivo mientras se adelanta; 0 = no se adelanta
  const repintarRef = useRef(true);    // el mundo cambió sin que corra el reloj: hay que repintar

  const [semilla, setSemilla] = useState(SEMILLA_POR_DEFECTO);
  const [texto, setTexto] = useState(SEMILLA_POR_DEFECTO);
  const [corriendo, setCorriendo] = useState(true);
  const [velIdx, setVelIdx] = useState(NORMAL);
  const [saltando, setSaltando] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  /**
   * **Lo que está abierto, que es uno o ninguno.** Los tres paneles se pintan sobre el mismo
   * lienzo y la tira le quita el alto a ese mismo lienzo, así que abrirlos a la vez es repartirse
   * un sitio que no da para dos: con la tira abierta un bicho de la leyenda mide ocho píxeles y
   * pierde las púas que esa misma leyenda está explicando. Uno cada vez, y cerrar es abrir otro.
   */
  const [vista, setVista] = useState<Vista>(null);
  const [sel, setSel] = useState(0);
  const [hayAtras, setHayAtras] = useState(false);
  const tema = useTema();
  // El fundador, que es el mismo en todas las semillas: la referencia quieta contra la que se lee
  // la población no se mueve al sembrar, así que dos partidas se comparan sobre la misma raya.
  const eva = CONFIG.fundador;

  useEffect(() => { corriendoRef.current = corriendo; }, [corriendo]);
  useEffect(() => { velRef.current = VELOCIDADES[velIdx]; }, [velIdx]);
  // **La semilla elige el diseño**, así que sembrar cambia de qué están hechos los bichos y el
  // suelo bajo sus pies. Paleta y diseño viajan juntos: una paleta sin su diseño pinta un cristal
  // con los colores del papel.
  useEffect(() => {
    disenoRef.current = designFor(semilla);
    paletaRef.current = paletaDe(semilla, tema ?? "light");
    repintarRef.current = true;
  }, [semilla, tema]);

  // La semilla de la URL manda sobre la de por defecto: un enlace lleva a un mundo concreto, que
  // es de lo que sirve que la semilla sea una palabra. Se lee del `location` y no de
  // `useSearchParams` para no arrastrar el Suspense que este pide en el prerender.
  //
  // **Y una sola vez de verdad, con un ref que sobreviva al montaje doble de StrictMode.** El
  // efecto de sembrar reescribe la query, así que una segunda lectura no lee el enlace del
  // visitante: lee lo que acabamos de escribir, y la semilla compartida se pierde a favor de la
  // de por defecto. Con `[]` no basta — en desarrollo eso corre dos veces.
  const urlLeidaRef = useRef(false);
  useEffect(() => {
    if (urlLeidaRef.current) return;
    urlLeidaRef.current = true;
    const s = new URLSearchParams(window.location.search).get("semilla");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- init en mount: en el servidor no hay URL que leer
    if (s) { setSemilla(s); setTexto(s); }
  }, []);

  // Sembrar: mundo nuevo, y la semilla a la URL sin apilar una entrada de historial por tecla.
  useEffect(() => {
    const m = crearMundo(semilla);
    mundoRef.current = m;
    historiaRef.current = [];
    rebRef.current = null;
    repartoRef.current = crearHistoria();
    cronicaRef.current = crearDiario();
    ultimoRef.current = null;
    ultimoPintadoRef.current = "?";
    nocheRef.current = { fin: 0, dura: PAUSA_NOCHE };
    repintarRef.current = true;
    const url = new URL(window.location.href);
    url.searchParams.set("semilla", semilla);
    window.history.replaceState(null, "", url);
  }, [semilla]);

  /** Marcar bicho, o soltar al que hubiera con `0`. Solo la marca: quién se mira no cambia. */
  const marcar = useCallback((id: number) => {
    selRef.current = id;
    setSel(id);
    repintarRef.current = true;
  }, []);

  /**
   * Marcar al que se pulsa, o soltarlo si ya lo estaba. **Pulsar dos veces suelta** en los dos
   * sitios donde se pulsa un bicho —el mundo y la tira—, porque en los dos sigue ahí después de
   * pulsarlo: si el gesto no se pudiera deshacer donde se hizo, soltar obligaría a buscar la
   * aspa del panel.
   */
  const alternar = useCallback((id: number) => {
    marcar(id === selRef.current ? 0 : id);
  }, [marcar]);

  const sembrar = useCallback(() => {
    const s = texto.trim();
    if (!s) return;
    // Sembrar cancela el salto en curso, y lo hace aquí y no en el efecto: al montar no hay
    // ninguno, así que el efecto solo tendría un `setState` que no cambia nada.
    saltoRef.current = 0;
    setSaltando(false);
    // El bicho que se estaba mirando no sobrevive a sembrar: el mundo nuevo reparte los mismos
    // ids entre otros bichos, así que dejarlo puesto sería seguir a un desconocido.
    if (selRef.current) marcar(0);
    if (s === semilla) {          // misma palabra = mismo mundo: reinicia
      mundoRef.current = crearMundo(s);
      historiaRef.current = [];
      rebRef.current = null;
      repartoRef.current = crearHistoria();
      cronicaRef.current = crearDiario();
      ultimoRef.current = null;
    ultimoPintadoRef.current = "?";
      nocheRef.current = { fin: 0, dura: PAUSA_NOCHE };
    } else setSemilla(s);
    repintarRef.current = true;
  }, [texto, semilla, marcar]);

  /**
   * Volver `RETROCESO` días: se restaura el amanecer guardado más reciente que no pase de ahí, y
   * **lo que venía después deja de ser historia** — se vuelve a vivir desde ahí, y como el mundo
   * es determinista se vive igual. Si no hay tanto guardado, se va al más viejo que quede.
   */
  const volver = useCallback(() => {
    const h = historiaRef.current, m = mundoRef.current;
    if (!m || h.length === 0) return;
    const objetivo = m.dia - RETROCESO;
    let i = 0;
    for (let k = h.length - 1; k >= 0; k--) if (h[k].dia <= objetivo) { i = k; break; }
    const vuelto = copiar(h[i]);
    mundoRef.current = vuelto;
    rebRef.current = null;
    h.length = i;
    // El diario se corta aquí y no en el próximo amanecer: en pausa no hay amanecer que llegue, y
    // el panel se quedaría enseñando los días que el mundo acaba de deshacer.
    olvidar(cronicaRef.current, vuelto.dia + 1);
    ultimoRef.current = cronicaRef.current.eventos[cronicaRef.current.eventos.length - 1] ?? null;
    saltoRef.current = 0;
    setSaltando(false);
    nocheRef.current = { fin: 0, dura: PAUSA_NOCHE };
    repintarRef.current = true;
  }, []);

  /**
   * El mundo del día `dia` en el tick `t`, revivido desde el amanecer guardado de ese día. Es la
   * única forma de mirar hacia atrás: **el motor no es reversible** —un tick tira comida, mata y
   * gasta el azar— y guardar una copia por tick serían trece megas por día. Como el mundo es
   * determinista, revivirlo da exactamente el que hubo.
   *
   * Los hitos hacen que eso salga por fotograma: sin ellos cada tick que se desanda revive el día
   * entero, y con el censo lleno son siete milisegundos.
   */
  const estadoEn = useCallback((dia: number, t: number): Mundo | null => {
    let reb = rebRef.current;
    if (!reb || reb.dia !== dia) {
      const base = historiaRef.current.find((h) => h.dia === dia);
      if (!base) return null;                       // fuera de la historia guardada: hasta aquí
      reb = rebRef.current = { dia, hitos: [copiar(base)] };
    }
    const i = Math.min(Math.floor(t / TRAMO), reb.hitos.length - 1);
    const w = copiar(reb.hitos[i]);
    for (let k = i * TRAMO; k < t; ) {
      tick(w);
      if (++k % TRAMO === 0 && reb.hitos.length === k / TRAMO) reb.hitos.push(copiar(w));
    }
    return w;
  }, []);

  /**
   * Un tick hacia atrás, que son tres saltos distintos y los tres acaban en revivir un día hasta
   * un tick: dentro del día es el tick anterior; en el amanecer, la noche de la que se viene —el
   * día entero de antes, más su cierre—; y en la noche, el último tick de ese día.
   *
   * **La historia no se toca**: los amaneceres que quedan por delante siguen siendo los de este
   * mundo, así que tirar hacia delante otra vez no tiene nada que reconstruir. El diario sí se
   * corta, que es lo único que se lee sin abrir un panel y cantaría un día que todavía no ha
   * pasado.
   */
  const atrasar = useCallback((): Mundo | null => {
    const m = mundoRef.current;
    if (!m) return null;
    const w = m.noche ? estadoEn(m.dia - 1, m.duracion)
      : m.t > 0 ? estadoEn(m.dia, m.t - 1)
      : estadoEn(m.dia - 1, CONFIG.ticksDia);
    if (!w) return null;
    if (!m.noche && m.t === 0) anochecer(w);
    mundoRef.current = w;
    olvidar(cronicaRef.current, w.noche ? w.dia : w.dia + 1);
    ultimoRef.current = cronicaRef.current.eventos[cronicaRef.current.eventos.length - 1] ?? null;
    nocheRef.current = { fin: 0, dura: PAUSA_NOCHE };
    return w;
  }, [estadoEn]);

  /**
   * La tira mira el mundo con su propio reloj: el bucle de pintado vive en refs y no re-renderiza
   * React, así que preguntarle en cada fotograma sería re-renderizar la página entera 60 veces por
   * segundo para mover unos bichos que se mueven en generaciones.
   */
  const mundoVivo = useCallback(() => mundoRef.current, []);

  /**
   * Guarda el amanecer que acaba de ocurrir —para poder volver— y el reparto del día que se acaba
   * de cerrar. Los dos en el mismo sitio porque los dos ocurren en el mismo momento, que es el
   * único en el que el día anterior ya está contado y el siguiente no ha empezado.
   */
  const guardar = useCallback((m: Mundo) => {
    const h = historiaRef.current;
    // Rebobinar y volver a tirar hacia delante revive días que ya estaban guardados, y el mundo es
    // determinista: el amanecer que saldría de apuntarlos otra vez es el que ya está. Los otros dos
    // sí se llaman siempre — los dos cortan solos el futuro que ya no va a ocurrir y lo reescriben.
    if (!h.length || h[h.length - 1].dia < m.dia) {
      h.push(copiar(m));
      if (h.length > HISTORIA) h.shift();
    }
    registrar(repartoRef.current, m);
    const ev = narrar(cronicaRef.current, m, CONFIG.fundador);
    if (ev) ultimoRef.current = ev;
  }, []);
  /** Cerrar el panel que esté abierto. **No suelta al bicho marcado**: la marca es del mundo, y el
   *  mundo sigue ahí cuando el panel se va. */
  const cerrar = useCallback(() => setVista(null), []);
  const soltar = useCallback(() => marcar(0), [marcar]);
  const abrir = useCallback((v: Vista) => setVista((x) => (x === v ? null : v)), []);

  /**
   * Un clic en el lienzo marca al bicho que se haya pulsado, o suelta al que había si se pulsa el
   * suelo. Gana el más cercano y no el primero que se encuentre: en un montón de treinta, el
   * primero del censo es el más viejo, no el que está debajo del dedo.
   *
   * **Un cuerpo que todavía se disuelve se pulsa como uno vivo.** Se está viendo, así que se
   * puede querer saber de quién era — y es justo cuando se quiere: acaba de pasar algo.
   */
  const pulsar = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const m = mundoRef.current, v = camRef.current, cv = canvasRef.current;
    if (!m || !v || !cv) return;
    const caja = cv.getBoundingClientRect();
    const x = (e.clientX - caja.left - v.ox) / v.escala, y = (e.clientY - caja.top - v.oy) / v.escala;
    const margen = TACTO / v.escala;
    let mejor: Bicho | null = null, cerca = 0;
    for (const b of [...m.bichos, ...m.restos.map((z) => z.b)]) {
      const dx = b.x - x, dy = b.y - y, d2 = dx * dx + dy * dy;
      const alcance = b.radio + margen;
      if (d2 > alcance * alcance) continue;
      if (!mejor || d2 < cerca) { mejor = b; cerca = d2; }
    }
    alternar(mejor ? mejor.id : 0);
  }, [alternar]);
  const cronicaDe = useCallback(() => cronicaRef.current, []);
  const climaDe = useCallback(() => mundoRef.current?.cfg.comidas ?? 0, []);
  const reparto = useCallback(() => repartoRef.current, []);
  const diaDe = useCallback(() => mundoRef.current?.dia ?? 0, []);

  const saltar = useCallback(() => {
    const m = mundoRef.current;
    if (!m || m.extinto || saltoRef.current) return;
    saltoRef.current = m.dia + SALTO_DIAS;
    setSaltando(true);
  }, []);

  // El lienzo toma la forma del mundo dentro del hueco libre, y el mundo mide lo que mide: la
  // vista lo escala y lo centra, pero estirarlo al lienzo daría partidas distintas en cada
  // pantalla y la semilla dejaría de prometer nada.
  useEffect(() => {
    const canvas = canvasRef.current, caja = wrapRef.current;
    if (!canvas || !caja) return;
    const resize = () => {
      const libre = { W: caja.clientWidth, H: caja.clientHeight };
      if (libre.W < 2 || libre.H < 2) return;
      const escala = Math.min(libre.W / CONFIG.ancho, libre.H / CONFIG.alto);
      const W = Math.round(CONFIG.ancho * escala), H = Math.round(CONFIG.alto * escala);
      if (W === sizeRef.current.W && H === sizeRef.current.H) return;
      const dpr = window.devicePixelRatio || 1;
      dprRef.current = dpr;
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      sizeRef.current = { W, H };
      repintarRef.current = true;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(caja);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const loop = () => {
      rafRef.current = requestAnimationFrame(loop);
      let m = mundoRef.current;
      const { W, H } = sizeRef.current;
      const ctx = canvasRef.current?.getContext("2d");
      if (!m || !ctx || W === 0) return;

      const t0 = performance.now();
      const vel = velRef.current;
      let dados = 0;

      if (saltoRef.current) {
        // Adelantar días sin pintar, pero en trozos dentro del fotograma: correrlos de una vez
        // son segundos de pestaña colgada, y el navegador no distingue eso de un cuelgue.
        while (m.dia < saltoRef.current && !m.extinto && performance.now() - t0 < PRESUPUESTO_MS) {
          if (paso(m, true, vel, nocheRef.current)) guardar(m);
          dados++;
        }
        if (m.dia >= saltoRef.current || m.extinto) { saltoRef.current = 0; setSaltando(false); }
      } else if (corriendoRef.current && vel < 0) {
        // Hacia atrás **aunque el mundo esté extinto**: es justo cuando apetece volver a ver qué
        // pasó. Se acaba donde se acaba la historia guardada, y ahí se para solo.
        for (let k = 0; k < -vel; k++) {
          const w = atrasar();
          if (!w) { setCorriendo(false); break; }
          m = w;
          dados++;
        }
      } else if (corriendoRef.current && !m.extinto) {
        while (dados < vel && performance.now() - t0 < PRESUPUESTO_MS) {
          if (paso(m, false, vel, nocheRef.current)) guardar(m);
          dados++;
        }
      }

      // **La extinción se narra aquí y no en `guardar`**: el día que se muere el último no amanece,
      // y `guardar` cuelga del amanecer. Corre una sola vez porque en cuanto el mundo está extinto
      // ya no se dan pasos, y vuelve a correr si se retrocede y se revive — el diario habrá
      // olvidado su línea al volver atrás, así que no se duplica.
      if (dados && m.extinto) {
        const fin = narrar(cronicaRef.current, m, CONFIG.fundador);
        if (fin) ultimoRef.current = fin;
      }

      // **La cámara se calcula siempre, aunque el mundo esté en pausa**: quien la mueve no es solo
      // el mundo, también un clic — y el que acaba de elegir a alguien tiene el mundo parado.
      // El marcado es el vivo **o su cuerpo**, que sigue en el campo mientras se disuelve y se
      // puede pulsar igual. `vivo` es lo que los distingue: el motor lo apaga al morir.
      const elegido = selRef.current ? m.bichos.find((b) => b.id === selRef.current) ?? null : null;
      const marcado = elegido ?? (selRef.current
        ? m.restos.find((z) => z.b.id === selRef.current)?.b ?? null
        : null);
      // Dónde mira la cámara: al marcado mientras esté en el campo, y la cola al sitio donde cayó.
      // **El plazo se renueva mientras quede cuerpo**, así que solo empieza a correr cuando ya no
      // hay nada que mirar. Se lleva en reloj de pared y por eso se lee de `performance.now()` y
      // no del mundo: adelantando cien días nadie está mirando.
      const ahora = performance.now();
      let espera = esperaRef.current;
      if (espera && espera.id !== selRef.current) espera = null;   // era de otro
      if (marcado) {
        espera = { id: marcado.id, x: marcado.x, y: marcado.y, hasta: marcado.vivo ? 0 : ahora + COLA };
      } else if (espera && !espera.hasta) espera.hasta = ahora + COLA;   // se fue sin dejar cuerpo
      esperaRef.current = espera;
      const foco = espera && (!espera.hasta || espera.hasta > ahora) ? espera : null;
      const meta = foco
        ? vistaSobre(W, H, CONFIG.ancho, CONFIG.alto, foco.x, foco.y)
        : vistaDe(W, H, CONFIG.ancho, CONFIG.alto);
      const antes = camRef.current;
      let v = meta;
      if (antes && antes.escala === meta.escala) {
        // Y llega: sin rematar el último trozo, el acercamiento asintótico repintaría el mundo
        // entero para siempre por centésimas de píxel que nadie ve.
        const cerca = (de: number, a: number) => {
          const p = de + (a - de) * SEGUIMIENTO;
          return Math.abs(a - p) < 0.05 ? a : p;
        };
        v = { escala: meta.escala, ox: cerca(antes.ox, meta.ox), oy: cerca(antes.oy, meta.oy) };
      }
      const movida = !antes || antes.escala !== v.escala || antes.ox !== v.ox || antes.oy !== v.oy;
      camRef.current = v;

      // Se repinta cuando el mundo ha cambiado, cuando se ha movido la cámara y también cuando
      // algo de fuera lo pide —el tema, un cambio de tamaño—: en pausa no hay ticks y sin esa
      // última razón el lienzo se quedaría con la paleta anterior hasta que alguien diera al play.
      if (dados || movida || repintarRef.current) {
        repintarRef.current = false;
        // Cuánto lleva corrida la noche, para que las crías crezcan en vez de aparecer hechas.
        const noche = m.noche
          ? Math.min(1, Math.max(0, 1 - (nocheRef.current.fin - performance.now()) / nocheRef.current.dura))
          : 1;
        pintar(ctx, m, disenoRef.current, paletaRef.current, v, W, H, dprRef.current, noche, marcado);
      }

      // El botón de volver se pinta desde React y la historia vive en un ref, así que el espejo se
      // sincroniza aquí —una comparación por fotograma— y no en los cuatro sitios que la tocan.
      const atras = historiaRef.current.length > 0;
      if (atras !== hayAtrasRef.current) { hayAtrasRef.current = atras; setHayAtras(atras); }

      const texto = m.extinto
        ? `<span style="color:#e55">extinción</span> en el día ${m.dia}`
        : `${linea(m)}${saltoRef.current ? ` · adelantando… ${ACENTO(`día ${m.dia}/${saltoRef.current}`)}` : ""}`;
      for (const el of [estadoRef.current, estadoFsRef.current]) if (el) el.innerHTML = texto;

      const ev = ultimoRef.current;
      const sello = ev ? `${ev.dia}·${ev.clave}` : "";
      if (sello !== ultimoPintadoRef.current) {
        ultimoPintadoRef.current = sello;
        if (ultimoElRef.current) {
          ultimoElRef.current.textContent = ev
            ? `día ${ev.dia} · ${ev.texto}`
            : `el clima de esta partida · ${m.cfg.comidas} bocados al día`;
        }
      }
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [guardar, atrasar]);

  // Los mismos botones sirven a la barra de abajo y a la que flota en pantalla completa: un
  // segundo juego de JSX se quedaría a medias el día que se añada un control.
  const controles = (
    <>
        <button className="ev-btn" onClick={() => setCorriendo((c) => !c)}>
          {corriendo ? "Pausa" : "Seguir"}
        </button>
        {VELOCIDADES.map((v, i) => (
          <button key={v} className={`ev-btn${i === velIdx ? " on" : ""}`} onClick={() => setVelIdx(i)}>
            ×{v < 0 ? `−${-v}` : v}
          </button>
        ))}
        <button className="ev-btn muted" onClick={volver} disabled={!hayAtras}>
          −{RETROCESO} días
        </button>
        <button className="ev-btn muted" onClick={saltar} disabled={saltando}>
          {saltando ? "adelantando…" : `+${SALTO_DIAS} días`}
        </button>
        <input
          className="ev-semilla" value={texto} spellCheck={false} aria-label="Semilla"
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") sembrar(); }}
        />
        <button className="ev-btn muted" onClick={sembrar}>Sembrar</button>
        {VISTAS.map(([v, nombre]) => (
          <button key={v} className={`ev-btn${vista === v ? " on" : ""}`} onClick={() => abrir(v)}>
            {nombre}
          </button>
        ))}
        {/* Las reglas van en la barra y no en la cabecera de la página: en pantalla completa la
            cabecera no está, y unas reglas que solo se abren desde fuera del mundo no se abren. */}
        <button className={`ev-btn icono${vista === "reglas" ? " on" : ""}`} onClick={() => abrir("reglas")}
          title="Las reglas del mundo" aria-label="Las reglas del mundo">
          <IconoInfo size={14} />
        </button>
    </>
  );

  /** Lo que la tira necesita, en un sitio: se pinta en dos y los dos tienen que decir lo mismo. */
  const tira = {
    mundo: mundoVivo, eva, paleta: paletaDe(semilla, tema ?? "light"), diseno: designFor(semilla),
    sel, marcar: alternar,
  };

  return (
    <TerminalShell
      title="evolution"
      prompt={{ host: "evolution", path: "~/apps", command: `./evolution --semilla=${semilla}` }}
      hideChrome={fullscreen}
    >
      <style>{`
        main { --border: var(--t-rule); --muted: var(--t-ink3); }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        /* **El papel va en la raíz y no solo en el shell.** El shell mide 100dvh, y en el móvil
           eso es lo que medía la ventana cuando se calculó: al plegarse la barra del navegador la
           ventana crece y el shell no, y por el hueco de abajo se ve el blanco del documento. */
        html, body { height: 100%; overflow: hidden; background: var(--t-paper); }

        .toolbar { display: flex; align-items: center; gap: 0.4rem; padding: 0.6rem 0; flex-wrap: wrap; }
        .ev-btn {
          padding: 0.4rem 0.75rem; border-radius: 4px; border: 1px solid var(--border);
          background: transparent; cursor: pointer; font-size: 0.72rem; font-weight: 600;
          font-family: var(--t-mono); letter-spacing: 0.05em; color: var(--t-ink);
          transition: border-color 0.15s, background 0.15s; -webkit-user-select: none; user-select: none;
        }
        .ev-btn:hover { border-color: rgba(0,184,122,0.4); background: rgba(0,184,122,0.04); }
        .ev-btn.on { border-color: var(--t-accent); color: var(--t-accent); }
        .ev-btn.muted { color: var(--muted); }
        .ev-btn.icono { display: inline-flex; align-items: center; padding: 0.4rem 0.55rem; color: var(--muted); }
        .ev-btn.icono.on { color: var(--t-accent); }
        .ev-btn:disabled { opacity: 0.45; cursor: default; }
        .ev-semilla {
          padding: 0.4rem 0.6rem; border-radius: 4px; border: 1px solid var(--border);
          font-family: var(--t-mono); font-size: 0.72rem; color: var(--t-ink);
          background: transparent; width: 6.5rem;
        }
        .ev-semilla:focus { outline: none; border-color: var(--t-accent); }

        /* La caja se queda con el alto libre y el lienzo lo mide el JS (ver resize), que es
           donde vive CONFIG: en CSS, aspect-ratio cede ante uno de los dos límites y deja el
           lienzo o desbordado —empujando la leyenda fuera del overflow, que es cómo desaparecía
           en pantalla ancha— o con dos franjas muertas. */
        /* **Y tiene suelo, porque una caja a cero no falla: desaparece.** El lienzo va fuera del
           flujo y el resize descarta la medida absurda, así que la caja vacía deja el mundo
           pintado a la medida de antes y centrado en una línea sin alto —encima de lo que venga
           debajo— y los paneles, que son un inset 0 de ella, en nada. Le pasa a lo que se abra en
           la página y reparta alto con la escena: el porqué. 200 px es el alto del mundo a escala
           1; por debajo se está mirando una miniatura, y para eso se desplaza la página. */
        .sim-box { flex: 1 1 auto; min-height: 200px; position: relative; }
        /* **El lienzo va fuera del flujo**, centrado sobre la caja y no colocado por ella. En flujo
           es él quien decide lo ancha que es la página —lleva su ancho en píxeles, puesto por el
           JS de arriba—, así que al encoger la ventana con un panel abierto se mide una vez con la
           anchura de antes y ahí se queda clavado: la medida ya no cabe, pero es la que sostiene el
           ancho de la caja que se está midiendo. Fuera del flujo no mide a nadie y la caja dice
           siempre el sitio que hay de verdad. */
        .sim-canvas {
          position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
          display: block; border-radius: 6px; touch-action: none; cursor: pointer;
        }
        /* **En pantalla completa nada flota sobre el mundo.** La escena entera —controles, lienzo y
           tira— toma la ventana y se reparte el alto igual que en la página, así que el mundo crece
           por lo que se le ha quitado a los márgenes y no hay una capa tapando la franja de casa.
           La leyenda sigue siendo un panel encima, que para eso se abre y se cierra. */
        /* **Sin min-height 0, que aquí el suelo de la caja es lo que se defiende.** Con él la
           escena encoge a lo que le dejen y sus hijos —el mundo con su suelo— se le salen por
           abajo sobre lo que haya después; con el automático no baja de lo que mide su contenido,
           así que lo que no cabe desborda el main, que se desplaza. */
        .escena { display: flex; flex-direction: column; flex: 1 1 auto; }
        .escena.fs {
          position: fixed; inset: 0; z-index: 1000; background: var(--t-paper);
          padding: 0 clamp(0.75rem, 2vw, 1.5rem) 0.75rem;
        }
        .escena.fs .toolbar { justify-content: center; }
        .escena.fs .sim-canvas { border-radius: 0; }
        /* Fuera de la barra —en pantalla completa no hay— la flecha se la pone ella. */
        .ev-estado-fs {
          flex-basis: 100%; text-align: center; font-size: 0.66rem; color: var(--t-ink3);
          font-variant-numeric: tabular-nums;
        }
        .ev-estado-fs::before { content: "↳ "; color: var(--t-ink4); }
        /* El carril del diario: una línea bajo el mundo, siempre. Entera es el acceso al panel —
           un renglón de 20 px no tiene sitio para un botón aparte, y lo que se quiere pulsar es
           la línea que se acaba de leer. */
        /* **Rejilla y no flex, porque el carril es un botón.** Un botón no encoge por debajo de lo
           que mide su texto de largo, aunque el hijo lleve min-width 0 y su ellipsis: una línea
           larga del diario ensancha la página entera —607 px en una ventana de 400— y el mundo se
           sale por la derecha sin que falle nada. Una pista minmax(0, 1fr) sí llega a cero. */
        .dr-carril {
          flex: 0 0 auto; width: 100%; display: grid; grid-template-columns: minmax(0, 1fr) auto;
          align-items: baseline; gap: 0.6rem;
          border-top: 1px solid var(--border); padding: 0.35rem 0 0.1rem; cursor: pointer;
          font-family: var(--t-mono); font-size: 0.66rem; color: var(--t-accent); text-align: left;
        }
        .dr-viva {
          flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis;
          white-space: nowrap; font-variant-numeric: tabular-nums;
        }
        .dr-abrir { flex: 0 0 auto; color: var(--muted); }
        .dr-carril:hover .dr-abrir, .dr-carril:active .dr-abrir { color: var(--t-accent); }

        .fs-exit {
          position: fixed; top: 14px; right: 16px; z-index: 1001;
          background: none; border: none; cursor: pointer; padding: 6px; display: flex;
          color: var(--t-accent); transition: opacity 0.15s; opacity: 0.7;
        }
        .fs-exit:hover { opacity: 1; }

        /* ── Tira de población ────────────────────────────────────────────────
           Debajo del mundo y en el flujo, no encima: es lo que está siempre, así que taparlo
           sería taparse a sí misma. El alto que se lleva se lo quita al lienzo, que es flex. */
        /* Lo que va bajo el mundo, junto: la ficha del marcado y la tira. **Dice su ancho**, que
           en una columna flex el automático lo decide lo más ancho que lleve dentro y se lleva la
           página con él. */
        .cajon { flex: 0 0 auto; width: 100%; }
        .tr-panel { flex: 0 0 auto; border-top: 1px solid var(--border); padding: 0.4rem 0 0.15rem; }
        .tr-cab { display: flex; align-items: baseline; gap: 0.6rem; font-size: 0.6rem; padding-bottom: 0.25rem; }
        .tr-cab b { color: var(--t-ink); letter-spacing: 0.07em; }
        .tr-cab span { color: var(--muted); }
        .tr-fila {
          display: grid; grid-template-columns: 168px 1fr; gap: 0.6rem; align-items: center;
          border-top: 1px solid var(--t-rule2); padding: 1px 0; cursor: pointer;
        }
        .tr-fila.on { background: color-mix(in srgb, var(--t-accent) 5%, transparent); }
        .tr-et { display: flex; align-items: baseline; gap: 0.4rem; min-width: 0; line-height: 1.2; }
        .tr-et b { font-size: 0.64rem; letter-spacing: 0.05em; color: var(--t-ink2); }
        .tr-fila.on .tr-et b { color: var(--t-ink); }
        /* La mediana manda y el reparto acompaña: el brillo iba al revés cuando lo de al lado era
           la distancia al fundador, que era la noticia. Ahora la noticia es dónde está. */
        .tr-cifra { font-size: 0.6rem; color: var(--t-ink2); font-variant-numeric: tabular-nums; }
        .tr-cifra i { font-style: normal; color: var(--muted); }
        .tr-eje {
          display: flex; justify-content: space-between; font-size: 0.58rem; color: var(--t-ink3);
          padding: 0.2rem 0 0; margin-left: calc(168px + 0.6rem);
        }

        .tr-eva { color: var(--t-ink2); }
        .tr-eje i { font-style: normal; }
        @media (max-width: 500px) {
          .tr-cab span { display: none; }   /* la pista se come dos líneas y el sitio es del mundo */
          .tr-eje i { display: none; }   /* «lo más bajo» ya se entiende y cabe en una línea */
          .tr-fila { grid-template-columns: 96px 1fr; gap: 0.4rem; }
          .tr-et { flex-direction: column; align-items: flex-start; gap: 0; }
          .tr-eje { margin-left: calc(96px + 0.4rem); }
        }

        /* ── Inspector de bicho ───────────────────────────────────────────────
           Bajo el mundo y en el flujo, como la tira y por lo mismo: habla de alguien que está
           andando por el lienzo, así que taparlo sería taparse a sí mismo. */
        .in-panel {
          flex: 0 0 auto; border-top: 1px solid var(--border); padding: 0.4rem 0 0.2rem;
          font-family: var(--t-mono);
        }
        .in-panel.ido { opacity: 0.55; }   /* el que ya no está sigue leyéndose, pero apagado */
        .in-cab {
          display: flex; align-items: baseline; flex-wrap: wrap; gap: 0.2rem 0.7rem;
          font-size: 0.62rem; color: var(--muted); font-variant-numeric: tabular-nums;
        }
        .in-cab b { font-size: 0.72rem; color: var(--t-accent); letter-spacing: 0.05em; }
        .in-cab i { font-style: normal; color: var(--t-ink4); }
        .in-ido { color: #e55; }
        .in-donde { color: var(--t-ink2); }
        .in-cerrar { margin-left: auto; color: var(--muted); cursor: pointer; font-size: 0.7rem; }
        .in-cerrar:hover, .in-cerrar:active { color: var(--t-accent); }

        .in-genes { display: grid; grid-template-columns: repeat(6, 1fr); gap: 0.3rem 0.8rem; margin-top: 0.35rem; }
        /* El nombre cede y la cifra no: partida en dos renglones, la cifra empuja la barra hacia
           abajo y la fila de seis deja de estar a la misma altura, que es lo único que hace
           comparables seis barras de unidades distintas. */
        .in-gen-cab { display: flex; align-items: baseline; justify-content: space-between; gap: 0.3rem; font-size: 0.6rem; }
        .in-gen-cab b {
          color: var(--t-ink2); letter-spacing: 0.04em;
          min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .in-gen-cab span { color: var(--muted); font-variant-numeric: tabular-nums; white-space: nowrap; }
        /* La barra lleva la misma vara que la leyenda y la tira —el recorrido medido—, y la marca
           fina del fundador: sin ella, «63%» no dice de dónde salió este linaje. */
        .in-barra { position: relative; height: 6px; margin-top: 2px; border-bottom: 1px solid var(--t-rule2); }
        .in-barra span { position: absolute; bottom: 0; transform: translateX(-50%); }
        .in-eva-marca { width: 1px; height: 5px; background: var(--t-ink4); }
        .in-aqui { width: 5px; height: 5px; border-radius: 50%; background: var(--t-accent); }

        /* Seis columnas piden 120 px cada una para que quepa «sociabilidad 45% −11»; por debajo de
           eso se parten en dos renglones, que cuestan alto del mundo, o en tres columnas, que
           cuestan lo mismo y se leen. */
        @media (max-width: 880px) { .in-genes { grid-template-columns: repeat(3, 1fr); } }
        @media (max-width: 430px) { .in-genes { grid-template-columns: repeat(2, 1fr); } }

        /* ── Estratos: toda la partida ────────────────────────────────────────
           Encima del lienzo como la leyenda y por lo mismo: seis franjas legibles no caben en lo
           que le sobra a la página, que ya se reparten el mundo y la tira. */
        .es-panel {
          position: absolute; inset: 0; z-index: 5; overflow-y: auto; overscroll-behavior: contain;
          background: var(--t-paper); padding: 0.65rem 1rem 0.6rem;
        }
        .es-cabecera { display: flex; align-items: center; gap: 0.8rem; padding-bottom: 0.35rem; }
        .es-cabecera b { font-size: 0.78rem; letter-spacing: 0.08em; color: var(--t-accent); }
        .es-rango { font-size: 0.66rem; color: var(--muted); font-variant-numeric: tabular-nums; margin-right: auto; }
        .es-fila {
          display: grid; grid-template-columns: 96px 1fr; gap: 0.6rem; align-items: center;
          border-top: 1px solid var(--t-rule2); padding: 3px 0; position: relative;
        }
        .es-et b { font-size: 0.66rem; letter-spacing: 0.05em; color: var(--t-ink2); }
        .es-lienzo { display: block; width: 100%; height: var(--es-alto); }
        .es-nada {
          position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
          font-size: 0.62rem; color: var(--t-ink4);
        }
        .es-pie {
          display: flex; gap: 0.6rem; font-size: 0.6rem; color: var(--t-ink3);
          padding-top: 0.25rem; margin-left: calc(96px + 0.6rem);
          font-variant-numeric: tabular-nums;
        }
        .es-marcas { flex: 1 1 auto; display: flex; justify-content: space-between; }
        .es-perfil { flex: 0 0 27px; text-align: right; }
        @media (max-width: 500px) {
          .es-fila { grid-template-columns: 76px 1fr; gap: 0.4rem; }
          .es-lienzo { height: var(--es-alto-movil); }
          .es-pie { margin-left: calc(76px + 0.4rem); }
        }

        /* ── Diario ───────────────────────────────────────────────────────────
           Encima del lienzo como los estratos, y la cabecera pegada arriba: una partida larga se
           lee desplazándose, y sin eso se pierde de vista hasta qué día llega lo que se está
           leyendo. */
        .dr-panel {
          position: absolute; inset: 0; z-index: 5; overflow-y: auto; overscroll-behavior: contain;
          background: var(--t-paper); padding: 0 1rem 0.8rem; font-family: var(--t-mono);
        }
        /* El relleno de arriba lo pone la cabecera y no el panel: con él en el panel, lo pegado
           arriba se pega por debajo de ese relleno y las líneas se ven pasar por encima. */
        .dr-cabecera {
          display: flex; align-items: center; gap: 0.8rem; padding: 0.65rem 0 0.45rem;
          position: sticky; top: 0; background: var(--t-paper); z-index: 1;
        }
        .dr-cabecera b { font-size: 0.78rem; letter-spacing: 0.08em; color: var(--t-accent); }
        .dr-rango { font-size: 0.66rem; color: var(--muted); font-variant-numeric: tabular-nums; margin-right: auto; }
        .dr-linea {
          font-size: 0.68rem; line-height: 1.75; color: var(--t-ink2);
          border-top: 1px solid var(--t-rule2);
        }
        .dr-linea b { color: var(--t-accent); font-weight: 600; font-variant-numeric: tabular-nums; }
        .dr-nada { font-size: 0.66rem; color: var(--t-ink3); padding-top: 0.6rem; }

        /* ── Leyenda ──────────────────────────────────────────────────────────
           Encima del lienzo y no debajo: el hueco vertical ya se lo reparten el mundo y la barra
           de controles, y meter aquí ocho filas dejaría el mundo en una rendija. Va dentro de
           .sim-box para que en pantalla completa —donde la caja es fixed— salga sin otro camino. */
        .lg-panel {
          position: absolute; inset: 0; z-index: 5; overflow-y: auto; overscroll-behavior: contain;
          background: var(--t-paper); border: 1px solid var(--border); border-radius: 6px;
          font-family: var(--t-mono); padding: 0.9rem 1rem 1.2rem;
        }
        .lg-cabecera { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
        .lg-cabecera b { font-size: 0.78rem; letter-spacing: 0.08em; color: var(--t-accent); }
        .lg-intro { font-size: 0.68rem; line-height: 1.55; color: var(--muted); margin: 0.6rem 0 0; max-width: 62ch; }
        .lg-aviso b { color: var(--t-ink2); }

        .lg-filas { margin-top: 0.5rem; }
        .lg-fila { display: flex; gap: 0.8rem; align-items: flex-start; padding: 0.7rem 0; border-top: 1px solid var(--border); }
        .lg-muestras { flex: 0 0 auto; }
        .lg-celdas { display: flex; gap: 4px; }
        .lg-celdas canvas, .lg-paso canvas { border-radius: 3px; display: block; }

        /* La edad va en tira propia y detrás de los seis genes, porque no es un gen: no tiene
           recorrido, ni fundador, ni banda de población que enseñar. Y aquí sí hay cifra debajo de
           cada cuerpo —el día **es** el dato—, donde en una fila de gen los tres bichos ya son la
           escala y un rótulo solo repetiría lo que se ve. */
        .lg-edad { padding: 0.8rem 0 0.2rem; border-top: 1px solid var(--border); }
        .lg-tira { display: flex; gap: 4px; margin-top: 0.5rem; }
        .lg-paso { display: flex; flex-direction: column; align-items: center; gap: 2px; }
        .lg-paso span { font-size: 0.58rem; color: var(--t-ink3); font-variant-numeric: tabular-nums; }

        .lg-datos { flex: 1 1 auto; min-width: 0; }
        .lg-cab { display: flex; align-items: baseline; justify-content: space-between; gap: 0.6rem; font-size: 0.72rem; }
        .lg-cab b { color: var(--t-ink); letter-spacing: 0.04em; }
        .lg-cifra { color: var(--muted); font-variant-numeric: tabular-nums; white-space: nowrap; }

        /* La barra: octavas desde el fundador, que va en el centro exacto, con el recorrido medido
           —su p01 y su p99— cerca de los bordes y margen fuera para el linaje que se salga. La
           geometría es posGen, en designs.ts. */

        .lg-que { font-size: 0.68rem; line-height: 1.5; color: var(--t-ink); margin: 0.2rem 0 0; }
        .lg-nota { font-size: 0.62rem; line-height: 1.5; color: var(--t-ink3); margin-top: 0.2rem; }
        .lg-paga, .lg-cobra { color: var(--t-ink2); }

        /* ── Las reglas ───────────────────────────────────────────────────────
           Encima del lienzo, como la leyenda: es lectura, y lo que se lee no compite con el mundo
           por el sitio — se abre, se lee y se cierra. */
        .rg-panel {
          position: absolute; inset: 0; z-index: 5; overflow-y: auto; overscroll-behavior: contain;
          background: var(--t-paper); border: 1px solid var(--border); border-radius: 6px;
          font-family: var(--t-mono); padding: 0.9rem 1rem 1.2rem;
        }
        .rg-cabecera { display: flex; align-items: baseline; gap: 0.8rem; }
        .rg-cabecera b { font-size: 0.78rem; letter-spacing: 0.08em; color: var(--t-accent); }
        .rg-cabecera .rg-nota { font-size: 0.62rem; color: var(--t-ink4); }
        /* El hueco lo pone el botón y no la nota, que en móvil se esconde. */
        .rg-cabecera button { margin-left: auto; }
        .rg-intro { font-size: 0.68rem; line-height: 1.55; color: var(--muted); margin: 0.6rem 0 0; max-width: 62ch; }
        .rg-seccion { margin-top: 0.9rem; }
        .rg-titulo {
          font-size: 0.66rem; font-weight: 600; letter-spacing: 0.09em; color: var(--t-ink2);
          border-bottom: 1px solid var(--border); padding-bottom: 0.25rem;
        }
        /* Tres pistas y las tres con minmax(0, …): el valor es lo único que no puede partirse, y
           la nota es la que cede. En flex, la nota más larga fijaría el ancho de la tabla. */
        .rg-fila {
          display: grid; grid-template-columns: minmax(0, 8.5rem) minmax(0, 12rem) minmax(0, 1fr);
          gap: 0.2rem 0.9rem; align-items: baseline;
          border-top: 1px solid var(--t-rule2); padding: 0.3rem 0; font-size: 0.66rem;
        }
        .rg-fila:first-of-type { border-top: none; }
        .rg-que { color: var(--t-ink); font-weight: 600; letter-spacing: 0.03em; }
        .rg-cuanto { color: var(--t-accent); font-variant-numeric: tabular-nums; }
        .rg-porque { color: var(--t-ink3); line-height: 1.45; }

        @media (max-width: 620px) {
          .lg-fila { flex-direction: column; gap: 0.4rem; }
          .lg-datos { width: 100%; }
          /* Apiladas: tres columnas en 375 px dejan la nota en una columna de cuatro letras. */
          .rg-fila { grid-template-columns: minmax(0, 1fr) minmax(0, auto); }
          .rg-porque { grid-column: 1 / -1; }
          .rg-cabecera .rg-nota { display: none; }   /* parte el título en dos y no dice nada nuevo */
        }

        @media (max-width: 500px) { .toolbar { gap: 0.25rem; } .ev-btn { padding: 0.4rem 0.55rem; } }

        /* ── Móvil: el cajón ──────────────────────────────────────────────────
           **En vertical el mundo lo limita el ancho, nunca el alto**, así que quitarle filas a la
           página no le da un píxel más de lienzo: lo que sobra es alto, y de eso hay medio
           teléfono. De ahí las dos cosas de aquí abajo y ninguna otra.

           El lienzo se come el relleno lateral de la página —un sangrado negativo, que el JS mide
           la caja y no la ventana—, que es el único sitio de donde sale ancho.

           Y el panel, que en escritorio es una capa sobre el lienzo, aquí sube desde abajo: encima
           taparía justo lo que se está mirando dejando media pantalla en blanco debajo. Suben los
           cinco por igual —los tres que se abren sobre el mundo y los dos que en escritorio van en
           el flujo—, porque en un teléfono la diferencia entre «encima» y «debajo» no existe: solo
           hay un sitio libre. Sin fondo que oscurezca el mundo: el mundo sigue corriendo ahí
           arriba, y el que trae el inspector es el que se está siguiendo. Se cierran por su
           botón, que todos lo llevan. */
        @media (max-width: 640px) {
          .sim-box { margin-inline: calc(clamp(1.25rem, 4vw, 2rem) * -1); }
          /* En pantalla completa el relleno que hay que devolver es el de la escena, que es otro:
             con el de la página el lienzo se sale ocho píxeles por cada lado. */
          .escena.fs .sim-box { margin-inline: calc(clamp(0.75rem, 2vw, 1.5rem) * -1); }
          /* Arriba del todo y no centrado en lo que sobra: lo que sobra es por donde sube el
             cajón, y un mundo centrado se lleva la mitad debajo de él. */
          .sim-canvas { border-radius: 0; top: 0; transform: translateX(-50%); }

          /* **La barra envuelve, no se desliza.** En vertical el mundo lo limita el ancho, así
             que los renglones que se lleva la barra no le quitan ni un píxel de lienzo — y a
             cambio se ven todos los botones sin tener que descubrir que la fila seguía. Es lo
             mismo que hace maximizada, y por lo mismo. */
          /* A la izquierda, también maximizada: centrada, la última fila queda descolgada del
             resto y la barra deja de leerse como una sola cosa. */
          .toolbar, .escena.fs .toolbar { justify-content: flex-start; }
          .escena.fs .toolbar { padding-right: 2.2rem; }   /* el aspa de salir flota en esa esquina */
          .toolbar > * { flex: 0 0 auto; }

          .lg-panel, .dr-panel, .es-panel, .cajon, .rg-panel {
            position: fixed; inset: auto 0 0 0; z-index: 1002;
            max-height: 76dvh; overflow-y: auto; overscroll-behavior: contain;
            background: var(--t-paper); border: 1px solid var(--border); border-bottom: none;
            border-radius: 14px 14px 0 0; box-shadow: 0 -10px 30px rgba(0, 0, 0, 0.28);
            padding: 0 1rem 1rem; animation: cj-subir 0.22s ease-out;
          }
          /* El asa, que es lo que lo hace un cajón y no una tarjeta que ha aparecido. **El hueco de
             arriba lo pone ella y nunca el panel:** un relleno de arriba en quien se desplaza deja una
             franja por la que se ve pasar el texto por encima de la cabecera pegada. */
          .lg-panel::before, .dr-panel::before, .es-panel::before,
          .cajon::before, .rg-panel::before {
            content: ""; display: block; width: 36px; height: 4px; margin: 0.55rem auto 0.5rem;
            border-radius: 2px; background: var(--t-rule);
          }
          /* Dentro del cajón la línea de arriba sobra: quien lo separa del mundo es el cajón. */
          .cajon > :first-child { border-top: none; }
          @keyframes cj-subir { from { transform: translateY(100%); } }
        }
      `}</style>

      {/* **El ancho, dicho y no deducido.** El shell mete esto en una columna flex, y un ancho
          automático ahí lo decide lo más ancho que haya dentro —la fila de controles que en móvil
          no envuelve—: la página entera se va a 800 px en una ventana de 375 y el lienzo se mide
          contra una caja que no cabe. Ni `overflow: hidden` ni `min-width: 0` lo evitan: el
          primero recorta lo que sobra, que es el mundo, y el segundo no llega, que quien se
          ensancha es el shell. */}
      <main style={{
        width: "100%", maxWidth: 900, margin: "0 auto",
        padding: `0 clamp(1.25rem, 4vw, 2rem) clamp(1.25rem, 4vw, 2rem)`,
        height: "100%",
        /* **Aquí se desplaza lo que no cabe, y no el documento.** El porqué se abre debajo del
           mundo y pide más alto del que hay; darle el desplazamiento al documento obliga a
           deshacer el `overflow: hidden` de la raíz —que está puesto porque en el móvil, al
           plegarse la barra del navegador, por el hueco de abajo se ve el blanco— y a devolverlo
           al cerrarse: un estado que sobrevivía a maximizar y dejaba la página tocada sin que
           nadie lo hubiera abierto. `main` cubre el hueco entero, así que desplazarlo a él es lo
           mismo a la vista y no hay nada que recordar. */
        overflowX: "hidden", overflowY: "auto",
        display: "flex", flexDirection: "column",
      }}>
        <BarraEstado
          estilo={{ marginTop: "1rem" }}
          acciones={
            <button className="be-icono hover-accent" onClick={() => setFullscreen(true)}
              title="Pantalla completa" aria-label="Pantalla completa">
              <ExpandIcon />
            </button>
          }
        >
          <span ref={estadoRef} className="be-elastico" />
        </BarraEstado>

        <div className={`escena${fullscreen ? " fs" : ""}`}>
          <div className="toolbar">
            {controles}
            {fullscreen && <span ref={estadoFsRef} className="ev-estado-fs" />}
          </div>

          <div className="sim-box" ref={wrapRef}>
            {/* Pulsar el mundo es elegir bicho, y por eso el lienzo lleva puntero. Va en
                `pointerdown` y no en `click`: con el ratón es lo mismo, y con el dedo no —un
                `click` táctil llega tarde y detrás de un desplazamiento que aquí no existe. */}
            <canvas className="sim-canvas" ref={canvasRef} onPointerDown={pulsar} />
            {vista === "partida" && (
              <Estratos historia={reparto} eva={eva} dia={diaDe} cerrar={cerrar} />
            )}
            {vista === "diario" && <Diario diario={cronicaDe} dia={diaDe} clima={climaDe} cerrar={cerrar} />}
            {vista === "reglas" && <Reglas clima={climaDe} cerrar={cerrar} />}
            {vista === "leyenda" && (
              <Leyenda
                rasgos={RASGOS} tabla={TABLA}
                eva={eva}
                paleta={paletaDe(semilla, tema ?? "light")}
                diseno={designFor(semilla)} cerrar={cerrar}
              />
            )}
          </div>

          {/* El diario, siempre a la vista y en una línea: el mundo es lo que se está mirando, así
              que lo que cuenta lo que acaba de pasar tiene que estar pegado a él y no en una barra
              de arriba. Pegado al lienzo y encima de la tira, que es lo que se abre y se cierra. */}
          <button className="dr-carril" onClick={() => abrir("diario")} title="Abrir el diario de la partida">
            <span ref={ultimoElRef} className="dr-viva" />
            <span className="dr-abrir">el diario ›</span>
          </button>

          {/* Lo que vive bajo el mundo, en un cajón: **en el móvil los dos son una sola hoja**, y
              dos hojas ancladas al mismo borde se pisan. En escritorio el cajón no se ve — cada
              panel se sigue separando con su propia línea.

              La ficha del marcado se pinta **siempre que el mundo se vea**: los otros paneles tapan
              el lienzo, y con la marca escondida su ficha habla de algo que no está. Con la tira
              puesta va en corto —los genes los está contando ella, y mejor, que ahí se ven contra
              toda la población— y así las dos caben sin dejar al mundo en un renglón. */}
          {(vista === "poblacion" || (sel > 0 && vista === null)) && (
            <div className="cajon">
              {sel > 0 && (vista === null || vista === "poblacion") && (
                <Inspector mundo={mundoVivo} id={sel} eva={eva} cerrar={soltar} genes={vista === null} />
              )}
              {vista === "poblacion" && <Tira {...tira} />}
            </div>
          )}
        </div>


        {fullscreen && (
          <button className="fs-exit" onClick={() => setFullscreen(false)} title="Salir de pantalla completa" aria-label="Salir de pantalla completa">
            <CollapseIcon />
          </button>
        )}

        {!fullscreen && (
          <WhyFooter question="¿Por qué un simulador de evolución?" date="2 de septiembre de 2026" style={{ marginTop: "auto" }}>
            <p>Que de unas reglas simples salga algo que nadie ha escrito me parece la idea más bonita que tiene la biología. Y es de las que cuesta creerse si no la ves pasar.</p>
            <p>Aquí nadie decide cómo se comporta un bicho. Solo hay seis números que se heredan con pequeños errores y un mundo en el que solo lo que llega a casa se convierte en hijos. Con eso basta.</p>
            <p>Al rato la población es otra y hace cosas que yo no programé: cazar, apartarse, volver antes de tiempo. No hay guion — es lo que ha quedado vivo.</p>
          </WhyFooter>
        )}
      </main>
    </TerminalShell>
  );
}
