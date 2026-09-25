// Tests del reparto — `npx tsx app/apps/evolution/reparto.test.ts`. Comprueban que mirar el
// mundo no lo cambia ni lo pierde.
import { RASGOS, copiar, correrDia, crearMundo } from "./engine";
import { BINS, columnas, crearHistoria, registrar, type Historia } from "./reparto";

let fallos = 0;
function check(nombre: string, ok: boolean, detalle = "") {
  console.log(`${ok ? "✓" : "✗"} ${nombre}${detalle ? "  " + detalle : ""}`);
  if (!ok) fallos++;
}

const SEMILLA = "raiz";
const DIAS = 60;

/** Una partida registrada en cada amanecer, como en la página. */
function partida(dias: number) {
  const m = crearMundo(SEMILLA);
  const h = crearHistoria();
  for (let d = 0; d < dias && !m.extinto; d++) { correrDia(m); registrar(h, m); }
  return { m, h };
}

/** La historia en una cadena, para comparar. */
const firma = (h: Historia) => h.dias.filter(Boolean).map((d) =>
  `${d.dia}:${d.censo}:${[...d.cuentas].join("")}:${[...d.med].map((x) => x.toFixed(9)).join(",")}`
).join("|");

// 1. Ningún bicho se queda fuera de la escala: las franjas de los extremos son abiertas.
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

// 2. Volver atrás y revivir da la misma historia. Se revive menos de lo guardado: si no, los
//    días nuevos taparían a los viejos y pasaría sin cortar nada.
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

// 3. Comprimir no inventa ni pierde forma: cada fila suma uno y las columnas cubren la partida.
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
