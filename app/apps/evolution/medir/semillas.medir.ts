// La criba del dado — `npx tsx app/apps/evolution/medir/semillas.medir.ts [palabra,…]`.
// No es un test: mide. Fuera del build.
//
// Se pasa cuando cambia el motor. Saca las que no pasan —extintas antes de `DIAS`, o con una isla
// vacía— y el reparto de las que sí por forma, diseño y clima.

import { URNA, amanecer, anochecer, crearMundo, formaDe, tick } from "../engine";
import { DESIGNS, designFor } from "../designs";
import { FORMAS, isla } from "../formas";
import { PALABRAS } from "../semillas";

const DIAS = 300;

const lista = process.argv[2] ? process.argv[2].split(",") : PALABRAS;
const reparto = new Map<string, number>();
const caidas: string[] = [];

for (const s of lista) {
  const m = crearMundo(s);
  for (let d = 0; d < DIAS && !m.extinto; d++) {
    for (;;) if (tick(m)) break;
    anochecer(m);
    if (m.extinto) break;
    amanecer(m);
  }
  const celda = `${formaDe(s)} ${designFor(s).nombre} ${m.cfg.comidas}`;
  const islas = new Set(m.bichos.map((b) => isla(m.cfg, b.x))).size;
  if (m.extinto) caidas.push(`${s}\t${celda}\textinta el día ${m.dia}`);
  else if (m.cfg.forma === "islas" && islas < 2) caidas.push(`${s}\t${celda}\tuna isla vacía`);
  else reparto.set(celda, (reparto.get(celda) ?? 0) + 1);
}

console.log(caidas.length ? `No pasan (${caidas.length}):\n${caidas.join("\n")}\n` : "Pasan todas.\n");
console.log(["forma", "familia", ...URNA.map(String)].join("\t"));
for (const f of FORMAS) for (const d of DESIGNS) {
  console.log([f, d.nombre, ...URNA.map((c) => reparto.get(`${f} ${d.nombre} ${c}`) ?? 0)].join("\t"));
}
