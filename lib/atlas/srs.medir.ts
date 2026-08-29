// El medidor de los tres umbrales de la cola: `DESCANSO`, el listón que asienta un dato y
// `MAX_EN_EL_AIRE`. Fuera del build, como los tests: `npx tsx lib/atlas/srs.medir.ts`.
//
// Los tres se eligieron sobre dos escenas que no se parecen en nada. La **sesión activa**, donde
// decide el descanso: el freno puesto y el mazo entero repasado hace un rato, así que todo compite
// con sospechas de milésimas y el dato de menos vida —el que se acaba de fallar— gana el ranking
// una vez tras otra. Y la **tarde maratón**, donde deciden los otros dos: cientos de tarjetas
// seguidas sin que pase un solo día, que es la única manera de abrir el mazo de par en par.
import { calificar, DATOS, DESCANSO, MAX_EN_EL_AIRE, montar, siguiente, sospecha,
  type Dato, type Mazo, type Nota } from "./srs";
import { PAISES, PAIS_POR_ID } from "./paises";
import { RECORRIDO } from "@/data/atlas/orden";

const T0 = Date.parse("2026-08-28T18:00:00Z");
const SEGUNDOS_POR_TARJETA = 12; // lo que se tarda en mirar una tarjeta y calificarla
const TARJETAS = 25;
const LISTON = 4; // `VIDA_ASENTADO`, que no se exporta

type Perillas = { descanso: number; tope: number; liston: number };
const REALES: Perillas = { descanso: DESCANSO, tope: MAX_EN_EL_AIRE, liston: LISTON };

/** `siguiente` con los tres umbrales por fuera. Al final se comprueba que con los valores de
 *  verdad devuelve exactamente lo mismo que la función real, que es lo que la hace válida. */
function siguienteCon(mazo: Mazo, ahora: number, { descanso, tope, liston }: Perillas): string | null {
  let mejor: { id: string; s: number } | null = null;
  let respaldo: { id: string; s: number } | null = null;
  let enElAire = 0;
  for (const p of PAISES) {
    if (!DATOS.some((d) => mazo[p.id]?.[d])) continue;
    if (!DATOS.some((d) => (mazo[p.id]?.[d]?.vida ?? 0) >= liston)) enElAire++;
    for (const d of DATOS) {
      const estado = mazo[p.id]?.[d];
      const s = sospecha(estado, ahora);
      if (!respaldo || s > respaldo.s) respaldo = { id: p.id, s };
      if (estado && ahora - estado.visto < descanso) continue;
      if (!mejor || s > mejor.s) mejor = { id: p.id, s };
    }
  }
  const elegido = mejor ?? respaldo;
  const nuevo = RECORRIDO.find((id) => !DATOS.some((d) => mazo[id]?.[d]));
  const cede = (!elegido || elegido.s < 1) && enElAire < tope;
  return (cede && nuevo ? nuevo : elegido?.id ?? nuevo) ?? null;
}

/** Juega `tarjetas` seguidas desde `mazo`, calificando con `nota`. Devuelve a quién se preguntó. */
function jugar(mazo: Mazo, tarjetas: number, perillas: Perillas, nota: (primeraVez: boolean, i: number) => Nota) {
  const veces = new Map<string, number>();
  const paises = new Set<string>();
  for (let i = 0; i < tarjetas; i++) {
    const ahora = T0 + i * SEGUNDOS_POR_TARJETA * 1000;
    const id = siguienteCon(mazo, ahora, perillas);
    if (!id) break;
    const tarjeta = montar(mazo, PAIS_POR_ID.get(id)!, ahora);
    paises.add(id);
    for (const d of (tarjeta.primeraVez ? [...DATOS] : tarjeta.tapados) as Dato[]) {
      const clave = `${id}:${d}`;
      veces.set(clave, (veces.get(clave) ?? 0) + 1);
      mazo = calificar(mazo, id, d, nota(tarjeta.primeraVez, i), ahora);
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
function sesion(descanso: number, cadaCuantosFallo = 0) {
  const perillas = { ...REALES, descanso };
  let mazo = mazoEnSesion();
  const veces = new Map<string, number>();
  const paises = new Set<string>();
  let objetivo: string | null = null;
  let salio = 0, nuevos = 0;

  for (let i = 0; i < TARJETAS; i++) {
    const ahora = T0 + i * SEGUNDOS_POR_TARJETA * 1000;
    const id = siguienteCon(mazo, ahora, perillas);
    if (!id) break;
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
      mazo = calificar(mazo, id, d, falla ? "fallo" : "bien", ahora);
    }
  }
  return { paises: paises.size, datos: veces.size, salio, max: Math.max(...veces.values()) };
}

const etiqueta = (ms: number) => (ms === 0 ? "sin descanso" : `${ms / 60_000} min`) + (ms === DESCANSO ? "  ←" : "");
console.log(`SESIÓN ACTIVA · 35 países en el aire, ${TARJETAS} tarjetas a ${SEGUNDOS_POR_TARJETA} s\n`);
console.log("Fallando un dato en la primera tarjeta y acertando el resto:");
console.log("  descanso        veces sale lo fallado   países distintos");
for (const d of [0, 60_000, 2 * 60_000, 3 * 60_000, 5 * 60_000, 10 * 60_000]) {
  const r = sesion(d);
  console.log(`  ${etiqueta(d).padEnd(14)}  ${String(r.salio).padStart(20)}   ${String(r.paises).padStart(16)}`);
}
console.log("\nY fallando uno de cada cinco, que es lo que decide si la sesión se vuelve un carrusel:");
console.log("  descanso        países   datos distintos   máx veces un dato");
for (const d of [0, 60_000, 2 * 60_000, 3 * 60_000, 5 * 60_000, 10 * 60_000]) {
  const r = sesion(d, 5);
  console.log(`  ${etiqueta(d).padEnd(14)}  ${String(r.paises).padStart(6)}   ${String(r.datos).padStart(15)}   ${String(r.max).padStart(17)}`);
}

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
  for (const tope of [15, 20, 30]) {
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
  for (let i = 0; i < 300; i++) {
    const ahora = T0 + i * SEGUNDOS_POR_TARJETA * 1000;
    const a = siguienteCon(mazo, ahora, REALES);
    const b = siguiente(mazo, RECORRIDO, ahora);
    if (a !== (b?.id ?? null)) throw new Error(`la copia se separa de \`siguiente\` en el paso ${i}: ${a} vs ${b?.id}`);
    if (!a) break;
    const tarjeta = montar(mazo, PAIS_POR_ID.get(a)!, ahora);
    for (const d of (tarjeta.primeraVez ? [...DATOS] : tarjeta.tapados) as Dato[]) {
      mazo = calificar(mazo, a, d, i % 5 === 0 ? "fallo" : "bien", ahora);
    }
  }
  console.log("\n✓ la copia con perillas coincide con `siguiente` en 300 pasos");
}
