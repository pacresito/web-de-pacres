// Motor de Órbitas: gravedad newtoniana de N-cuerpos (n² ingenuo, todos con todos).
// Lógica pura, sin React ni canvas — page.tsx lo conecta a los eventos y render.ts lo pinta.

// Constantes de simulación (no SI: el prompt --G=6.67e-11 es decorativo, aquí G es de juego).
export const G = 1;            // constante gravitatoria en unidades de simulación
export const SOFTENING = 4;    // ε: evita la singularidad cuando dos cuerpos casi coinciden
export const MAX_BODIES = 50;
export const ESCAPE_MARGIN = 1600; // px fuera del viewport a los que un cuerpo se da por escapado
const RADIUS_K = 2.4;          // radio = RADIUS_K · masa^(1/3) → conserva "volumen" al fusionar

// Masa del cuerpo más pesado de cada preset (fuente única para colorear su botón).
export const PRESET_MAX_MASS = { solar: 2600, binary: 1200, cluster: 16, threebody: 120 } as const;

const TAU = Math.PI * 2;
// Fusión solo cuando se solapan de verdad, no al rozarse: centros más cerca que la mitad
// de la suma de radios. Así dos cuerpos pueden pasar muy juntos sin fundirse.
const MERGE_FACTOR = 0.5;

export type Body = {
  x: number; y: number;   // posición
  vx: number; vy: number; // velocidad
  mass: number;
  radius: number;         // derivado de la masa; se recomputa al fusionar
  fixed?: boolean;        // si es true, atrae a los demás pero nunca se mueve (agujero negro)
};

export type World = { bodies: Body[] };

// radio ∝ masa^(1/3): al fusionar, r_nuevo³ = r_a³ + r_b³ (volumen conservado)
export function radiusForMass(mass: number): number {
  return RADIUS_K * Math.cbrt(mass);
}

export function makeBody(x: number, y: number, vx: number, vy: number, mass: number, fixed = false): Body {
  return { x, y, vx, vy, mass, radius: radiusForMass(mass), fixed };
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
    if (bodies[i].fixed) continue;              // el agujero negro atrae pero no se mueve
    bodies[i].vx += 0.5 * acc[i].ax * dt;       // medio kick
    bodies[i].vy += 0.5 * acc[i].ay * dt;
    bodies[i].x += bodies[i].vx * dt;           // drift
    bodies[i].y += bodies[i].vy * dt;
  }
  acc = accelerations(bodies);                  // a(t+dt)
  for (let i = 0; i < bodies.length; i++) {
    if (bodies[i].fixed) continue;
    bodies[i].vx += 0.5 * acc[i].ax * dt;       // medio kick
    bodies[i].vy += 0.5 * acc[i].ay * dt;
  }

  detectCollisions(world);
}

// Fusiona dos cuerpos: centro de masas, momento conservado, masa sumada, radio recomputado.
export function merge(a: Body, b: Body): Body {
  const mass = a.mass + b.mass;
  // Si uno es fijo (agujero negro), absorbe al otro sin moverse: conserva su posición y queda quieto.
  if (a.fixed || b.fixed) {
    const anchor = a.fixed ? a : b;
    return { x: anchor.x, y: anchor.y, vx: 0, vy: 0, mass, radius: radiusForMass(mass), fixed: true };
  }
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

// Sistema solar: un sol central masivo + 3–5 planetas. El sol arranca libre (no fijo): al
// ser ~200× más pesado que los planetas casi no recula, pero puede tocarse para congelarlo.
// Cada vez sale distinto: nº de planetas, radios, tamaños y excentricidad varían al azar.
// Órbita circular: v = √(G·M/r); un factor k≠1 la vuelve elíptica (k<1 cae hacia dentro).
export function presetSolar(W: number, H: number): World {
  const world = createWorld();
  const cx = W / 2, cy = H / 2;
  const minWH = Math.min(W, H);
  const M = PRESET_MAX_MASS.solar;
  addBody(world, makeBody(cx, cy, 0, 0, M)); // sol central (libre)

  const n = 3 + Math.floor(Math.random() * 3); // 3, 4 ó 5 planetas
  for (let i = 0; i < n; i++) {
    const r = minWH * (0.16 + 0.30 * (i / (n - 1))) * (0.9 + Math.random() * 0.2); // radios escalonados con jitter
    const ang = Math.random() * TAU;                                                // posición al azar en la órbita
    const k = 0.82 + Math.random() * 0.26;                                          // 0.82–1.08 → algo elípticas
    const v = Math.sqrt(G * M / r) * k;
    const mass = 3 + Math.random() * 12;                                            // tamaños dispares
    addBody(world, makeBody(
      cx + Math.cos(ang) * r, cy + Math.sin(ang) * r,
      -Math.sin(ang) * v, Math.cos(ang) * v, mass, // velocidad tangencial (perpendicular al radio)
    ));
  }
  return world;
}

// Binario: dos estrellas orbitando su centro de masas común + 1–2 planetas circumbinarios.
// Aleatorio: masas algo desiguales, separación y planetas varían. Órbita circular de dos
// masas m1,m2 a separación d: v_rel = √(G·(m1+m2)/d), repartida inversa a la masa de cada una.
export function presetBinary(W: number, H: number): World {
  const world = createWorld();
  const cx = W / 2, cy = H / 2;
  const minWH = Math.min(W, H);
  const base = PRESET_MAX_MASS.binary;
  const m1 = base * (0.7 + Math.random() * 0.3);
  const m2 = base * (0.7 + Math.random() * 0.3);
  const Mtot = m1 + m2;
  const d = minWH * (0.18 + Math.random() * 0.1);
  const r1 = d * m2 / Mtot, r2 = d * m1 / Mtot; // distancias al centro de masas (en el centro)
  const vrel = Math.sqrt(G * Mtot / d);
  addBody(world, makeBody(cx - r1, cy, 0, -vrel * m2 / Mtot, m1)); // izquierda, baja
  addBody(world, makeBody(cx + r2, cy, 0,  vrel * m1 / Mtot, m2)); // derecha, sube

  const planets = 1 + Math.floor(Math.random() * 2); // 1 ó 2 planetas que ven al par como masa Mtot
  for (let i = 0; i < planets; i++) {
    const R = minWH * (0.40 + 0.10 * i + Math.random() * 0.06);
    const ang = Math.random() * TAU;
    const k = 0.85 + Math.random() * 0.2;
    const v = Math.sqrt(G * Mtot / R) * k;
    addBody(world, makeBody(
      cx + Math.cos(ang) * R, cy + Math.sin(ang) * R,
      -Math.sin(ang) * v, Math.cos(ang) * v, 4 + Math.random() * 8,
    ));
  }
  return world;
}

// Cúmulo: una nube de cuerpecillos con velocidades pequeñas al azar. La gravedad los junta:
// se cruzan, se lanzan unos a otros y se fusionan en cascada. Aleatorio (varía cada vez).
export function presetCluster(W: number, H: number): World {
  const world = createWorld();
  const cx = W / 2, cy = H / 2;
  const R = Math.min(W, H) * 0.46;
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

// Tres cuerpos: la coreografía en forma de ocho de Chenciner–Montgomery. Tres masas iguales
// recorren la misma curva, persiguiéndose a un tercio de periodo. Las condiciones iniciales
// clásicas (G=1, m=1) se reescalan a píxeles con X = c + L·p y, para conservar la órbita,
// V = √(G·M/L)·u. Con L grande el softening es despreciable.
export function presetThreeBody(W: number, H: number): World {
  const world = createWorld();
  const cx = W / 2, cy = H / 2;
  const L = Math.min(W, H) * 0.34;        // tamaño del ocho en píxeles
  const M = PRESET_MAX_MASS.threebody;
  const k = Math.sqrt(G * M / L);         // factor de velocidad del reescalado

  // Chenciner–Montgomery: r1=(0.9700,−0.2431)=−r2, r3=0; v1=v2=−v3/2, v3=(−0.9324,−0.8647).
  const rx = 0.97000436, ry = 0.24308753;
  const vx = 0.93240737, vy = 0.86473146;
  addBody(world, makeBody(cx + L * rx, cy - L * ry,  k * vx / 2,  k * vy / 2, M));
  addBody(world, makeBody(cx - L * rx, cy + L * ry,  k * vx / 2,  k * vy / 2, M));
  addBody(world, makeBody(cx,          cy,          -k * vx,     -k * vy,     M));
  return world;
}
