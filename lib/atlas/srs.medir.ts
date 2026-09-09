// El medidor de los tres umbrales de la cola: `DESCANSO`, el listón que asienta un dato y
// `MAX_EN_EL_AIRE`. Fuera del build, como los tests: `npx tsx lib/atlas/srs.medir.ts`.
//
// Los tres se eligieron sobre dos escenas que no se parecen en nada. La **sesión activa**, donde
// decide el descanso: el freno puesto y el mazo entero repasado hace un rato, así que todo compite
// con sospechas de milésimas y el dato de menos vida —el que se acaba de fallar— gana el ranking
// una vez tras otra. Y la **tarde maratón**, donde deciden los otros dos: cientos de tarjetas
// seguidas sin que pase un solo día, que es la única manera de abrir el mazo de par en par.
import { calificar, DATOS, DESCANSO, HUECO, MAX_EN_EL_AIRE, montar, nuevosAciertos, siguiente,
  sospecha, type Dato, type Mazo, type Nota } from "./srs";
import { PAISES, PAIS_POR_ID } from "./paises";
import { RECORRIDO } from "@/data/atlas/orden";

const T0 = Date.parse("2026-08-28T18:00:00Z");
const SEGUNDOS_POR_TARJETA = 12; // lo que se tarda en mirar una tarjeta y calificarla
const TARJETAS = 50;
const LISTON = 4;      // `VIDA_ASENTADO`, que no se exporta
const VIDA_OLVIDO = 0.001;  // lo que deja un «no» de algo ya conocido; tampoco se exporta
const VIDA_ESTRENO = 0.01;  // ni lo que deja el «no» de la primera vez

/** `plano` frena a todos por igual en vez de por `min(vida, descanso)`: sirve para medir la
 *  diferencia, que es lo que justifica que el freno mire la vida de cada dato. */
type Perillas = { descanso: number; tope: number; liston: number; vidaOlvido: number; plano: boolean; hueco: number };
const REALES: Perillas = { descanso: DESCANSO, tope: MAX_EN_EL_AIRE, liston: LISTON, vidaOlvido: VIDA_OLVIDO, plano: false, hueco: HUECO };
const DIA = 86_400_000;

/** `calificar` con las dos vidas que deja un «no» por fuera: la del estreno y la del olvido, que
 *  son las que separan la ronda de estrenos de lo que hay que reaprender hoy. */
function calificarCon(mazo: Mazo, id: string, d: Dato, nota: Nota, ahora: number,
                      vidaOlvido: number, vidaEstreno = VIDA_ESTRENO): Mazo {
  const previo = mazo[id]?.[d];
  if (nota !== "fallo") return calificar(mazo, id, d, nota, ahora);
  const vida = previo ? vidaOlvido : vidaEstreno;
  return { ...mazo, [id]: { ...mazo[id], [d]: { visto: ahora, vida, aciertos: nuevosAciertos(previo, nota) } } };
}

/** `siguiente` con los tres umbrales por fuera. Al final se comprueba que con los valores de
 *  verdad devuelve exactamente lo mismo que la función real, que es lo que la hace válida. */
function siguienteCon(mazo: Mazo, ahora: number, { descanso, tope, liston, plano, hueco }: Perillas, recientes: string[] = []): string | null {
  let mejor: { id: string; s: number } | null = null;
  let libre: { id: string; s: number } | null = null;
  let respaldo: { id: string; s: number } | null = null;
  let enElAire = 0;
  for (const p of PAISES) {
    if (!DATOS.some((d) => mazo[p.id]?.[d])) continue;
    if (!DATOS.some((d) => (mazo[p.id]?.[d]?.vida ?? 0) >= liston)) enElAire++;
    const acabaDeSalir = hueco > 0 && recientes.slice(-hueco).includes(p.id);
    for (const d of DATOS) {
      const estado = mazo[p.id]?.[d];
      const s = sospecha(estado, ahora);
      if (!respaldo || s > respaldo.s) respaldo = { id: p.id, s };
      if (acabaDeSalir) continue;
      if (!libre || s > libre.s) libre = { id: p.id, s };
      const espera = plano ? descanso : Math.min(estado ? estado.vida * DIA : 0, descanso);
      if (estado && ahora - estado.visto < espera) continue;
      if (!mejor || s > mejor.s) mejor = { id: p.id, s };
    }
  }
  const elegido = mejor ?? libre ?? respaldo;
  const nuevo = RECORRIDO.find((id) => !DATOS.some((d) => mazo[id]?.[d]));
  const cede = (!respaldo || respaldo.s < 1) && enElAire < tope;
  return (cede && nuevo ? nuevo : elegido?.id ?? nuevo) ?? null;
}

/** Juega `tarjetas` seguidas desde `mazo`, calificando con `nota`. Devuelve a quién se preguntó. */
function jugar(mazo: Mazo, tarjetas: number, perillas: Perillas, nota: (primeraVez: boolean, i: number) => Nota) {
  const veces = new Map<string, number>();
  const paises = new Set<string>();
  let recientes: string[] = [];
  for (let i = 0; i < tarjetas; i++) {
    const ahora = T0 + i * SEGUNDOS_POR_TARJETA * 1000;
    const id = siguienteCon(mazo, ahora, perillas, recientes);
    if (!id) break;
    recientes = [...recientes, id].slice(-perillas.hueco || undefined);
    const tarjeta = montar(mazo, PAIS_POR_ID.get(id)!, ahora);
    paises.add(id);
    for (const d of (tarjeta.primeraVez ? [...DATOS] : tarjeta.tapados) as Dato[]) {
      const clave = `${id}:${d}`;
      veces.set(clave, (veces.get(clave) ?? 0) + 1);
      mazo = calificarCon(mazo, id, d, nota(tarjeta.primeraVez, i), ahora, perillas.vidaOlvido);
    }
  }
  return { mazo, paises, veces };
}

// ── El descanso ─────────────────────────────────────────────────────────────────────────────
/** Treinta y cinco países empezados y ninguno asentado: el freno puesto, no entran nuevos. */
function mazoEnSesion(): Mazo {
  const mazo: Mazo = {};
  RECORRIDO.slice(0, 35).forEach((id, i) => {
    mazo[id] = {};
    for (const [j, d] of DATOS.entries()) {
      const vida = 2 + ((i * 7 + j * 3) % 2); // 2..3 días, por debajo del listón
      mazo[id]![d] = { vida, aciertos: 0, visto: T0 - (3 + ((i * 5 + j * 11) % 35)) * 60_000 };
    }
  });
  return mazo;
}

/** Una sesión donde se falla el primer dato que se pregunta —al que se sigue la pista— y, si se
 *  pide, uno de cada `cadaCuantosFallo` datos nuevos. Lo ya visto siempre se acierta. */
function sesion(perillas: Perillas, cadaCuantosFallo = 0) {
  let mazo = mazoEnSesion();
  const veces = new Map<string, number>();
  const paises = new Set<string>();
  let objetivo: string | null = null;
  let salio = 0, nuevos = 0;
  let recientes: string[] = [];

  for (let i = 0; i < TARJETAS; i++) {
    const ahora = T0 + i * SEGUNDOS_POR_TARJETA * 1000;
    const id = siguienteCon(mazo, ahora, perillas, recientes);
    if (!id) break;
    recientes = [...recientes, id].slice(-perillas.hueco || undefined);
    const tarjeta = montar(mazo, PAIS_POR_ID.get(id)!, ahora);
    paises.add(id);
    for (const d of (tarjeta.primeraVez ? [...DATOS] : tarjeta.tapados) as Dato[]) {
      const clave = `${id}:${d}`;
      const primeraVista = !veces.has(clave);
      veces.set(clave, (veces.get(clave) ?? 0) + 1);
      objetivo ??= clave;
      if (clave === objetivo) salio++;
      const falla = clave === objetivo ? i === 0
        : cadaCuantosFallo > 0 && primeraVista && nuevos++ % cadaCuantosFallo === 0;
      mazo = calificarCon(mazo, id, d, falla ? "fallo" : "bien", ahora, perillas.vidaOlvido);
    }
  }
  return { paises: paises.size, datos: veces.size, salio, max: Math.max(...veces.values()) };
}

const esLaReal = (p: Perillas) => p.descanso === DESCANSO && !p.plano && p.vidaOlvido === VIDA_OLVIDO;
function fila(nombre: string, p: Perillas) {
  const r = sesion(p, 3);
  console.log(`  ${(nombre + (esLaReal(p) ? "  ←" : "")).padEnd(32)} ${String(r.paises).padStart(6)}   ${String(r.datos).padStart(15)}   ${String(r.max).padStart(17)}   ${String(r.salio).padStart(15)}`);
}
const CABECERA = "  reglas                           países   datos distintos   máx veces un dato   sale el fallado";

console.log(`SESIÓN ACTIVA · 35 países en el aire, ${TARJETAS} tarjetas a ${SEGUNDOS_POR_TARJETA} s, fallando una de cada tres\n`);
console.log("El freno, que es `min(vida del dato, DESCANSO)`:");
console.log(CABECERA);
for (const d of [0, 3 * 60_000, DESCANSO, 30 * 60_000])
  fila(d === 0 ? "sin descanso" : `descanso ${d / 60_000} min`, { ...REALES, descanso: d });
fila("plano: 15 min a todos por igual", { ...REALES, plano: true });
console.log("\n  Sin freno la sesión se estrecha a la mitad de países y un dato sale nueve veces. Plano se va");
console.log("  por el otro lado: dura más que la sesión, así que aparta lo fallado en vez de traerlo de");
console.log("  vuelta —sale una sola vez—. Esperando `min(vida, tope)`, ni una cosa ni la otra.\n");

console.log("Y la vida de un olvido, que es lo único que frena a lo que se acaba de fallar:");
console.log(CABECERA);
for (const v of [0.0005, VIDA_OLVIDO, 0.002, 0.01])
  fila(`vida de un olvido ${v} d (${Math.round(v * 86_400)} s)`, { ...REALES, vidaOlvido: v });
console.log("\n  Es también lo que espera un fallo antes de volver, porque su vida es menor que el tope.");
console.log("  Por debajo de minuto y medio empieza a comerse la sesión; por encima se sale de ella.");

// ── El hueco ────────────────────────────────────────────────────────────────────────────────
// El descanso va por dato, así que no impide que el mismo país vuelva enseguida con otro de sus
// cuatro. Se mide donde aprieta: un mazo recién empezado, con diez países y un solo dato cada uno.
function novato(): Mazo {
  const mazo: Mazo = {};
  RECORRIDO.slice(0, 10).forEach((id, i) => {
    mazo[id] = { nombre: { vida: 1 + (i % 3), aciertos: 0, visto: T0 - (5 + i * 3) * 60_000 } };
  });
  return mazo;
}
function conHueco(hueco: number) {
  const perillas = { ...REALES, hueco };
  let mazo = novato(), recientes: string[] = [];
  const veces = new Map<string, number>();
  let seguidos = 0, respaldos = 0, previo: string | null = null;
  for (let i = 0; i < TARJETAS; i++) {
    const ahora = T0 + i * SEGUNDOS_POR_TARJETA * 1000;
    const id = siguienteCon(mazo, ahora, perillas, recientes);
    if (!id) break;
    // Sin nadie disponible manda el respaldo, que es la señal de que el freno se ha pasado.
    if (siguienteCon(mazo, ahora, { ...perillas, hueco: 0 }) === null) respaldos++;
    if (id === previo) seguidos++;
    previo = id;
    veces.set(id, (veces.get(id) ?? 0) + 1);
    recientes = [...recientes, id].slice(-hueco || undefined);
    const tarjeta = montar(mazo, PAIS_POR_ID.get(id)!, ahora);
    for (const d of (tarjeta.primeraVez ? [...DATOS] : tarjeta.tapados) as Dato[])
      mazo = calificar(mazo, id, d, i % 3 === 0 ? "fallo" : "bien", ahora);
  }
  return { paises: veces.size, max: Math.max(...veces.values()), seguidos, respaldos };
}
console.log(`\n\nEL HUECO · mazo de diez países, ${TARJETAS} tarjetas · el país no repite hasta que pasan otros\n`);
console.log("  hueco   países   máx veces un país   sale dos veces seguidas   se queda sin cola");
for (const h of [0, 3, HUECO, 8]) {
  const r = conHueco(h);
  console.log(`  ${(String(h) + (h === HUECO ? "  ←" : "")).padEnd(7)} ${String(r.paises).padStart(6)}   ${String(r.max).padStart(17)}   ${String(r.seguidos).padStart(23)}   ${String(r.respaldos).padStart(17)}`);
}
console.log("\n  Sin hueco un país se lleva dos tercios de la sesión, y veinte veces es el de al lado: el");
console.log("  descanso va por dato y le quedan otros tres que preguntar. Y ningún hueco de los medidos");
console.log("  deja la cola vacía ni con este mazo, que es el más pequeño que puede haber.");

// ── La ronda de estrenos ────────────────────────────────────────────────────────────────────
// Nada se estrena mientras algo haya pasado su vida, así que lo que dura el «no» de un estreno es
// lo que dura la ronda. Se mide desde cero, abriendo países y fallando un dato de cada uno.
function ronda(vidaEstreno: number) {
  let mazo: Mazo = {}, recientes: string[] = [];
  const estrenos: number[] = [];
  for (let i = 0; i < 80; i++) {
    const ahora = T0 + i * SEGUNDOS_POR_TARJETA * 1000;
    const id = siguienteCon(mazo, ahora, REALES, recientes);
    if (!id) break;
    const tarjeta = montar(mazo, PAIS_POR_ID.get(id)!, ahora);
    if (tarjeta.primeraVez) estrenos.push(i + 1);
    recientes = [...recientes, id].slice(-HUECO);
    // Del estreno se falla el primero de los cuatro; lo demás se acierta.
    const datos = (tarjeta.primeraVez ? [...DATOS] : tarjeta.tapados) as Dato[];
    for (const [j, d] of datos.entries())
      mazo = calificarCon(mazo, id, d, tarjeta.primeraVez && j === 0 ? "fallo" : "bien", ahora,
                          VIDA_OLVIDO, vidaEstreno);
  }
  return estrenos;
}
console.log(`\n\nLA RONDA DE ESTRENOS · desde cero, fallando un dato de cada país que se abre\n`);
console.log("  el «no» de un estreno dura   países abiertos   en qué tarjetas");
for (const v of [VIDA_OLVIDO, 0.005, VIDA_ESTRENO]) {
  const e = ronda(v);
  console.log(`  ${(Math.round(v * 1440) + " min" + (v === VIDA_ESTRENO ? "  ←" : "")).padEnd(28)} ${String(e.length).padStart(15)}   ${e.join(", ")}`);
}
console.log("\n  Con el plazo corto la ronda se parte por donde vence el primer «no» —la octava tarjeta— y los");
console.log("  que faltan esperan a que se repase lo abierto. Con el cuarto de hora caben los del tope");
console.log("  seguidos, que es como se estrena: de golpe y mirándolos juntos.");

// ── El listón y el tope ─────────────────────────────────────────────────────────────────────
// Cuántos países abre una tarde de cuatrocientas tarjetas desde cero. Es la escena entera: en el
// uso de todos los días el freno frena una tarjeta de cada cien y el listón no se nota.
const GUIONES: [string, (primeraVez: boolean, i: number) => Nota][] = [
  ["«fácil» a todo lo nuevo", (primeraVez) => (primeraVez ? "facil" : "bien")],
  ["«fácil» a uno de cada tres", (_p, i) => (i % 3 === 0 ? "facil" : "bien")],
  ["todo «bien»", () => "bien"],
];
const LISTONES = [4, 5, 6, 8];
console.log(`\n\nTARDE MARATÓN · 400 tarjetas seguidas desde cero · países que se abren\n`);
console.log("  guion                         tope  " + LISTONES.map((l) => `listón ${l}`.padStart(10)).join(""));
for (const [nombre, nota] of GUIONES) {
  for (const tope of [MAX_EN_EL_AIRE, 15, 20, 30]) {
    const fila = LISTONES.map((liston) => {
      const marca = liston === LISTON && tope === MAX_EN_EL_AIRE ? "←" : " ";
      return `${jugar({}, 400, { ...REALES, tope, liston }, nota).paises.size}${marca}`.padStart(10);
    }).join("");
    console.log(`  ${nombre.padEnd(28)}  ${String(tope).padStart(4)}  ${fila}`);
  }
}
console.log("\n  Con el listón en el arranque de «fácil» —el que está puesto— decir «me lo sé» asienta el");
console.log("  país en el acto y el freno solo dosifica lo que hay que aprender: el maratón de «bien» se");
console.log("  para en el tope exacto y el de «fácil» abre lo que quiera. Subirlo un día cierra también");
console.log("  esa puerta; 5, 6 y 8 dan lo mismo porque la escalera de vidas salta de 4 a 8.");

// ── La copia solo vale si no se separa de la real ────────────────────────────────────────────
{
  let mazo = mazoEnSesion();
  let recientes: string[] = [];
  for (let i = 0; i < 300; i++) {
    const ahora = T0 + i * SEGUNDOS_POR_TARJETA * 1000;
    const a = siguienteCon(mazo, ahora, REALES, recientes);
    const b = siguiente(mazo, RECORRIDO, ahora, recientes);
    if (a !== (b?.id ?? null)) throw new Error(`la copia se separa de \`siguiente\` en el paso ${i}: ${a} vs ${b?.id}`);
    if (!a) break;
    recientes = [...recientes, a].slice(-HUECO);
    const tarjeta = montar(mazo, PAIS_POR_ID.get(a)!, ahora);
    for (const d of (tarjeta.primeraVez ? [...DATOS] : tarjeta.tapados) as Dato[]) {
      mazo = calificar(mazo, a, d, i % 5 === 0 ? "fallo" : "bien", ahora);
    }
  }
  console.log("\n✓ la copia con perillas coincide con `siguiente` en 300 pasos");
}
