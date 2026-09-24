// Las formas del mundo contra la caja — `npx tsx app/apps/evolution/formas.medir.ts [forma=ancho,…]`.
//
// **No es un test: no falla, mide.** Las mismas semillas en cada forma, con el clima que les toque,
// y lo que se compara es lo que fijó el tamaño de la caja: cuánta comida sobra al anochecer y cuántas
// noches queda el suelo limpio. Además, si la población aguanta y a dónde lleva cada forma los genes.
//
// Y **si la población se parte**. Cada forma se corta en sus salas —las dos mitades, las tres del
// trébol, cada isla— y se mide cuántos bichos cambian de sala al día y cuánto se separan los centros
// de las salas, en unidades de lo que se dispersa cada sala por dentro: por encima de 1, las salas son
// más distintas entre sí que un bicho corriente de la suya.
//
// Con argumentos se prueban medidas: `donut=210,islas=280` corre esas dos con ese ancho.

import { FUNDADOR, RASGOS, anochecer, amanecer, crearMundo, distancia, mediana, signado, tick, type Bicho, type Genoma } from "./engine";
import { FORMAS, MEDIDAS, type Forma, type Geometria } from "./formas";

const SEMILLAS = Array.from({ length: 24 }, (_, i) => `forma${i}`);
const DIAS = 300;

const pruebas: [Forma, number][] = process.argv[2]
  ? process.argv[2].split(",").map((a) => { const [f, n] = a.split("="); return [f as Forma, Number(n)]; })
  : FORMAS.map((f) => [f, MEDIDAS[f].ancho]);

const fmt = (n: number, d = 2) => (Number.isFinite(n) ? n.toFixed(d) : "—").padStart(7);
const centro = (gs: Genoma[]): Genoma => {
  const c = {} as Genoma;
  for (const r of RASGOS) c[r] = mediana(gs.map((g) => g[r]));
  return c;
};
const dispersion = (bs: Bicho[]) => {
  const c = centro(bs.map((b) => b.g));
  return mediana(bs.map((b) => distancia(b.g, c)));
};

/** La sala en la que está un punto. */
function sala(g: Geometria, x: number, y: number): number {
  const R = g.ancho / 2, ex = x - R, ey = y - R;
  if (g.forma === "trebol") {
    // Las salas miran arriba, abajo a la izquierda y abajo a la derecha: entre los brazos de la «Y».
    const s = Math.sqrt(3) / 2, dots = [-ey, -s * ex + 0.5 * ey, s * ex + 0.5 * ey];
    return dots.indexOf(Math.max(...dots));
  }
  return x < R ? 0 : 1;
}
const salas = (f: Forma) => (f === "trebol" ? 3 : 2);

console.log(["forma", "ancho", "vivas", "salas", "censo", "sobra%", "limpio%", ...RASGOS.map((r) => r.slice(0, 7)), "cruces", "separa"]
  .map((x) => String(x).padStart(7)).join(" "));

for (const [forma, ancho] of pruebas) {
  const cfg = { forma, ancho, alto: MEDIDAS[forma].alto === MEDIDAS[forma].ancho ? ancho : MEDIDAS[forma].alto };
  let vivas = 0;
  const censos: number[] = [], sobras: number[] = [], limpias: number[] = [], cruces: number[] = [];
  const separa: number[] = [], ocupadas: number[] = [];
  const genes: Record<string, number[]> = {};
  for (const r of RASGOS) genes[r] = [];
  for (const s of SEMILLAS) {
    const m = crearMundo(s, cfg);
    let sobra = 0, limpio = 0, dias = 0, cruza = 0;
    let donde = new Map<number, number>();
    for (let d = 0; d < DIAS && !m.extinto; d++) {
      for (;;) if (tick(m)) break;
      // Solo la segunda mitad: la primera es la población llenando el mundo.
      const cuenta = d >= DIAS / 2;
      if (cuenta) { sobra += m.comida.length / m.cfg.comidas; limpio += m.comida.length === 0 ? 1 : 0; dias++; }
      const hoy = new Map<number, number>();
      for (const b of m.bichos) {
        const k = sala(m.cfg, b.x, b.y);
        hoy.set(b.id, k);
        if (cuenta && donde.has(b.id) && donde.get(b.id) !== k) cruza++;
      }
      donde = hoy;
      anochecer(m);
      if (m.extinto) break;
      amanecer(m);
    }
    if (m.extinto) continue;
    vivas++;
    censos.push(m.bichos.length);
    sobras.push((100 * sobra) / dias);
    limpias.push((100 * limpio) / dias);
    cruces.push(cruza / dias);
    const c = centro(m.bichos.map((b) => b.g));
    for (const r of RASGOS) genes[r].push(signado(r) ? c[r] : c[r] / FUNDADOR[r]);
    const grupos = Array.from({ length: salas(forma) }, (_, k) => m.bichos.filter((b) => sala(m.cfg, b.x, b.y) === k));
    ocupadas.push(grupos.filter((gr) => gr.length > 0).length);
    const parejas = grupos.flatMap((_, i) => grupos.map((_, j) => [i, j]).filter(([a, b]) => a < b));
    const vals = parejas.filter(([a, b]) => grupos[a].length >= 3 && grupos[b].length >= 3).map(([a, b]) => {
      const dentro = (dispersion(grupos[a]) + dispersion(grupos[b])) / 2;
      return dentro > 0 ? distancia(centro(grupos[a].map((x) => x.g)), centro(grupos[b].map((x) => x.g))) / dentro : NaN;
    }).filter(Number.isFinite);
    if (vals.length) separa.push(vals.reduce((x, y) => x + y, 0) / vals.length);
  }
  console.log([forma, ancho, `${vivas}/${SEMILLAS.length}`, fmt(mediana(ocupadas), 0), fmt(mediana(censos), 0),
    fmt(mediana(sobras), 1), fmt(mediana(limpias), 0), ...RASGOS.map((r) => fmt(mediana(genes[r]))),
    fmt(mediana(cruces), 1), fmt(mediana(separa))].map((x) => String(x).padStart(7)).join(" "));
}

console.log("\nA leer: los genes van en múltiplos del fundador (la sociabilidad, en su valor). **salas** son las");
console.log("ocupadas al final; **cruces**, bichos al día que cambian de sala, y **separa**, lo lejos que están las");
console.log("salas en unidades de su dispersión interna. En la caja y el donut las salas son mitades sin nada en");
console.log("medio: son la referencia de cuánto separa la distancia sola.");
