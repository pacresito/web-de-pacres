// El contrato de los diseños — `npx tsx app/apps/evolution/designs.test.ts`. El dibujo se mira en
// `WEB/material/recursos/evolution-banco/validar.html`.

import { hashSemilla } from "./azar";
import { FUNDADOR, RASGOS, type Genoma } from "./engine";
import { DESIGNS, ESCALA, RECORRIDO, designFor, medidas, posGen } from "./designs";

let fallos = 0;
const check = (nombre: string, ok: boolean, detalle = "") => {
  console.log(`${ok ? "✓" : "✗"} ${nombre}${detalle ? "  " + detalle : ""}`);
  if (!ok) fallos++;
};
const cerca = (a: number, b: number, t = 0.02) => Math.abs(a - b) <= t;

// 1. El fundador nace liso: la escala de pintado se cuenta desde él.
{
  const m = medidas(FUNDADOR);
  const centro = RASGOS.filter((r) => !cerca(({ empuje: m.sp, talla: m.ta, vision: m.vi, fiereza: m.fi, sociabilidad: m.so, retorno: m.re })[r], 0.5));
  check("el fundador cae en el centro de las seis escalas", centro.length === 0,
    centro.length ? `fuera: ${centro.join(", ")}` : "los seis en 0,50");
  check("y por tanto nace sin ningún adorno",
    m.brazo === 0 && m.pala === 0 && m.pata === 0 && m.pincho === 0 && m.aleta === 0,
    `brazo ${m.brazo} · pala ${m.pala} · pata ${m.pata} · pincho ${m.pincho} · aleta ${m.aleta}`);
  // Y en el eje de la tira, que es otra escala.
  const fuera = RASGOS.filter((r) => Math.abs(posGen(r, FUNDADOR[r]) - 0.5) > 1e-9);
  check("y cae en el centro exacto del eje de la tira", fuera.length === 0,
    fuera.length ? `fuera: ${fuera.join(", ")}` : "los seis en 0,50");
}

// 2. La escala de pintado recorta el recorrido medido, nunca lo estira, y el fundador cae dentro.
{
  const anchas = RASGOS.filter((r) => ESCALA[r][0] < RECORRIDO[r][0] || ESCALA[r][1] > RECORRIDO[r][1]);
  check("la escala de pintado cabe dentro del recorrido medido", anchas.length === 0,
    anchas.join(", ") || "las seis");
  const malos = RASGOS.filter((r) => FUNDADOR[r] <= RECORRIDO[r][0] || FUNDADOR[r] >= RECORRIDO[r][1]);
  check("el fundador cae dentro de los seis recorridos", malos.length === 0, malos.join(", ") || "los seis");
}

// 3. La barra deja margen fuera del recorrido para el linaje que se salga.
{
  const r = "talla" as const;
  const [lo, hi] = RECORRIDO[r];
  const fuera = posGen(r, hi * 1.3), dentro = posGen(r, hi);
  check("pasado el p99 la barra sigue teniendo sitio", fuera > dentro && fuera <= 1,
    `p99 en ${dentro.toFixed(2)}, ×1,3 del p99 en ${fuera.toFixed(2)}`);
  check("y el p01 y el p99 no están pegados a los bordes",
    posGen(r, lo) > 0.05 && posGen(r, hi) < 0.95,
    `${posGen(r, lo).toFixed(2)} … ${posGen(r, hi).toFixed(2)}`);
}

// 4. `extension` es finita y positiva para cualquier genoma: la leyenda encaja con ella.
{
  const extremos: Genoma[] = [FUNDADOR];
  for (const r of RASGOS) for (const v of RECORRIDO[r]) extremos.push({ ...FUNDADOR, [r]: v });
  // Y las esquinas que mezclan genes, que son las que aprietan:
  extremos.push(
    { ...FUNDADOR, talla: RECORRIDO.talla[1], empuje: RECORRIDO.empuje[1] },
    { ...FUNDADOR, talla: RECORRIDO.talla[0], vision: RECORRIDO.vision[1] },
    { ...FUNDADOR, sociabilidad: RECORRIDO.sociabilidad[1], fiereza: RECORRIDO.fiereza[1] },
    { ...FUNDADOR, sociabilidad: RECORRIDO.sociabilidad[0], fiereza: RECORRIDO.fiereza[1], retorno: RECORRIDO.retorno[1] },
  );
  for (const d of DESIGNS) {
    const malo = extremos.find((g) => {
      const [x, y] = d.extension(g, g.talla);
      return !Number.isFinite(x) || !Number.isFinite(y) || x <= 0 || y <= 0 || x > g.talla * 40 || y > g.talla * 40;
    });
    check(`${d.nombre}: la extensión es finita y sensata en los ${extremos.length} genomas de prueba`,
      !malo, malo ? JSON.stringify(malo) : "");
  }
}

// 5. Cada diseño trae su suelo y su comida.
for (const d of DESIGNS) {
  const p = d.paleta("light"), q = d.paleta("dark");
  const roles = Object.keys(p) as (keyof typeof p)[];
  const vacios = roles.filter((k) => !p[k] || !q[k]);
  check(`${d.nombre}: paleta completa en los dos temas`, vacios.length === 0, vacios.join(", "));
  check(`${d.nombre}: tiene cuerpo, comida y suelo propios`,
    typeof d.cuerpo === "function" && typeof d.comida === "function" && typeof d.suelo === "function");
}

// 6. Las semillas se reparten entre los diseños sin sesgo.
{
  const cuenta = new Map<string, number>();
  const N = 4000;
  for (let i = 0; i < N; i++) {
    const id = designFor(`semilla-${i}`).id;
    cuenta.set(id, (cuenta.get(id) ?? 0) + 1);
  }
  const esperado = N / DESIGNS.length;
  const peor = Math.max(...[...cuenta.values()].map((v) => Math.abs(v - esperado) / esperado));
  check("las semillas se reparten entre los cuatro diseños", cuenta.size === DESIGNS.length && peor < 0.15,
    [...cuenta.entries()].map(([k, v]) => `${k} ${v}`).join(" · "));
  // Y la misma palabra da siempre el mismo.
  check("la misma palabra da siempre el mismo diseño",
    designFor("hola").id === designFor("hola").id && hashSemilla("hola") === hashSemilla("hola"));
}

console.log(fallos ? `\n${fallos} fallo(s).` : "\nTodo en verde.");
process.exit(fallos ? 1 : 0);
