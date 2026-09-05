// Lo que un diseño no puede romper — `npx tsx app/apps/evolution/designs.test.ts`.
//
// Los cuatro diseños comparten el mismo contrato de genes y solo cambian el material. Lo que se
// comprueba aquí es el contrato, no el dibujo: el dibujo se mira, y para eso está
// `WEB/material/recursos/evolution-banco/validar.html`.

import { FUNDADOR, RASGOS, hashSemilla, type Genoma } from "./engine";
import { DESIGNS, VENTANA, designFor, medidas, posGen } from "./designs";

let fallos = 0;
const check = (nombre: string, ok: boolean, detalle = "") => {
  console.log(`${ok ? "✓" : "✗"} ${nombre}${detalle ? "  " + detalle : ""}`);
  if (!ok) fallos++;
};
const cerca = (a: number, b: number, t = 0.02) => Math.abs(a - b) <= t;

// 1. **El fundador nace liso**, que es lo que convierte el cuerpo en un display de diferencia: todo
//    lo que se le ve encima a un bicho es lo que le ha pasado a su linaje. Si un gen dejara de caer
//    en el centro de su ventana, el bicho del primer día saldría ya con adornos y esa lectura se
//    perdería sin que fallara nada.
{
  const m = medidas(FUNDADOR);
  const centro = RASGOS.filter((r) => !cerca(({ empuje: m.sp, talla: m.ta, vision: m.vi, fiereza: m.fi, sociabilidad: m.so, retorno: m.re })[r], 0.5));
  check("el fundador cae en el centro de las seis ventanas", centro.length === 0,
    centro.length ? `fuera: ${centro.join(", ")}` : "los seis en 0,50");
  check("y por tanto nace sin ningún adorno",
    m.brazo === 0 && m.pala === 0 && m.pata === 0 && m.pincho === 0 && m.aleta === 0,
    `brazo ${m.brazo} · pala ${m.pala} · pata ${m.pata} · pincho ${m.pincho} · aleta ${m.aleta}`);
}

// 2. La ventana tiene que contener al fundador, o el gen se pintaría pegado a un borde desde el
//    primer día y la mitad de su recorrido no se visitaría nunca.
{
  const malos = RASGOS.filter((r) => FUNDADOR[r] <= VENTANA[r][0] || FUNDADOR[r] >= VENTANA[r][1]);
  check("el fundador cae dentro de las seis ventanas", malos.length === 0, malos.join(", ") || "los seis");
}

// 3. La barra deja margen fuera de la ventana: un linaje que se salga del p99 tiene que poder
//    pintarse más allá de la muesca, no amontonarse contra el borde con los que apenas la rozan.
{
  const r = "talla" as const;
  const [lo, hi] = VENTANA[r];
  const fuera = posGen(r, hi * 1.3), dentro = posGen(r, hi);
  check("pasado el p99 la barra sigue teniendo sitio", fuera > dentro && fuera <= 1,
    `p99 en ${dentro.toFixed(2)}, ×1,3 del p99 en ${fuera.toFixed(2)}`);
  check("y el p01 y el p99 no están pegados a los bordes",
    posGen(r, lo) > 0.05 && posGen(r, hi) < 0.95,
    `${posGen(r, lo).toFixed(2)} … ${posGen(r, hi).toFixed(2)}`);
}

// 4. **Ningún diseño puede quedarse sin sitio.** `extension` es lo que la leyenda usa para encajar
//    una fila entera a una sola escala: si devuelve 0, infinito o `NaN` para algún genoma, la
//    muestra se pinta a escala absurda y no falla nada — sale una celda vacía o un borrón.
{
  const extremos: Genoma[] = [FUNDADOR];
  for (const r of RASGOS) for (const v of VENTANA[r]) extremos.push({ ...FUNDADOR, [r]: v });
  // Y las cuatro esquinas que de verdad aprietan, que son las que mezclan genes:
  extremos.push(
    { ...FUNDADOR, talla: VENTANA.talla[1], empuje: VENTANA.empuje[1] },
    { ...FUNDADOR, talla: VENTANA.talla[0], vision: VENTANA.vision[1] },
    { ...FUNDADOR, sociabilidad: VENTANA.sociabilidad[1], fiereza: VENTANA.fiereza[1] },
    { ...FUNDADOR, sociabilidad: VENTANA.sociabilidad[0], fiereza: VENTANA.fiereza[1], retorno: VENTANA.retorno[1] },
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

// 5. Cada diseño trae su mundo y su comida. Un diseño a medias —cuerpo nuevo, suelo prestado— es
//    justo el error que no se ve hasta que alguien mira una semilla que nadie había mirado.
for (const d of DESIGNS) {
  const p = d.paleta("light"), q = d.paleta("dark");
  const roles = Object.keys(p) as (keyof typeof p)[];
  const vacios = roles.filter((k) => !p[k] || !q[k]);
  check(`${d.nombre}: paleta completa en los dos temas`, vacios.length === 0, vacios.join(", "));
  check(`${d.nombre}: tiene cuerpo, comida y suelo propios`,
    typeof d.cuerpo === "function" && typeof d.comida === "function" && typeof d.fondo === "function");
}

// 6. **El reparto de semillas no puede estar sesgado.** Si una palabra de cada dos cayera en el
//    mismo diseño, tres cuartas partes del trabajo no las vería nadie.
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
  // Y la misma palabra tiene que dar siempre el mismo, o la promesa de la semilla se rompe.
  check("la misma palabra da siempre el mismo diseño",
    designFor("hola").id === designFor("hola").id && hashSemilla("hola") === hashSemilla("hola"));
}

console.log(fallos ? `\n${fallos} fallo(s).` : "\nTodo en verde.");
process.exit(fallos ? 1 : 0);
