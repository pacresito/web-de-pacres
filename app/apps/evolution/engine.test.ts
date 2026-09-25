// Tests del motor — `npx tsx app/apps/evolution/engine.test.ts`. Fuera del build.
//
// Comprueban predicciones evolutivas falsables, no funciones: por eso tardan minutos y cada
// escenario compara medianas de varias semillas. Si uno falla, sospechar antes del mundo.
import { azarCon } from "./azar";
import {
  CONFIG, RASGOS, amanecer, anochecer, copiar, correrDia, crearMundo, huella, mediana,
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
 * La mediana de las medianas de un escenario en todas las semillas. El plazo es el más largo en
 * que las dos mitades de la comparación siguen vivas: si no, se mide quién sobrevivió.
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

// Tres perillas, separadas lo bastante para salir del ruido y dentro de la ventana viable. La caza
// se mide a 80 días porque sin ella la población acaba desplomándose hacia el día 110.
const POBRE: Partial<Config> = { comidas: 70 };
const RICO: Partial<Config> = { comidas: 400 };
const SIN_CAZA: Partial<Config> = { caza: false };
// La despensa, contra la normal: por debajo se extingue más de la mitad de las semillas.
const DESPENSA_LARGA: Partial<Config> = { capReserva: 2.5 };

console.log("Corriendo escenarios (esto tarda unos minutos)…\n");
const pobre = escenario(POBRE), rico = escenario(RICO);
const DIAS_CAZA = 80;
const sinCaza = escenario(SIN_CAZA, DIAS_CAZA), conCaza = escenario({}, DIAS_CAZA);
const normal = escenario({}), larga = escenario(DESPENSA_LARGA);
const cifras = (n: string, e: ReturnType<typeof escenario>) =>
  `${n}: talla=${e.talla.toFixed(2)} visión=${e.vision.toFixed(1)} retorno=${e.retorno.toFixed(2)} (${e.vivas}/${SEMILLAS.length} vivas)`;
for (const [n, e] of [["pobre", pobre], ["rico", rico], ["sin caza", sinCaza], ["con caza", conCaza],
                      ["despensa normal", normal], ["despensa larga", larga]] as const) console.log(cifras(n, e));
console.log("");

// 1. La abundancia hace gigantes: ser grande se paga dos veces (gasto e hijos) y solo compensa con
//    comida de sobra.
check("comida abundante → sube la talla",
  pobre.vivas >= 5 && rico.vivas >= 5 && rico.talla > pobre.talla,
  `talla ${pobre.talla.toFixed(2)}→${rico.talla.toFixed(2)}`);

// 2. Y lo que los hace gigantes es poder comerse al vecino: sin caza, la talla no cobra nada.
check("sin depredación → baja la talla",
  sinCaza.vivas >= 5 && conCaza.vivas >= 5 && sinCaza.talla < conCaza.talla,
  `talla ${conCaza.talla.toFixed(2)}→${sinCaza.talla.toFixed(2)}`);

// 3. La despensa larga encoge el cuerpo: un hijo nace con la suya llena, y el grande paga más.
check("despensa más larga → baja la talla",
  normal.vivas >= 5 && larga.vivas >= 5 && larga.talla < normal.talla,
  `talla ${normal.talla.toFixed(2)}→${larga.talla.toFixed(2)}`);

// 4. La escasez paga el ojo: con poca comida hay que verla de lejos.
check("comida abundante → baja la visión",
  pobre.vivas >= 5 && rico.vivas >= 5 && rico.vision < pobre.vision,
  `visión ${pobre.vision.toFixed(1)}→${rico.vision.toFixed(1)}`);

// 5. Sin selección los genes derivan sin dirección: si no, el sesgo está en la mutación. Linajes
//    que no compiten, porque dentro de un mundo coalescen y la mediana viaja como uno solo.
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

// 6. Misma semilla, mismo estado: la huella entera, no solo el censo.
{
  // Dos mundos extintos no prueban nada: `raiz` tiene que llegar viva, y se exige en código.
  const a = crearMundo("raiz"), b = crearMundo("raiz");
  for (let d = 0; d < 150; d++) { correrDia(a); correrDia(b); }
  const enPie = !a.extinto && a.bichos.length >= 5;
  check("misma semilla → estado idéntico al día 150", enPie && huella(a) === huella(b),
    `censo=${a.bichos.length} día=${a.dia}`);

  // La página da los ticks de uno en uno: tiene que ser lo mismo que `correrDia`.
  const c = crearMundo("raiz");
  for (let d = 0; d < 150 && !c.extinto; d++) {   // el mismo guardia que `correrDia` y que la página
    while (!tick(c));
    anochecer(c);
    if (!c.extinto) amanecer(c);
  }
  check("tick a tick = día de golpe", enPie && huella(a) === huella(c));

  // Volver atrás: una copia del día 100, vuelta a correr, da el mismo día 150.
  const d = crearMundo("raiz");
  let foto = d;
  for (let k = 0; k < 150; k++) { if (k === 100) foto = copiar(d); correrDia(d); }
  const rebobinado = copiar(foto);
  for (let k = 100; k < 150; k++) correrDia(rebobinado);
  check("volver a un día guardado y correr = no haber vuelto", enPie && huella(rebobinado) === huella(a),
    `día ${rebobinado.dia}, censo ${rebobinado.bichos.length}`);
}

// 7. Sin nada que ver, el vector suma es cero: se mantiene el rumbo, nunca NaN.
{
  const m = crearMundo("rumbo", { censoInicial: 1, comidas: 0 });
  const b = m.bichos[0];
  b.x = m.cfg.ancho / 2; b.y = m.cfg.alto / 2;
  b.hx = 1; b.hy = 0;
  for (let i = 0; i < 200; i++) tick(m);
  check("sin nada a la vista → mantiene el rumbo, no NaN",
    Number.isFinite(b.x) && Number.isFinite(b.hx) && Math.abs(b.hy) < 1e-12 && b.hx === 1,
    `rumbo=(${b.hx}, ${b.hy})`);
}

// 8. Ningún gen es decorativo: cambiar su valor inicial tiene que cambiar la huella. Con el cambio
//    más pequeño que deje vivos los dos mundos, o la huella diferiría por la extinción.
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

// 9. La dentellada no mata antes de tiempo, y matar al que muerde suelta a la presa.
{
  const m = crearMundo("raiz");
  for (let d = 0; d < 30 && !m.extinto; d++) correrDia(m);
  let dep = null, presa = null;
  for (let i = 0; i < 400000 && !m.extinto && !dep; i++) {
    if (tick(m)) { anochecer(m); if (!m.extinto) amanecer(m); continue; }
    for (const b of m.bichos) if (b.muerde && b.restan === CONFIG.ticksPresa - 1) {
      dep = b; presa = m.bichos.find((o) => o.id === b.muerde) ?? null;
    }
  }
  if (!dep || !presa) check("la dentellada dura y no mata al morder", false, "sin dentellada en 400.000 ticks");
  else {
    // Mientras quede dentellada la presa sigue en el censo; al acabarse, desaparece.
    const vivos = copiar(m);
    const idPresa = presa.id, idDep = dep.id;
    const quedan = dep.restan;   // el tick del mordisco ya se ha cobrado el suyo
    let viva = 0;
    for (let k = 0; k < quedan - 1; k++) {
      tick(vivos);
      if (vivos.bichos.some((b) => b.id === idPresa)) viva++;
    }
    tick(vivos);
    const comida = !vivos.bichos.some((b) => b.id === idPresa);
    check("la presa vive hasta el último tick de la dentellada, y ahí se la come",
      viva === quedan - 1 && comida, `viva ${viva}/${quedan - 1} ticks`);

    // Y matar al depredador a media dentellada la suelta: el mordisco interrumpido no mata.
    const suelto = copiar(m);
    const verdugo = suelto.bichos.find((b) => b.id === idDep)!;
    verdugo.reserva = 0;                     // el hambre lo mata en su propio tick
    tick(suelto);
    const libre = suelto.bichos.find((b) => b.id === idPresa);
    check("muerto el que muerde, la presa queda viva y libre",
      !!libre && libre.preso === 0 && !suelto.bichos.some((b) => b.id === idDep),
      libre ? `presa ${libre.id} viva` : "la presa murió con él");
  }
}

// 10. Rebobinar es revivir desde el amanecer: tiene que dar el mundo que hubo.
{
  const m = crearMundo("pablo");
  for (let d = 0; d < 20; d++) correrDia(m);
  const alba = copiar(m);
  const enMedio: string[] = [];
  for (let k = 0; k < 600; k++) { tick(m); if (k >= 590) enMedio.push(huella(m)); }
  let bien = true;
  for (let i = 0; i < enMedio.length; i++) {
    const w = copiar(alba);
    for (let k = 0; k <= 590 + i; k++) tick(w);
    if (huella(w) !== enMedio[i]) bien = false;
  }
  check("revivir el día desde su amanecer da el tick que hubo", bien, `${enMedio.length} ticks comprobados`);
}

console.log(fallos === 0 ? "\nTodo en orden." : `\n${fallos} fallo(s).`);
process.exit(fallos ? 1 : 0);
