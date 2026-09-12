// Qué le hace al mundo que comerse a otro tarde — `npx tsx app/apps/evolution/dentellada.medir.ts`.
//
// **No es un test: no falla, mide.** La cifra de `ticksPresa` la eligió el ojo —un segundo a ×1—,
// así que lo que no puede quedar sin medir es lo otro: mordiendo no se decide ni se anda, ni el
// que muerde ni el mordido, y eso es jornada que se pierde. En 0 se come en el tick del contacto,
// que es como estuvo el mundo hasta que la depredación se pudo mirar.
//
// La pregunta es si la ecología lo nota: si baja la depredación, si sube el censo, si la talla y
// la fiereza acaban en otro sitio. Un cambio que solo se ve en la pantalla no debería mover nada
// de esto; uno que lo mueva hay que decidirlo, no descubrirlo.
import { CONFIG, correrDia, crearMundo, mediana, resumen } from "./engine";

const SEMILLAS = ["hola", "pablo", "claudio", "mar", "brizna", "raiz", "sal", "duna",
                  "ocho", "nueve", "diez", "once", "sur", "norte", "cal", "arena",
                  "hoja", "rama", "polvo", "cima", "vado", "junco", "era", "brea"];
const DIAS = 200;
const fmt = (n: number, d = 2) => (Number.isFinite(n) ? n.toFixed(d) : "—").padStart(9);
const fila = (xs: (string | number)[]) => console.log(xs.map((x) => String(x).padStart(9)).join(" "));

console.log(`\n## La dentellada: ${SEMILLAS.length} semillas, ${DIAS} días\n`);
fila(["ticks", "vivas", "censo", "comidos", "%presa", "talla", "fiereza", "vision"]);

for (const ticksPresa of [0, 15, 30, 60, 120]) {
  const censos: number[] = [], presa: number[] = [], comidos: number[] = [];
  const talla: number[] = [], fiereza: number[] = [], vision: number[] = [];
  let vivas = 0;
  for (const s of SEMILLAS) {
    const m = crearMundo(s, { ticksPresa });
    for (let d = 0; d < DIAS && !m.extinto; d++) correrDia(m);
    if (m.extinto || m.bichos.length < 3) continue;
    vivas++;
    const r = resumen(m);
    censos.push(r.censo);
    comidos.push(m.cuenta.comidos / m.dia);
    const muertes = m.cuenta.hambre + m.cuenta.comidos + m.cuenta.vejez;
    presa.push(muertes ? (100 * m.cuenta.comidos) / muertes : 0);
    talla.push(r.medianas.talla); fiereza.push(r.medianas.fiereza); vision.push(r.medianas.vision);
  }
  fila([ticksPresa, `${vivas}/${SEMILLAS.length}`, fmt(mediana(censos), 0), fmt(mediana(comidos)),
    fmt(mediana(presa), 1), fmt(mediana(talla)), fmt(mediana(fiereza)), fmt(mediana(vision), 1)]);
}

console.log(`\nEl mundo por defecto está en ticksPresa ${CONFIG.ticksPresa}.`);
console.log("A leer: `comidos` son presas al día y `%presa` la parte de las muertes que causa otro bicho.");
console.log("Si las dos bajan mucho, la dentellada no es pintado: está apagando la depredación.");
