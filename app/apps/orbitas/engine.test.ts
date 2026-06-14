// Test rápido del motor — ejecutar con: npx tsx app/apps/orbitas/engine.test.ts
// No es parte del build; verifica la física pura sin navegador.
import {
  createWorld, addBody, makeBody, step, merge, detectCollisions,
  totalMass, totalMomentum, presetSolar, G,
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

// 5. Preset solar: cabe y orbita razonablemente estable
{
  const world = presetSolar(900, 600);
  check("preset solar: 1 central + 3 satélites", world.bodies.length === 4);
  const sun = world.bodies[0];
  const radii0 = world.bodies.slice(1).map(b => Math.hypot(b.x - sun.x, b.y - sun.y));
  for (let s = 0; s < 3000; s++) step(world, 1);
  const sun2 = world.bodies[0];
  let stable = world.bodies.length === 4;
  if (stable) {
    const radii1 = world.bodies.slice(1).map(b => Math.hypot(b.x - sun2.x, b.y - sun2.y));
    stable = radii0.every((r0, k) => Math.abs(radii1[k] - r0) / r0 < 0.25);
  }
  check("preset solar: satélites siguen orbitando estables", stable);
}

console.log(fails === 0 ? "\nTODO OK" : `\n${fails} FALLO(S)`);
process.exit(fails === 0 ? 0 : 1);
