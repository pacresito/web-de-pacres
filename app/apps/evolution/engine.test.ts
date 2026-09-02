// Los cinco tests del motor de evolution — `npx tsx app/apps/evolution/engine.test.ts`.
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

/** Corre un escenario en todas las semillas y devuelve la mediana de las medianas. */
function escenario(cfg: Partial<Config>) {
  const g = { talla: [] as number[], vision: [] as number[], retorno: [] as number[] };
  let vivas = 0;
  for (const s of SEMILLAS) {
    const m = crearMundo(s, cfg);
    for (let d = 0; d < DIAS && !m.extinto; d++) correrDia(m);
    if (m.extinto || m.bichos.length < 5) continue; // una semilla extinta no vota
    vivas++;
    const r = resumen(m);
    g.talla.push(r.medianas.talla); g.vision.push(r.medianas.vision); g.retorno.push(r.medianas.retorno);
  }
  return { vivas, talla: mediana(g.talla), vision: mediana(g.vision), retorno: mediana(g.retorno) };
}

// Cuatro escenarios y tres perillas, cada una separada por lo suficiente para salir del ruido: la
// comida del día (×5,7), la depredación (encendida o apagada) y la despensa (×3,3). Todos están
// **dentro de la ventana viable** —de 5 a 9 semillas de 12 llegan al día 150—, que es estrecha y
// hay que respetarla: con 40 bocados solo sobreviven 3 y una mediana de 3 no es una mediana.
const POBRE: Partial<Config> = { comidas: 70 };
const RICO: Partial<Config> = { comidas: 400 };
const SIN_CAZA: Partial<Config> = { caza: false };
const DESPENSA_CORTA: Partial<Config> = { capReserva: 0.6 };
const DESPENSA_LARGA: Partial<Config> = { capReserva: 2 };

console.log("Corriendo escenarios (esto tarda unos minutos)…\n");
const pobre = escenario(POBRE), rico = escenario(RICO);
const sinCaza = escenario(SIN_CAZA), conCaza = escenario({});
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
  // Una semilla que llega viva al día 150: comparar dos mundos extintos no prueba nada.
  const a = crearMundo("hola"), b = crearMundo("hola");
  for (let d = 0; d < 150; d++) { correrDia(a); correrDia(b); }
  check("misma semilla → estado idéntico al día 150", huella(a) === huella(b),
    `censo=${a.bichos.length} día=${a.dia}`);

  // Y que la página no altere el mundo por mirarlo: el bucle de pintado da los ticks de uno en
  // uno y cierra el día a mano, en vez de llamar a `correrDia`. Los dos caminos son el mismo.
  const c = crearMundo("hola");
  for (let d = 0; d < 150 && !c.extinto; d++) {   // el mismo guardia que `correrDia` y que la página
    while (!tick(c));
    anochecer(c);
    if (!c.extinto) amanecer(c);
  }
  check("tick a tick = día de golpe", huella(a) === huella(c));

  // Y volver atrás: una copia guardada en el día 100 y vuelta a correr tiene que reconstruir el
  // mismo día 150, hasta el último bit. Si `copiar` se dejara algo —el estado del PRNG, sin ir más
  // lejos— nada fallaría: el mundo restaurado se separaría del original en silencio, y ahí se
  // acabaría la promesa de la semilla.
  const d = crearMundo("hola");
  let foto = d;
  for (let k = 0; k < 150; k++) { if (k === 100) foto = copiar(d); correrDia(d); }
  const rebobinado = copiar(foto);
  for (let k = 100; k < 150; k++) correrDia(rebobinado);
  check("volver a un día guardado y correr = no haber vuelto", huella(rebobinado) === huella(a),
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

console.log(fallos === 0 ? "\nTodo en orden." : `\n${fallos} fallo(s).`);
process.exit(fallos ? 1 : 0);
