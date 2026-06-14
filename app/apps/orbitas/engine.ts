// Motor de Órbitas: gravedad newtoniana de N-cuerpos (n² ingenuo, todos con todos).
// Lógica pura, sin React ni canvas — page.tsx lo conecta a los eventos y render.ts lo pinta.

// Constantes de simulación (no SI: el prompt --G=6.67e-11 es decorativo, aquí G es de juego).
export const G = 1;            // constante gravitatoria en unidades de simulación
export const SOFTENING = 4;    // ε: evita la singularidad cuando dos cuerpos casi coinciden
export const MAX_BODIES = 50;
export const ESCAPE_MARGIN = 1600; // px fuera del viewport a los que un cuerpo se da por escapado
const RADIUS_K = 2.4;          // radio = RADIUS_K · masa^(1/3) → conserva "volumen" al fusionar

// Masa del cuerpo más pesado de cada preset (fuente única para colorear su botón).
export const PRESET_MAX_MASS = { solar: 2600, binary: 1200, cluster: 16 } as const;
// Fusión solo cuando se solapan de verdad, no al rozarse: centros más cerca que la mitad
// de la suma de radios. Así dos cuerpos pueden pasar muy juntos sin fundirse.
const MERGE_FACTOR = 0.5;

export type Body = {
  x: number; y: number;   // posición
  vx: number; vy: number; // velocidad
  mass: number;
  radius: number;         // derivado de la masa; se recomputa al fusionar
};

export type World = { bodies: Body[] };

// radio ∝ masa^(1/3): al fusionar, r_nuevo³ = r_a³ + r_b³ (volumen conservado)
export function radiusForMass(mass: number): number {
  return RADIUS_K * Math.cbrt(mass);
}

export function makeBody(x: number, y: number, vx: number, vy: number, mass: number): Body {
  return { x, y, vx, vy, mass, radius: radiusForMass(mass) };
}

export function createWorld(): World {
  return { bodies: [] };
}

export function clearWorld(world: World) {
  world.bodies.length = 0;
}

// Añade un cuerpo si no se supera el tope; devuelve false si está lleno
export function addBody(world: World, body: Body): boolean {
  if (world.bodies.length >= MAX_BODIES) return false;
  world.bodies.push(body);
  return true;
}

// Aceleración gravitatoria sobre cada cuerpo, por suma de pares:
//   a_i = Σ_j  G·m_j·(r_j − r_i) / (|r_j − r_i|² + ε²)^(3/2)
// El softening ε mantiene la fuerza finita cuando dos cuerpos casi coinciden.
function accelerations(bodies: Body[]): { ax: number; ay: number }[] {
  const acc = bodies.map(() => ({ ax: 0, ay: 0 }));
  const eps2 = SOFTENING * SOFTENING;
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const dx = bodies[j].x - bodies[i].x;
      const dy = bodies[j].y - bodies[i].y;
      const r2 = dx * dx + dy * dy + eps2;
      const invR3 = G / (r2 * Math.sqrt(r2));   // G / |r|³
      // Tercera ley de Newton: el par contribuye igual y opuesto a i y j
      acc[i].ax += invR3 * bodies[j].mass * dx;
      acc[i].ay += invR3 * bodies[j].mass * dy;
      acc[j].ax -= invR3 * bodies[i].mass * dx;
      acc[j].ay -= invR3 * bodies[i].mass * dy;
    }
  }
  return acc;
}

// Un paso de integración: leapfrog "kick-drift-kick" (equivalente a velocity Verlet,
// simpléctico → órbitas estables). Self-contained: no arrastra aceleraciones entre pasos.
export function step(world: World, dt: number) {
  const { bodies } = world;

  let acc = accelerations(bodies);              // a(t)
  for (let i = 0; i < bodies.length; i++) {
    bodies[i].vx += 0.5 * acc[i].ax * dt;       // medio kick
    bodies[i].vy += 0.5 * acc[i].ay * dt;
    bodies[i].x += bodies[i].vx * dt;           // drift
    bodies[i].y += bodies[i].vy * dt;
  }
  acc = accelerations(bodies);                  // a(t+dt)
  for (let i = 0; i < bodies.length; i++) {
    bodies[i].vx += 0.5 * acc[i].ax * dt;       // medio kick
    bodies[i].vy += 0.5 * acc[i].ay * dt;
  }

  detectCollisions(world);
}

// Fusiona dos cuerpos: centro de masas, momento conservado, masa sumada, radio recomputado.
export function merge(a: Body, b: Body): Body {
  const mass = a.mass + b.mass;
  return {
    x: (a.mass * a.x + b.mass * b.x) / mass,
    y: (a.mass * a.y + b.mass * b.y) / mass,
    vx: (a.mass * a.vx + b.mass * b.vx) / mass,
    vy: (a.mass * a.vy + b.mass * b.vy) / mass,
    mass,
    radius: radiusForMass(mass),
  };
}

// Fusiona por absorción los pares solapados (dist < rₐ+r_b). Tras cada fusión reinicia
// el barrido: el cuerpo nuevo puede solapar con un tercero (cadenas de colisión).
export function detectCollisions(world: World) {
  const { bodies } = world;
  let merged = true;
  while (merged) {
    merged = false;
    for (let i = 0; i < bodies.length && !merged; i++) {
      for (let j = i + 1; j < bodies.length; j++) {
        const dx = bodies[j].x - bodies[i].x;
        const dy = bodies[j].y - bodies[i].y;
        if (Math.hypot(dx, dy) < (bodies[i].radius + bodies[j].radius) * MERGE_FACTOR) {
          bodies[i] = merge(bodies[i], bodies[j]);
          bodies.splice(j, 1);
          merged = true;
          break;
        }
      }
    }
  }
}

// Elimina los cuerpos que han escapado lejos del viewport: ya no vuelven, así que dejan de
// contar. La distancia coincide con el punto en que la flecha-radar ya se ha apagado.
export function pruneEscaped(world: World, W: number, H: number) {
  world.bodies = world.bodies.filter(b => {
    const dx = b.x < 0 ? -b.x : b.x > W ? b.x - W : 0;
    const dy = b.y < 0 ? -b.y : b.y > H ? b.y - H : 0;
    return Math.hypot(dx, dy) <= ESCAPE_MARGIN;
  });
}

// ── Métricas (línea de estado + tests) ───────────────────────────────────────

export function totalMass(world: World): number {
  return world.bodies.reduce((sum, b) => sum + b.mass, 0);
}

export function totalMomentum(world: World): { px: number; py: number } {
  let px = 0, py = 0;
  for (const b of world.bodies) { px += b.mass * b.vx; py += b.mass * b.vy; }
  return { px, py };
}

// ── Presets ──────────────────────────────────────────────────────────────────

// Sistema solar: un cuerpo central masivo en reposo + satélites en órbita circular.
// Velocidad tangencial de órbita circular: v = √(G·M/r) (ε despreciable a estos radios).
export function presetSolar(W: number, H: number): World {
  const world = createWorld();
  const cx = W / 2, cy = H / 2;
  const M = PRESET_MAX_MASS.solar;
  addBody(world, makeBody(cx, cy, 0, 0, M));

  const satellites = [
    { r: Math.min(W, H) * 0.18, mass: 6 },
    { r: Math.min(W, H) * 0.30, mass: 10 },
    { r: Math.min(W, H) * 0.42, mass: 4 },
  ];
  for (const { r, mass } of satellites) {
    const v = Math.sqrt(G * M / r);
    addBody(world, makeBody(cx, cy - r, v, 0, mass)); // arriba del centro, velocidad hacia +x
  }
  return world;
}

// Binario: dos estrellas iguales orbitando su centro común + un planeta circumbinario.
// Órbita circular de dos masas iguales m a separación d: v = √(G·m / 2d).
export function presetBinary(W: number, H: number): World {
  const world = createWorld();
  const cx = W / 2, cy = H / 2;
  const m = PRESET_MAX_MASS.binary;
  const d = Math.min(W, H) * 0.22;
  const v = Math.sqrt(G * m / (2 * d));
  addBody(world, makeBody(cx - d / 2, cy, 0, -v, m)); // izquierda, baja
  addBody(world, makeBody(cx + d / 2, cy, 0, v, m));  // derecha, sube

  // planeta lejano que ve al par como una masa central 2m
  const R = Math.min(W, H) * 0.46;
  const vp = Math.sqrt(G * 2 * m / R);
  addBody(world, makeBody(cx, cy - R, vp, 0, 8));
  return world;
}

// Cúmulo: una nube de cuerpecillos con velocidades pequeñas al azar. La gravedad los junta:
// se cruzan, se lanzan unos a otros y se fusionan en cascada. Aleatorio (varía cada vez).
export function presetCluster(W: number, H: number): World {
  const world = createWorld();
  const cx = W / 2, cy = H / 2;
  const R = Math.min(W, H) * 0.36;
  const N = 16;
  for (let i = 0; i < N; i++) {
    const ang = Math.random() * Math.PI * 2;
    const rad = R * Math.sqrt(Math.random()); // reparto uniforme en el disco
    addBody(world, makeBody(
      cx + Math.cos(ang) * rad,
      cy + Math.sin(ang) * rad,
      (Math.random() - 0.5),
      (Math.random() - 0.5),
      6 + Math.random() * (PRESET_MAX_MASS.cluster - 6),
    ));
  }
  return world;
}
