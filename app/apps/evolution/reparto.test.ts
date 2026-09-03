// Los tests del observador — `npx tsx app/apps/evolution/reparto.test.ts`.
// No es parte del build; corre sin navegador y en segundos, no en minutos.
//
// **Estos no comprueban el mundo, comprueban que mirarlo no lo cambia ni lo pierde.** Los de
// `engine.test.ts` son predicciones evolutivas falsables; aquí no hay nada que predecir: el
// reparto es aritmética sobre una población que ya existe. Lo que sí hay son tres formas de
// mentir en silencio —perder bichos por el camino, dejar futuro guardado de un mundo que ha
// vuelto atrás, y comprimir la historia inventando forma— y ninguna de las tres falla sola.
import { RASGOS, copiar, correrDia, crearMundo } from "./engine";
import { BINS, columnas, crearHistoria, registrar, type Historia } from "./reparto";

let fallos = 0;
function check(nombre: string, ok: boolean, detalle = "") {
  console.log(`${ok ? "✓" : "✗"} ${nombre}${detalle ? "  " + detalle : ""}`);
  if (!ok) fallos++;
}

const SEMILLA = "hola";
const DIAS = 60;

/** Corre una partida registrando cada amanecer, que es donde la página llamará. */
function partida(dias: number) {
  const m = crearMundo(SEMILLA);
  const h = crearHistoria(m.eva);
  for (let d = 0; d < dias && !m.extinto; d++) { correrDia(m); registrar(h, m); }
  return { m, h };
}

/** La historia entera en una cadena, para comparar dos de un vistazo. */
const firma = (h: Historia) => h.dias.filter(Boolean).map((d) =>
  `${d.dia}:${d.censo}:${[...d.cuentas].join("")}:${[...d.med].map((x) => x.toFixed(9)).join(",")}`
).join("|");

// 1. Ningún bicho se queda fuera de la escala. Las franjas de los extremos son abiertas —«÷8 o
//    menos»—, así que un gen que se dispare tiene que acabar contado en la última y no perdido:
//    perder bichos por arriba dejaría una banda que se estrecha sin que nadie haya muerto.
{
  const { h } = partida(DIAS);
  let mal = 0;
  for (const d of h.dias) {
    for (let i = 0; i < RASGOS.length; i++) {
      let suma = 0;
      for (let j = 0; j < BINS; j++) suma += d.cuentas[i * BINS + j];
      if (suma !== d.censo) mal++;
    }
  }
  check("cada franja cuenta a todos y solo a los vivos", mal === 0, `${h.dias.length} días`);
}

// 2. Volver atrás y revivir da la misma historia que no haber vuelto nunca. El mundo es
//    determinista, así que los días revividos son los mismos días — pero solo si el observador
//    **corta el futuro** al volver. Por eso se revive **menos de lo que se había guardado**: si
//    se reviviera lo mismo, los días nuevos taparían a los viejos uno a uno y el test pasaría
//    igual sin cortar nada, que es la forma de no comprobar nada y creer que sí.
{
  const largo = partida(DIAS);
  const corto = partida(DIAS - 20);
  const guardado = copiar(corto.m);
  for (let d = 0; d < 20 && !corto.m.extinto; d++) { correrDia(corto.m); registrar(corto.h, corto.m); }
  const vuelto = copiar(guardado);
  for (let d = 0; d < 10 && !vuelto.extinto; d++) { correrDia(vuelto); registrar(corto.h, vuelto); }
  check("volver atrás y revivir no deja cola del mundo que ya no ocurre",
    firma(corto.h) === firma(partida(DIAS - 10).h),
    `${largo.h.dias.length} guardados, ${corto.h.dias.length} tras volver`);
}

// 3. Comprimir no inventa ni pierde forma. Una columna de cuatro días tiene que ser la misma
//    banda que la de esos cuatro días juntos —sumar histogramas es exacto—, así que la
//    comprobación es que cada fila sigue sumando uno y que las columnas cubren la partida entera
//    sin solaparse ni dejar hueco.
{
  const { h } = partida(DIAS);
  for (const n of [DIAS, 17, 7, 1]) {
    const cs = columnas(h, n);
    let mal = "";
    if (cs.length > n) mal = `${cs.length} columnas para ${n}`;
    if (cs[0].desde !== 1) mal ||= `empieza en el día ${cs[0].desde}`;
    if (cs[cs.length - 1].hasta !== h.dias.length) mal ||= `acaba en el día ${cs[cs.length - 1].hasta}`;
    for (let k = 1; k < cs.length; k++) if (cs[k].desde !== cs[k - 1].hasta + 1) mal ||= `hueco en ${cs[k].desde}`;
    for (const c of cs) for (let i = 0; i < RASGOS.length; i++) {
      let suma = 0;
      for (let j = 0; j < BINS; j++) suma += c.densidad[i * BINS + j];
      if (Math.abs(suma - 1) > 1e-9) mal ||= `fila de ${RASGOS[i]} suma ${suma.toFixed(6)}`;
    }
    check(`la historia en ${n} columnas cubre la partida entera`, !mal, mal || `${cs.length} columnas`);
  }
}

console.log(fallos === 0 ? "\nTodo en orden." : `\n${fallos} fallo(s).`);
process.exit(fallos ? 1 : 0);
