// Los tests del motor de evolution — `npx tsx app/apps/evolution/engine.test.ts`.
// No es parte del build; verifica el mundo sin navegador.
//
// **No comprueban código: comprueban predicciones evolutivas falsables.** Que una función
// devuelva lo que devuelve no dice nada de si la simulación es honesta; que la escasez de comida
// seleccione más ojo, sí. Y cuando uno falla, lo primero que hay que sospechar es el mundo y no
// la predicción: la escasez midió el signo contrario durante un día entero, y no era ecología
// —era una rejilla de suelo más ancha que el mundo, en la economía que se acabó archivando—.
//
// Por eso son caros —minutos, no milisegundos— y por eso cada escenario corre varias semillas y
// compara **medianas**: una semilla sola dice tanto del azar que le tocó como del mundo.
import {
  CONFIG, RASGOS, amanecer, anochecer, azarCon, copiar, correrDia, crearMundo, huella, mediana,
  mutar, resumen, tick,
  type Config, type Genoma,
} from "./engine";

let fallos = 0;
function check(nombre: string, ok: boolean, detalle = "") {
  console.log(`${ok ? "✓" : "✗"} ${nombre}${detalle ? "  " + detalle : ""}`);
  if (!ok) fallos++;
}

const SEMILLAS = ["hola", "pablo", "claudio", "mar", "brizna", "raiz", "sal", "duna",
                  "ocho", "nueve", "diez", "once"];
const DIAS = 150;

/**
 * Corre un escenario en todas las semillas y devuelve la mediana de las medianas.
 *
 * **El plazo es del escenario, no de la suite.** Cada mundo tiene su propia esperanza de vida y
 * medirlos todos a la misma fecha no es más justo: es medir a unos vivos y a otros muertos. El
 * plazo bueno es el más largo en el que **las dos mitades de la comparación siguen en pie**, que
 * es donde la mediana habla de selección y no de quién ha sobrevivido al sorteo.
 */
function escenario(cfg: Partial<Config>, dias = DIAS) {
  const g = { talla: [] as number[], vision: [] as number[], retorno: [] as number[] };
  let vivas = 0;
  for (const s of SEMILLAS) {
    const m = crearMundo(s, cfg);
    for (let d = 0; d < dias && !m.extinto; d++) correrDia(m);
    if (m.extinto || m.bichos.length < 5) continue; // una semilla extinta no vota
    vivas++;
    const r = resumen(m);
    g.talla.push(r.medianas.talla); g.vision.push(r.medianas.vision); g.retorno.push(r.medianas.retorno);
  }
  return { vivas, talla: mediana(g.talla), vision: mediana(g.vision), retorno: mediana(g.retorno) };
}

// Seis escenarios y tres perillas, cada una separada por lo suficiente para salir del ruido: la
// comida del día (×5,7), la depredación (encendida o apagada) y la despensa (×3,3). Todos están
// **dentro de la ventana viable** —diez o más semillas de doce llegan al plazo de su escenario—,
// que hay que respetar al elegirlos: una mediana de tres semillas no es una mediana, es una
// anécdota.
//
// **La depredación se mide a 80 días y no a 150, y esa fecha es un resultado del mundo.** Sin
// caza no hay quien se lleve el excedente ni quien castigue ser diminuto, así que la población
// oscila entre treinta y mil sobre los mismos cien bocados hasta que un desplome se la lleva
// entera: las doce semillas se extinguen entre el día 107 y el 117. A 80 las doce siguen en pie y
// el margen de la talla es el mayor de todo el recorrido —3,74 contra 1,76, medido a 40, 60 y 80—,
// porque la caída ya lleva setenta días en marcha y el derrumbe todavía no ha empezado.
const POBRE: Partial<Config> = { comidas: 70 };
const RICO: Partial<Config> = { comidas: 400 };
const SIN_CAZA: Partial<Config> = { caza: false };
const DESPENSA_CORTA: Partial<Config> = { capReserva: 0.6 };
const DESPENSA_LARGA: Partial<Config> = { capReserva: 2 };

console.log("Corriendo escenarios (esto tarda unos minutos)…\n");
const pobre = escenario(POBRE), rico = escenario(RICO);
const DIAS_CAZA = 80;
const sinCaza = escenario(SIN_CAZA, DIAS_CAZA), conCaza = escenario({}, DIAS_CAZA);
const corta = escenario(DESPENSA_CORTA), larga = escenario(DESPENSA_LARGA);
const cifras = (n: string, e: ReturnType<typeof escenario>) =>
  `${n}: talla=${e.talla.toFixed(2)} visión=${e.vision.toFixed(1)} retorno=${e.retorno.toFixed(2)} (${e.vivas}/${SEMILLAS.length} vivas)`;
for (const [n, e] of [["pobre", pobre], ["rico", rico], ["sin caza", sinCaza], ["con caza", conCaza],
                      ["despensa corta", corta], ["despensa larga", larga]] as const) console.log(cifras(n, e));
console.log("");

// 1. **La abundancia hace gigantes.** La despensa va con la masa y un hijo se lleva la suya llena,
//    así que ser grande se paga dos veces —gastas más y tus hijos cuestan más— y solo se cobra si
//    hay comida de sobra con la que llenar las dos. Con poca, ser grande es un lastre.
check("comida abundante → sube la talla",
  pobre.vivas >= 5 && rico.vivas >= 5 && rico.talla > pobre.talla,
  `talla ${pobre.talla.toFixed(2)}→${rico.talla.toFixed(2)}`);

// 2. **Y lo que las hace gigantes es poder comerse al vecino.** Apagada la caza, el tamaño no
//    cobra nada y sigue pagándolo todo. Es la otra cara del test anterior y aísla el mecanismo:
//    sin esto, "más comida, más grandes" podría ser simplemente que sobra para crecer.
//    Se mide a `DIAS_CAZA`, por lo que ahí arriba está escrito.
check("sin depredación → baja la talla",
  sinCaza.vivas >= 5 && conCaza.vivas >= 5 && sinCaza.talla < conCaza.talla,
  `talla ${conCaza.talla.toFixed(2)}→${sinCaza.talla.toFixed(2)}`);

// 3. **La despensa corta manda a casa.** Con poca autonomía no se puede seguir buscando el
//    siguiente bocado: hay que canjear lo que llevas antes de quedarte sin. Es el gen propio de
//    este mundo y esta es la perilla que de verdad lo aprieta.
check("despensa más corta → sube el retorno",
  corta.vivas >= 5 && larga.vivas >= 5 && corta.retorno > larga.retorno,
  `retorno ${larga.retorno.toFixed(2)}→${corta.retorno.toFixed(2)}`);

// 4. Sin selección los genes derivan, pero **sin dirección**. Si se van sistemáticamente hacia el
//    mismo lado, el sesgo está en la mutación — que es justo lo que la multiplicativa está puesta
//    para no tener. Cuatrocientos linajes que no compiten entre sí y por tanto no coalescen: la
//    mediana tiene que quedarse donde estaba. (Dentro de un mundo no valdría: a las doscientas
//    generaciones casi todos descienden de un puñado de linajes, y esa mediana viaja como uno
//    solo, un 15% por puro azar.)
{
  const a = azarCon("deriva");
  const linajes: Genoma[] = [];
  for (let i = 0; i < 400; i++) {
    let g: Genoma = { ...CONFIG.fundador };
    for (let k = 0; k < 200; k++) g = mutar(a, g, CONFIG);
    linajes.push(g);
  }
  let peor = "", desvio = 0;
  for (const r of RASGOS) {
    if (r === "sociabilidad") continue; // el único aditivo: su cero no es una escala multiplicativa
    const d = mediana(linajes.map((g) => g[r])) / CONFIG.fundador[r] - 1;
    if (Math.abs(d) > Math.abs(desvio)) { desvio = d; peor = r; }
  }
  check("la mutación no empuja: 400 linajes, 200 generaciones",
    Math.abs(desvio) < 0.08, `el más desviado, ${peor}: ${(desvio * 100).toFixed(1)}%`);
}

// 5. La promesa de la semilla compartida: mismo mundo, mismo día, mismo estado. Se compara la
//    huella entera —posiciones, rumbos, reservas, carga y genes— y no solo el censo, que
//    coincidiría por casualidad.
{
  // **Comparar dos mundos extintos no prueba nada**, así que los tres determinismos de aquí abajo
  // exigen que `hola` llegue viva al día 150 — y lo exigen **en código**. Escrito solo en prosa, el
  // día que una perilla del mundo se lleve por delante a esa semilla los tres pasan en verde
  // comparando dos ceros, que es peor que fallar: la promesa deja de estar probada sin avisar.
  const a = crearMundo("hola"), b = crearMundo("hola");
  for (let d = 0; d < 150; d++) { correrDia(a); correrDia(b); }
  const enPie = !a.extinto && a.bichos.length >= 5;
  check("misma semilla → estado idéntico al día 150", enPie && huella(a) === huella(b),
    `censo=${a.bichos.length} día=${a.dia}`);

  // Y que la página no altere el mundo por mirarlo: el bucle de pintado da los ticks de uno en
  // uno y cierra el día a mano, en vez de llamar a `correrDia`. Los dos caminos son el mismo.
  const c = crearMundo("hola");
  for (let d = 0; d < 150 && !c.extinto; d++) {   // el mismo guardia que `correrDia` y que la página
    while (!tick(c));
    anochecer(c);
    if (!c.extinto) amanecer(c);
  }
  check("tick a tick = día de golpe", enPie && huella(a) === huella(c));

  // Y volver atrás: una copia guardada en el día 100 y vuelta a correr tiene que reconstruir el
  // mismo día 150, hasta el último bit. Si `copiar` se dejara algo —el estado del PRNG, sin ir más
  // lejos— nada fallaría: el mundo restaurado se separaría del original en silencio, y ahí se
  // acabaría la promesa de la semilla.
  const d = crearMundo("hola");
  let foto = d;
  for (let k = 0; k < 150; k++) { if (k === 100) foto = copiar(d); correrDia(d); }
  const rebobinado = copiar(foto);
  for (let k = 100; k < 150; k++) correrDia(rebobinado);
  check("volver a un día guardado y correr = no haber vuelto", enPie && huella(rebobinado) === huella(a),
    `día ${rebobinado.dia}, censo ${rebobinado.bichos.length}`);
}

// 6. La única indefinición numérica que el motor sí arregla: sin nada que ver y lejos del muro, el
//    vector suma es exactamente cero. Eso no es un ángulo indefinido que propague NaN, es mantener
//    el rumbo. (Que el bicho sea tonto no se arregla; que sea NaN, sí.)
{
  // Uno solo y sin comida: con dos se verían el uno al otro y girar dejaría de significar nada.
  const m = crearMundo("rumbo", { censoInicial: 1, comidas: 0 });
  const b = m.bichos[0];
  b.x = m.cfg.ancho / 2; b.y = m.cfg.alto / 2;
  b.hx = 1; b.hy = 0;
  for (let i = 0; i < 200; i++) tick(m);
  check("sin nada a la vista → mantiene el rumbo, no NaN",
    Number.isFinite(b.x) && Number.isFinite(b.hx) && Math.abs(b.hy) < 1e-12 && b.hx === 1,
    `rumbo=(${b.hx}, ${b.hy})`);
}

// 7. **Ningún gen es decorativo.** Se corren dos mundos con la misma semilla cambiando solo el
//    valor inicial de un gen: la huella al final **tiene que diferir**. Si no difiere, ese gen no
//    lo lee nadie y sobra del genoma.
//
//    Es la vara de medir qué significa que un gen «no haga nada», y distingue dos cosas que se
//    confunden con facilidad: un gen **decorativo** —cambiarlo deja el mundo bit a bit idéntico— y
//    uno **sin tendencia**, que sí cambia el mundo aunque la selección no lo empuje a ningún lado.
//
//    **El escenario solo vale si los dos mundos llegan vivos.** Las ventanas habitables son
//    estrechas —el `empuje` vive entre 1 y 2— y un cambio que extinga una de las dos partidas hace
//    pasar el test por el motivo equivocado: la huella difiere porque el mundo está muerto, no
//    porque el gen se lea. Por eso se prueba el cambio más pequeño que deje vivas a las dos, y si
//    ninguno lo consigue el test **falla**: sin escenario válido no hay nada que concluir.
{
  const vivo = (m: ReturnType<typeof crearMundo>) => !m.extinto && m.bichos.length >= 5;
  for (const r of RASGOS) {
    let veredicto = false, detalle = "ningún cambio deja vivas a las dos partidas";
    buscar:
    for (const f of [2, 1.5, 1.25, 1.1]) {
      for (const s of ["hola", "pablo", "mar"]) {
        // La sociabilidad es la única con signo y su cero no es una escala: se desplaza, no se escala.
        const g: Genoma = r === "sociabilidad"
          ? { ...CONFIG.fundador, [r]: CONFIG.fundador[r] + (f - 1) }
          : { ...CONFIG.fundador, [r]: CONFIG.fundador[r] * f };
        const a = crearMundo(s, {}), b = crearMundo(s, { fundador: g });
        for (let k = 0; k < 60; k++) { correrDia(a); correrDia(b); }
        if (!vivo(a) || !vivo(b)) continue;
        veredicto = huella(a) !== huella(b);
        detalle = `${s} ×${f}: censo ${a.bichos.length} vs ${b.bichos.length}`;
        break buscar;
      }
    }
    check(`el gen \`${r}\` cambia el mundo`, veredicto, detalle);
  }
}

console.log(fallos === 0 ? "\nTodo en orden." : `\n${fallos} fallo(s).`);
process.exit(fallos ? 1 : 0);
