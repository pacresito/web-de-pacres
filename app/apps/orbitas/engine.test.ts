// Test rápido del motor — ejecutar con: npx tsx app/apps/orbitas/engine.test.ts
// No es parte del build; verifica la física pura sin navegador.
import {
  createWorld, addBody, makeBody, step, merge, detectCollisions,
  totalMass, totalMomentum, presetSolar, presetThreeBody, presetCluster, G,
  launchVelocity, deadzoneFor, radiusForMass, MAX_SPEED, MASS_MIN,
} from "./engine";

let fails = 0;
function check(name: string, ok: boolean, detail = "") {
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? "  " + detail : ""}`);
  if (!ok) fails++;
}

// 1. merge conserva masa y momento
{
  const a = makeBody(0, 0, 2, 0, 10);
  const b = makeBody(10, 0, -1, 3, 30);
  const pBefore = { px: a.mass * a.vx + b.mass * b.vx, py: a.mass * a.vy + b.mass * b.vy };
  const m = merge(a, b);
  const pAfter = { px: m.mass * m.vx, py: m.mass * m.vy };
  check("merge: masa sumada", m.mass === 40);
  check("merge: momento conservado",
    Math.abs(pBefore.px - pAfter.px) < 1e-9 && Math.abs(pBefore.py - pAfter.py) < 1e-9);
  // volumen conservado: r³ = rₐ³ + r_b³
  check("merge: volumen (radio cbico) conservado",
    Math.abs(m.radius ** 3 - (a.radius ** 3 + b.radius ** 3)) < 1e-6);
}

// 2. Integrador estable: una órbita circular no debe derivar tras muchos pasos
{
  const world = createWorld();
  const M = 4000, r = 160;
  const v = Math.sqrt(G * M / r);
  addBody(world, makeBody(0, 0, 0, 0, M));
  addBody(world, makeBody(r, 0, 0, v, 1)); // satélite ligero, velocidad circular
  const r0 = Math.hypot(world.bodies[1].x - world.bodies[0].x, world.bodies[1].y - world.bodies[0].y);
  let rMin = Infinity, rMax = 0;
  for (let s = 0; s < 6000; s++) {
    step(world, 1);
    const d = Math.hypot(world.bodies[1].x - world.bodies[0].x, world.bodies[1].y - world.bodies[0].y);
    rMin = Math.min(rMin, d); rMax = Math.max(rMax, d);
  }
  const drift = (rMax - rMin) / r0;
  check("integrador: órbita circular no deriva (>~6000 pasos)", drift < 0.1,
    `r0=${r0.toFixed(1)} rMin=${rMin.toFixed(1)} rMax=${rMax.toFixed(1)} drift=${(drift * 100).toFixed(1)}%`);
}

// 3. Momento total conservado bajo la dinámica (sistema aislado, sin fusión)
{
  const world = createWorld();
  addBody(world, makeBody(-50, 0, 0, 1, 20));
  addBody(world, makeBody(50, 0, 0, -1, 20));
  addBody(world, makeBody(0, 80, 2, 0, 5));
  const p0 = totalMomentum(world);
  for (let s = 0; s < 2000; s++) step(world, 0.5);
  const p1 = totalMomentum(world);
  check("dinámica: momento total conservado",
    Math.abs(p0.px - p1.px) < 1e-6 && Math.abs(p0.py - p1.py) < 1e-6,
    `Δpx=${(p1.px - p0.px).toExponential(2)} Δpy=${(p1.py - p0.py).toExponential(2)}`);
}

// 4. Fusión encadenada: tres cuerpos solapados → uno solo, masa total preservada
{
  const world = createWorld();
  addBody(world, makeBody(0, 0, 1, 0, 10));
  addBody(world, makeBody(1, 0, 0, 0, 10));   // solapa con el primero
  addBody(world, makeBody(2, 0, -1, 0, 10));  // solapa con el segundo
  const mBefore = totalMass(world);
  detectCollisions(world);
  check("colisiones: cadena de 3 → 1 cuerpo", world.bodies.length === 1);
  check("colisiones: masa total preservada", Math.abs(totalMass(world) - mBefore) < 1e-9);
}

// 5. Preset solar: sol libre + 3–5 planetas lanzados en órbitas ligadas
{
  const world = presetSolar(900, 600);
  const n = world.bodies.length;
  check("preset solar: sol + 3–5 planetas", n >= 4 && n <= 6, `cuerpos=${n}`);
  check("preset solar: el sol arranca libre", world.bodies[0].fixed !== true);

  // «Ligado» es energía orbital negativa (ε = v_rel²/2 − G·M_sol/r), no distancia máxima:
  // con N cuerpos las perturbaciones mutuas estiran las órbitas mucho más allá del afelio
  // que predice la fórmula de dos cuerpos, y ahí ningún umbral geométrico separa la elipse
  // ancha de la fuga. El sol se relee en cada llamada: al fusionar, merge() sustituye el
  // objeto que hay en bodies[0] y una referencia guardada antes se queda obsoleta.
  const desligados = () => {
    const sun = world.bodies[0];
    return world.bodies.slice(1).filter(b => {
      const r = Math.hypot(b.x - sun.x, b.y - sun.y);
      const v2 = (b.vx - sun.vx) ** 2 + (b.vy - sun.vy) ** 2;
      return v2 / 2 - G * sun.mass / r >= 0;
    }).length;
  };

  const alNacer = desligados();
  check("preset solar: nace con todas las órbitas ligadas", alNacer === 0, `desligados=${alNacer}`);

  for (let s = 0; s < 3000; s++) step(world, 1);
  // A 3000 pasos el sistema ya es caótico: con órbitas que se cruzan, dos de cada tres
  // partidas acaban con una fusión y una de cada 600 expulsa un planeta por slingshot. Eso
  // es física del preset, no un fallo — lo que delataría una regresión de la fórmula de
  // velocidad es que se desligaran todos. En 5000 presets nunca se desligó más de uno.
  const alFinal = desligados();
  check("preset solar: el sistema sigue ligado tras 3000 pasos", alFinal <= 1,
    `desligados=${alFinal}/${world.bodies.length - 1}`);
}

// 6. Cuerpo fijo: atrae pero no se mueve, y absorbe sin desplazarse al fusionar
{
  const world = createWorld();
  addBody(world, makeBody(450, 300, 0, 0, 4000, true)); // fijo
  addBody(world, makeBody(100, 300, 6, 0, 30));         // lanzado directo hacia él
  const m0 = world.bodies[0].mass;
  for (let s = 0; s < 4000; s++) step(world, 1);
  const fix = world.bodies[0];
  check("fijo: no se mueve aunque absorba masa",
    fix.fixed === true && fix.x === 450 && fix.y === 300,
    `(450,300) → (${fix.x.toFixed(1)},${fix.y.toFixed(1)})`);
  check("fijo: absorbe masa al fusionar", fix.mass > m0);
}

// 7. Tres cuerpos: la coreografía en ocho se mantiene acotada (no se desintegra ni escapa)
{
  const W = 900, H = 600;
  const world = presetThreeBody(W, H);
  check("tres cuerpos: tres masas", world.bodies.length === 3);
  const cx = W / 2, cy = H / 2;
  let maxDist = 0;
  for (let s = 0; s < 4000; s++) {
    step(world, 1);
    for (const b of world.bodies) maxDist = Math.max(maxDist, Math.hypot(b.x - cx, b.y - cy));
  }
  // se mantiene ligada (los cuerpos no se alejan indefinidamente) y no se fusiona
  check("tres cuerpos: órbita acotada y sin fusión",
    world.bodies.length === 3 && maxDist < Math.min(W, H) * 0.6,
    `cuerpos=${world.bodies.length} maxDist=${maxDist.toFixed(0)}`);
}

// 8. Gesto de lanzamiento: zona muerta y tope de velocidad
{
  const dead = deadzoneFor(radiusForMass(MASS_MIN), 1);
  const quieto = launchVelocity(dead - 1, 0, dead);
  check("lanzamiento: dentro de la zona muerta sale quieto", quieto.vx === 0 && quieto.vy === 0);

  const justo = launchVelocity(dead + 1, 0, dead);
  check("lanzamiento: al salir de la zona muerta la velocidad nace en cero",
    justo.vx > 0 && justo.vx < 0.1, `vx=${justo.vx.toFixed(3)}`);

  const enorme = launchVelocity(-9000, 9000, dead);
  const mod = Math.hypot(enorme.vx, enorme.vy);
  check("lanzamiento: el módulo nunca pasa del tope", Math.abs(mod - MAX_SPEED) < 1e-9,
    `|v|=${mod.toFixed(2)} tope=${MAX_SPEED.toFixed(2)}`);
  check("lanzamiento: el tope conserva la dirección del arrastre",
    Math.abs(enorme.vx + enorme.vy) < 1e-9);
}

// 9. El tope es justo la frontera: a velocidad máxima, un cuerpo que nace pegado a un astro de
// 20000 se aleja, se para y vuelve; un 15% por encima ya escapa. Es lo que define MAX_SPEED.
{
  const REF = 20000;
  const r0 = radiusForMass(REF) + radiusForMass(MASS_MIN); // pegado, sin llegar a fusionarse
  const vuelo = (v: number) => {
    const world = createWorld();
    addBody(world, makeBody(0, 0, 0, 0, REF, true));
    addBody(world, makeBody(r0, 0, v, 0, MASS_MIN));
    let rMax = 0, volvio = false;
    for (let s = 0; s < 40000; s++) {
      step(world, 1);
      if (world.bodies.length < 2) { volvio = true; break; } // ha vuelto hasta fundirse con él
      const r = Math.hypot(world.bodies[1].x, world.bodies[1].y);
      if (r > rMax) rMax = r; else if (rMax > r0 * 2) volvio = true;
    }
    return { rMax, volvio };
  };

  const ligado = vuelo(MAX_SPEED);
  check("tope: a velocidad máxima el cuerpo se frena y vuelve", ligado.volvio,
    `rMax=${ligado.rMax.toFixed(0)}`);
  check("tope: y lo hace cerca del borde de la pantalla, no a medio camino",
    ligado.rMax > 700 && ligado.rMax < 2600, `rMax=${ligado.rMax.toFixed(0)}`);

  const libre = vuelo(MAX_SPEED * 1.15);
  check("tope: un 15% por encima ya escapa", !libre.volvio, `rMax=${libre.rMax.toFixed(0)}`);
}

// 10. Cúmulo: se reparte por la vista, así que alejar la cámara lo esparce
{
  const W = 900, H = 500;
  const extent = (zoom: number) => {
    const world = presetCluster(W, H, zoom);
    let dx = 0, dy = 0;
    for (const b of world.bodies) {
      dx = Math.max(dx, Math.abs(b.x - W / 2));
      dy = Math.max(dy, Math.abs(b.y - H / 2));
    }
    return { dx, dy };
  };
  const cerca = extent(1), lejos = extent(0.25);
  check("cúmulo: a zoom 1 cabe en el lienzo", cerca.dx <= W * 0.46 && cerca.dy <= H * 0.46,
    `dx=${cerca.dx.toFixed(0)} dy=${cerca.dy.toFixed(0)}`);
  check("cúmulo: alejando la cámara se esparce en la misma proporción",
    lejos.dx <= (W / 0.25) * 0.46 && lejos.dx > W * 0.46,
    `dx=${lejos.dx.toFixed(0)} (límite ${((W / 0.25) * 0.46).toFixed(0)})`);
}

console.log(fails === 0 ? "\nTODO OK" : `\n${fails} FALLO(S)`);
process.exit(fails === 0 ? 0 : 1);
