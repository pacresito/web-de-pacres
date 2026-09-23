// Las palabras del dado contra su criba — `npx tsx app/apps/evolution/semillas.medir.ts [palabra,…]`.
//
// **No es un test: no falla, mide.** Cien mundos a 300 días son un par de minutos, demasiado para
// correr con cada cambio; se pasa cuando cambia el motor, que es cuando la lista puede caducar.
// Sin argumentos mide `PALABRAS`; con una lista separada por comas, mide candidatas.
//
// Lo que sale: las que se extinguen antes de `DIAS` y el reparto de las que no por familia de mundo
// y clima, que es lo que hay que mantener parejo.

import { URNA, amanecer, anochecer, crearMundo, tick } from "./engine";
import { DESIGNS, designFor } from "./designs";
import { PALABRAS } from "./semillas";

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
  const celda = `${designFor(s).nombre} ${m.cfg.comidas}`;
  if (m.extinto) caidas.push(`${s}\t${celda}\textinta el día ${m.dia}`);
  else reparto.set(celda, (reparto.get(celda) ?? 0) + 1);
}

console.log(caidas.length ? `No pasan (${caidas.length}):\n${caidas.join("\n")}\n` : "Pasan todas.\n");
console.log(["familia", ...URNA.map(String)].join("\t"));
for (const d of DESIGNS) console.log([d.nombre, ...URNA.map((c) => reparto.get(`${d.nombre} ${c}`) ?? 0)].join("\t"));
