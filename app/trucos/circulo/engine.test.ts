// Test rápido de la puntuación — ejecutar con: npx tsx app/trucos/circulo/engine.test.ts
// No es parte del build; verifica la nota del trazo sin navegador.
import { computeScore, fitCircle, type Pt } from "./engine";

const THRESHOLD = 0.88; // el de page.tsx

let fails = 0;
function check(name: string, ok: boolean, detail = "") {
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? "  " + detail : ""}`);
  if (!ok) fails++;
}

// Trazo circular de radio R hasta degEnd grados. slowFrom simula la frenada con
// la que todo el mundo encara el cierre: cinco veces más puntos por grado.
function stroke(degEnd: number, { R = 150, slowFrom = 330, dir = 1, wobble = 0 } = {}): Pt[] {
  const pts: Pt[] = [];
  for (let d = 0; d <= degEnd; d += d >= slowFrom ? 0.4 : 2) {
    const a = (dir * d * Math.PI) / 180;
    const rr = R * (1 + wobble * Math.sin(3 * a));
    pts.push({ x: 300 + rr * Math.cos(a), y: 300 + rr * Math.sin(a) });
  }
  return pts;
}

// 1. Ajuste de la circunferencia: centro y radio, aunque el trazo sea un arco
{
  const { cx, cy, r } = fitCircle(stroke(200, { slowFrom: 9999 }));
  check("fitCircle: centro y radio de un arco de 200°",
    Math.abs(cx - 300) < 0.5 && Math.abs(cy - 300) < 0.5 && Math.abs(r - 150) < 0.5,
    `c=(${cx.toFixed(1)}, ${cy.toFixed(1)}) r=${r.toFixed(1)}`);
}

// 2. Un círculo perfecto es un 100
{
  const s = computeScore(stroke(360));
  check("círculo perfecto ≈ 1", s > 0.999, `score=${s.toFixed(3)}`);
}

// 3. El fallo que motivó el motor: frenar al cerrar acumulaba puntos en el último
//    tramo, desplazaba el centro y la nota bajaba justo antes de terminar.
{
  const closed = computeScore(stroke(360, { wobble: 0.03 }));
  let maxAntes = 0, peor = 0;
  for (let deg = 200; deg < 360; deg += 5) {
    const s = computeScore(stroke(deg, { wobble: 0.03 }));
    if (s > maxAntes) { maxAntes = s; peor = deg; }
  }
  check("la nota máxima es al cerrar, no antes",
    closed >= maxAntes, `cierre=${closed.toFixed(3)} máx.antes=${maxAntes.toFixed(3)} (${peor}°)`);
}

// 4. Pasarse de largo por el mismo sitio no resta
{
  const una = computeScore(stroke(360));
  const dos = computeScore(stroke(720, { slowFrom: 690 }));
  check("dar vuelta y media o dos vueltas no castiga",
    Math.abs(dos - una) < 0.01, `1 vuelta=${una.toFixed(3)} 2 vueltas=${dos.toFixed(3)}`);
}

// 5. Pero pasarse por otro lado sí: la segunda vuelta se mete 30 px hacia dentro
{
  const desviado = [...stroke(360, { slowFrom: 9999 }), ...stroke(360, { R: 120, slowFrom: 9999 })];
  const s = computeScore(desviado);
  check("pasarse desviándose sí baja la nota", s < THRESHOLD, `score=${s.toFixed(3)}`);
}

// 6. Sin cerrar no hay premio, por impecable que sea el arco
{
  const s270 = computeScore(stroke(270, { slowFrom: 9999 }));
  const s340 = computeScore(stroke(340, { slowFrom: 9999 }));
  check("arco de 270° suspende", s270 < THRESHOLD, `score=${s270.toFixed(3)}`);
  check("arco de 340° (20° de hueco) puntúa por debajo del cierre",
    s340 < 0.96 && s340 > s270, `score=${s340.toFixed(3)}`);
}

// 7. El sentido del trazo da igual
{
  const horario = computeScore(stroke(360));
  const anti = computeScore(stroke(360, { dir: -1 }));
  check("antihorario puntúa igual que horario",
    Math.abs(horario - anti) < 1e-9, `${horario.toFixed(3)} vs ${anti.toFixed(3)}`);
}

// 8. Un óvalo no cuela
{
  const oval: Pt[] = [];
  for (let d = 0; d <= 360; d += 2) {
    const a = (d * Math.PI) / 180;
    oval.push({ x: 300 + 180 * Math.cos(a), y: 300 + 120 * Math.sin(a) });
  }
  check("óvalo 1.5:1 suspende", computeScore(oval) < THRESHOLD, `score=${computeScore(oval).toFixed(3)}`);
}

// 9. Degenerados: trazo corto, garabato diminuto y línea recta
{
  check("menos de 20 puntos → 0", computeScore(stroke(30, { slowFrom: 9999 })) === 0);
  check("círculo diminuto (r < 20) → 0", computeScore(stroke(360, { R: 12 })) === 0);
  const recta: Pt[] = Array.from({ length: 100 }, (_, i) => ({ x: i * 4, y: 200 }));
  check("línea recta → 0", computeScore(recta) === 0, `score=${computeScore(recta)}`);
}

console.log(fails === 0 ? "\nTODO OK" : `\n${fails} FALLO(S)`);
process.exit(fails === 0 ? 0 : 1);
