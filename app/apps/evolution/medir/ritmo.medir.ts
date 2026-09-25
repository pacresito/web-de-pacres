// Lo que cuesta una jornada y lo que tarda en verse — `npx tsx app/apps/evolution/medir/ritmo.medir.ts`.
// No es un test: mide. Fuera del build.
//
// Para cuando una partida parece lenta. El motor no es el cuello: a ×1 el reloj lo fija el
// refresco (mil fotogramas por jornada) y a ×8 y ×64, cuántos cuerpos hay que pintar.

import { CONFIG, amanecer, anochecer, REFERENCIA, crearMundo, tick, type Mundo } from "../engine";
import { paletaDe, pintar, vistaDe } from "../render";
import { designFor } from "../designs";

/** Lo que la página intenta por fotograma y el presupuesto que se da. Copiados de `page.tsx`. */
const VELOCIDADES = [1, 8, 64];
const PRESUPUESTO_MS = 12;
const REFRESCOS = [60, 120, 144];
const SEMILLAS = ["hola", "pablo", "claudio", "mar", "brizna", "raiz", "sal", "duna"];
const MADURO = 120;   // día a partir del cual la población está en régimen

const fmt = (n: number, d = 2) => n.toFixed(d);

/** Un lienzo de mentira: aquí no se pinta nada, solo se cuenta a quién se le pide el cuerpo. */
const lienzoFalso = (): CanvasRenderingContext2D => new Proxy({ globalAlpha: 1 } as Record<string, unknown>, {
  get: (o, k) => (typeof k === "string" && k in o ? o[k] : k === "canvas" ? o : () => lienzoFalso()),
  set: (o, k, v) => ((o[String(k)] = v), true),
}) as unknown as CanvasRenderingContext2D;

// El pintado cuece el suelo en un lienzo aparte: hace falta un `document` que lo dé.
(globalThis as unknown as { document: unknown }).document = {
  createElement: () => ({ getContext: () => lienzoFalso(), width: 0, height: 0 }),
};

/** El mundo de esa semilla al empezar el día `dia`, sin contar lo que cuesta llegar hasta él. */
function hasta(semilla: string, dia: number): Mundo {
  const m = crearMundo(semilla, REFERENCIA);
  for (let d = 0; d < dia && !m.extinto; d++) {
    for (;;) if (tick(m)) break;
    anochecer(m);
    if (!m.extinto) amanecer(m);
  }
  return m;
}

/** Milisegundos de motor en una jornada entera, y el censo con el que se corrió. */
function jornada(m: Mundo): { ms: number; censo: number } {
  const censo = m.bichos.length;
  const t0 = process.hrtime.bigint();
  for (;;) if (tick(m)) break;
  anochecer(m);
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  if (!m.extinto) amanecer(m);
  return { ms, censo };
}

/** Mejor de tres: la mediana premia al ruido y la media a la basura del primer pase. */
const mejorDe3 = (f: () => number) => Math.min(f(), f(), f());

console.log(`jornada = ${CONFIG.ticksDia} ticks\n`);

// ─── El motor ─────────────────────────────────────────────────────────────────
for (const [nombre, dia] of [["día 0 · un bicho", 0], ["en régimen", MADURO]] as const) {
  let ms = 0, censo = 0, mundos = 0;
  for (const s of SEMILLAS) {
    const base = hasta(s, dia);
    if (base.extinto) continue;
    // Se clona el estado de partida en cada pase para medir siempre la misma jornada.
    const copia = () => { const m = hasta(s, dia); return jornada(m).ms; };
    ms += mejorDe3(copia);
    censo += jornada(base).censo;
    mundos++;
  }
  console.log(`${nombre.padEnd(18)} motor ${fmt(ms / mundos).padStart(7)} ms la jornada` +
    ` · ${fmt((ms / mundos) * 1000 / CONFIG.ticksDia).padStart(5)} µs/tick · censo ${Math.round(censo / mundos)}`);
}

// ─── El pintado: cuerpos por cuadro, no milisegundos ───────────────────────────
{
  const ctx = lienzoFalso();
  let cuerpos = 0, cuadros = 0, vivos = 0, maxQuietos = 0;
  for (const s of SEMILLAS) {
    const m = hasta(s, MADURO);
    if (m.extinto) continue;
    const d = designFor(s), p = paletaDe(s, "light");
    const v = vistaDe(786, 546, CONFIG.ancho, CONFIG.alto);
    const espia = { ...d, cuerpo: () => cuerpos++ };
    for (let dia = 0; dia < 30 && !m.extinto; dia++) {
      for (;;) {
        if (tick(m)) break;
        if (m.t % 10) continue;
        pintar(ctx, m, espia, p, v, 786, 546, 1, 1, null);
        cuadros++; vivos += m.bichos.length;
        if (m.restos.length > maxQuietos) maxQuietos = m.restos.length;
      }
      anochecer(m); if (m.extinto) break; amanecer(m);
    }
  }
  console.log(`\npintado            ${fmt(cuerpos / cuadros).padStart(7)} cuerpos por cuadro` +
    ` · ${fmt(vivos / cuadros)} vivos · hasta ${maxQuietos} cuerpos quietos a la vez`);
}

// ─── Cuántos fotogramas pide una jornada a cada velocidad y refresco ───────────
console.log(`\nfotogramas por jornada, y lo que tardan (presupuesto ${PRESUPUESTO_MS} ms por fotograma):`);
console.log(`  ${"".padEnd(6)}${"fotogramas".padStart(11)}${REFRESCOS.map((h) => `${h} Hz`.padStart(9)).join("")}`);
for (const vel of VELOCIDADES) {
  const cuadros = Math.ceil(CONFIG.ticksDia / vel);
  console.log(`  ×${String(vel).padEnd(5)}${String(cuadros).padStart(11)}` +
    REFRESCOS.map((hz) => `${fmt(cuadros / hz, 2)} s`.padStart(9)).join(""));
}
console.log(`\nSi una jornada tarda lo que dice su fila, va tan rápido como la pantalla deja.` +
  ` Si tarda más, mira los cuadros por segundo y los cuerpos por cuadro — no el motor.`);

// El navegador no se mide aquí: esto se pega en su consola para cronometrarlo de verdad.
console.log(`\nPara cronometrarla de verdad, pegar esto en la consola de /apps/evolution — mide la
primera jornada completa que pase, de amanecer a anochecer, a la velocidad que esté puesta:

  (()=>{const e=document.querySelector('.be-elastico');let f=0,t0=0;const i=setInterval(()=>{
  const n=e.textContent.includes('anochece');
  if(f===0&&n)f=1; else if(f===1&&!n){f=2;t0=performance.now()}
  else if(f===2&&n){clearInterval(i);console.log(((performance.now()-t0)/1000).toFixed(2)+' s la jornada')}},8)})()

Y para saber a qué refresco va la pantalla, que es lo que fija la fila:

  (()=>{let n=0,t=performance.now();const f=()=>{n++;performance.now()-t<1000?requestAnimationFrame(f):console.log(n+' Hz')};requestAnimationFrame(f)})()`);
