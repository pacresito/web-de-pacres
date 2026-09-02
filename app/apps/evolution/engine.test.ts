// Los cinco tests del motor de evolution — `npx tsx app/apps/evolution/engine.test.ts`.
// No es parte del build; verifica el mundo sin navegador.
//
// **No comprueban código: comprueban predicciones evolutivas falsables.** Que una función
// devuelva lo que devuelve no dice nada de si la simulación es honesta; que la escasez de comida
// seleccione más ojo, sí. Y cuando uno falla, lo primero que hay que sospechar es el mundo y no
// la predicción: el de la escasez midió el signo contrario durante un día entero, y no era
// ecología — los parches nacían medio fuera del mapa y su comida se recortaba contra el muro,
// así que los mundos ricos tenían una despensa pegada a la pared que nadie había modelado.
//
// Por eso son caros —minutos, no milisegundos— y por eso cada escenario corre varias semillas y
// compara **medianas**: una semilla sola dice tanto del azar que le tocó como del mundo.
import {
  crearMundo, avanzar, resumen, mediana, huella, balance, mutar, azarCon,
  RASGOS, CONFIG, type Config, type Genoma,
} from "./engine";

let fallos = 0;
function check(nombre: string, ok: boolean, detalle = "") {
  console.log(`${ok ? "✓" : "✗"} ${nombre}${detalle ? "  " + detalle : ""}`);
  if (!ok) fallos++;
}

const SEMILLAS = ["hola", "pablo", "claudio", "mar", "brizna", "raiz"];
const TICKS = 9000;

/** Corre un escenario en todas las semillas y devuelve la mediana de las medianas. */
function escenario(cfg: Partial<Config>) {
  const vel: number[] = [], vis: number[] = [], tal: number[] = [];
  for (const s of SEMILLAS) {
    const m = crearMundo(s, cfg);
    avanzar(m, TICKS);
    if (m.extinto || m.bichos.length < 5) continue; // una semilla extinta no vota
    const r = resumen(m);
    vel.push(r.velocidad); vis.push(r.medianas.vision); tal.push(r.medianas.talla);
  }
  return { vivas: vel.length, velocidad: mediana(vel), vision: mediana(vis), talla: mediana(tal) };
}

// Los tres primeros tests son el mismo mundo con la comida puesta de otra manera. `rala` y `rica`
// son los extremos de densidad, separados por ×16: entre densidades vecinas la diferencia es
// menor que lo que se mueve la mediana de seis semillas, y un test que no distingue la señal del
// azar no mide el mundo, tira una moneda.
//
// `escasa` y `concentrada` son el par del tercer test: producen **lo mismo por tick** (parches ×
// brote = 3 bocados) y entre ellas solo cambia la geometría, así que ese test compara
// concentración contra dispersión y no, sin querer, abundancia contra escasez.
const RALA: Partial<Config> = { parches: 24, radioParche: 130, brote: 0.0625, caza: false };
const RICA: Partial<Config> = { parches: 24, radioParche: 130, brote: 1, caza: false };
const ESCASA: Partial<Config> = { parches: 24, radioParche: 130, brote: 0.125, caza: false };
const CONCENTRADA: Partial<Config> = { parches: 6, radioParche: 40, brote: 0.5, caza: false };

console.log("Corriendo escenarios (esto tarda unos minutos)…\n");
const rala = escenario(RALA);
const rica = escenario(RICA);
const escasa = escenario(ESCASA);
const concentrada = escenario(CONCENTRADA);
const cifras = (n: string, e: ReturnType<typeof escenario>) =>
  `${n}: v=${e.velocidad.toFixed(3)} visión=${e.vision.toFixed(1)} talla=${e.talla.toFixed(2)} (${e.vivas}/${SEMILLAS.length} vivas)`;
for (const [n, e] of [["rala", rala], ["rica", rica],
                      ["escasa", escasa], ["concentrada", concentrada]] as const) console.log(cifras(n, e));
console.log("");

// 1 y 2, en uno: **la escasez selecciona ojo y piernas.** Si hay que recorrer el mundo para
// comer, correr y ver antes se pagan solos; si la comida sobra, moverse es gasto.
//
// **Compara los extremos y no encadena densidades**, porque entre densidades vecinas no hay nada
// que medir: con 12 semillas y brotes de ×4 en ×4, la velocidad sale 0,593 → 0,568 → 0,568 y la
// visión 18,9 → 16,8 → 17,6, con rangos por semilla de 0,51 a 0,74. Solo el extremo pobre se
// separa, y poco: **+4% en velocidad y +8% en visión**, así que este es el test que más cerca
// está de decidirse por azar de los cinco.
//
// Ese margen estrecho no es un umbral mal puesto, es el diagnóstico que ya está en el plan: el
// 90% de los bichos **vivos** tiene comida a la vista en cualquier geometría, porque el que no la
// tiene se muere. Mientras buscar no cueste de verdad, estos dos genes no pueden estar muy
// seleccionados. Si el test se pone rojo, se mira el mundo —y la cantidad de comida que sostiene
// a la vez—, nunca el umbral.
{
  check("comida escasa → suben velocidad y visión",
    rala.vivas >= 3 && rica.vivas >= 3 && rala.velocidad > rica.velocidad && rala.vision > rica.vision,
    `v ${rica.velocidad.toFixed(3)}→${rala.velocidad.toFixed(3)}, visión ${rica.vision.toFixed(1)}→${rala.vision.toFixed(1)}`);
}

// 3. La misma escasez, concentrada en pocos parches: correr al azar no vale, hay que encontrar el
//    parche. Puede fallar, y si falla enseña algo.
{
  // Contra `escasa`, que produce lo mismo: lo único que cambia es dónde está la comida.
  const rv = concentrada.velocidad / escasa.velocidad;
  const rvis = concentrada.vision / escasa.vision;
  check("comida concentrada en parches → la visión sube más que la velocidad",
    concentrada.vivas >= 3 && rvis > rv,
    `visión ×${rvis.toFixed(2)} vs velocidad ×${rv.toFixed(2)}`);
}

// 4. Sin selección los genes derivan, pero **sin dirección**. Si se van sistemáticamente hacia el
//    mismo lado, el sesgo está en la mutación, no en el mundo — que es justo lo que la mutación
//    multiplicativa está puesta para no tener.
//
//    Va en dos pasos porque el mundo neutral solo sirve para lo gordo: al cabo de doscientas
//    generaciones la población ha coalescido —casi todos descienden de un puñado de linajes—, así
//    que su mediana viaja como un solo linaje y se mueve un 15% por puro azar. Con eso no se
//    distingue un sesgo del 1% por generación. Los linajes independientes sí.
{
  // (a) La mutación sola, sin mundo: cuatrocientos linajes que no compiten entre sí y por tanto no
  //     coalescen. Aquí la mediana sí tiene que quedarse donde estaba.
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
{
  // (b) Y el mundo neutral entero, por si el sesgo estuviera en el camino de la reproducción y no
  //     en la mutación. Umbral ancho a propósito: aquí solo cabe cazar un sesgo grosero.
  const desvios: number[] = [];
  for (const s of SEMILLAS) {
    const m = crearMundo(s, { neutral: 250, censoInicial: 250 });
    avanzar(m, 8000);
    const med = resumen(m).medianas;
    for (const r of RASGOS) if (r !== "sociabilidad") desvios.push(med[r] / (m.eva as Genoma)[r] - 1);
  }
  const con = desvios.reduce((a, b) => a + b, 0) / desvios.length;
  const sin = desvios.reduce((a, b) => a + Math.abs(b), 0) / desvios.length;
  check("sin selección → los genes derivan sin dirección",
    Math.abs(con) < sin * 0.5, `desvío medio ${(con * 100).toFixed(0)}% sobre un movimiento medio del ${(sin * 100).toFixed(0)}%`);
}

// 5. La promesa de la semilla compartida: mismo mundo, mismo tick, mismo estado. Se compara la
//    huella entera —posiciones, rumbos, reservas y genes— y no solo el censo, que coincidiría por
//    casualidad.
{
  const a = crearMundo("determinismo");
  const b = crearMundo("determinismo");
  avanzar(a, 10000);
  avanzar(b, 10000);
  check("misma semilla → estado idéntico al tick 10.000", huella(a) === huella(b),
    `censo=${a.bichos.length} gen=${resumen(a).gen}`);
  const c = crearMundo("determinismo");
  for (let i = 0; i < 10000; i++) avanzar(c, 1); // avanzar de uno en uno no puede diferir de golpe
  check("avanzar en trozos = avanzar de golpe", huella(a) === huella(c));
}

// Y la contabilidad, que no es una predicción sino la condición para que las cinco signifiquen
// algo: con presupuesto cerrado la energía del mundo no puede cambiar ni un poco.
{
  const m = crearMundo("balance");
  const e0 = balance(m);
  let peor = 0;
  for (let i = 0; i < 60; i++) {
    avanzar(m, 100);
    peor = Math.max(peor, Math.abs(balance(m) - e0) / e0);
  }
  check("energía cerrada: el balance no se mueve", peor < 1e-9, `desvío máximo ${peor.toExponential(1)}`);
}

// La única indefinición numérica que el motor sí arregla: sin nada que ver y lejos del muro, el
// vector suma es exactamente cero. Eso no es un ángulo indefinido que propague NaN, es mantener
// el rumbo. (Que el bicho sea tonto no se arregla; que sea NaN, sí.)
{
  // Un fundador que no puede criar: con el umbral por las nubes nunca se divide, y el mundo se
  // queda con un solo bicho. Con dos, se ven el uno al otro y girar deja de significar nada.
  const m = crearMundo("rumbo", {
    censoInicial: 1, parches: 0, brote: 0, senescencia: 0, hambre: false,
    fundador: { ...CONFIG.fundador, umbral: 1e9 },
  });
  m.comida.length = 0;
  const b = m.bichos[0];
  b.x = m.cfg.ancho / 2; b.y = m.cfg.alto / 2;
  b.hx = 1; b.hy = 0;
  for (let i = 0; i < 200; i++) avanzar(m, 1);
  check("sin nada a la vista → mantiene el rumbo, no NaN",
    Number.isFinite(b.x) && Number.isFinite(b.hx) && Math.abs(b.hy) < 1e-12 && b.hx === 1,
    `rumbo=(${b.hx}, ${b.hy})`);
}

console.log(fallos === 0 ? "\nTodo en orden." : `\n${fallos} fallo(s).`);
process.exit(fallos ? 1 : 0);
