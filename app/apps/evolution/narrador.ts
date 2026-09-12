/**
 * El diario de la partida: lo que pasa **una sola vez**.
 *
 * El mundo cierra un día cada diecisiete segundos a ×1 y cada dos a ×64, así que un renglón por
 * día es un teletipo que nadie lee. Aquí solo se escribe lo irrepetible —la primera vez de cada
 * cosa—, y por eso **ningún evento lleva umbral que calibrar**: la condición es «no había pasado
 * nunca», que se apaga sola en cuanto pasa. El diario habla mucho los primeros días, se va
 * callando conforme la partida se acostumbra, y vuelve a hablar el día que ocurre algo que no
 * había ocurrido. Estar callado es información.
 *
 * **Se narra sobre lo que el motor ya cuenta** —`m.cuenta`, el censo, las medianas de los genes—:
 * un estadístico que solo existiera para el diario sería el mundo calculando su propia crónica.
 *
 * **Y se narra sobre acumulados, nunca sobre el delta del día.** Eso da dos cosas gratis. Una,
 * volver atrás no necesita deshacer nada: los acumulados viven en el mundo y se restauran con él,
 * así que revivir un día reescribe su misma línea. Dos, la cola se drena sola — de un día sale
 * como mucho una línea, y lo que no cupo sigue cumpliéndose mañana, que es cuando se escribe. Por
 * eso ninguna línea dice «el primero» de nada: la que se escribe tarde se contradiría con su
 * propia cifra.
 *
 * Cada línea **cita el número que la disparó y no lo interpreta** (regla 5 del plan). Y con
 * reproducción asexual no hay especies: cada linaje es independiente, así que aquí no se nombran.
 */

import { RASGOS, mediana, type Genoma, type Mundo, type Rasgo } from "./engine";

/** Una línea del diario. `clave` es la identidad de lo que pasó: es lo que no se repite. */
export type Evento = { dia: number; clave: string; texto: string };

/**
 * La partida contada. `censo` es la serie del censo al cerrar cada día —`censo[i]` es el día
 * `i+1`— y está solo para las caídas, que son lo único que necesita mirar hacia atrás: una
 * población se hunde **respecto a lo que llegó a ser**, no respecto a un número escrito aquí.
 */
export type Diario = { eventos: Evento[]; censo: number[] };

export const crearDiario = (): Diario => ({ eventos: [], censo: [] });

type Aviso = { clave: string; texto: string };

const num = (x: number) => x.toLocaleString("es-ES", { maximumSignificantDigits: 3 }).replace("-", "−");
const nombre = (r: Rasgo) => (r === "vision" ? "visión" : r);
const veces = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

/**
 * Las octavas que se narran de un gen, con el nombre que lleva cada una. Son las mismas que
 * enseña la leyenda —la mitad, el fundador, el doble—, y esa es la razón de que estén: el diario
 * mide en la vara en la que se está mirando la población, o diría de un gen algo que la barra de
 * al lado no enseña.
 */
const OCTAVAS: { clave: string; factor: number; texto: string }[] = [
  { clave: "x2", factor: 2, texto: "dobla la del fundador" },
  { clave: "x4", factor: 4, texto: "es cuatro veces la del fundador" },
  { clave: "x8", factor: 8, texto: "es ocho veces la del fundador" },
  { clave: "d2", factor: 1 / 2, texto: "cae a la mitad de la del fundador" },
  { clave: "d4", factor: 1 / 4, texto: "cae a la cuarta parte de la del fundador" },
  { clave: "d8", factor: 1 / 8, texto: "cae a la octava parte de la del fundador" },
];

/** Lo hundida que puede estar una población respecto de lo que llegó a ser. */
const CAIDAS: [number, string][] = [[8, "la octava parte"], [4, "la cuarta parte"], [2, "la mitad"]];

/** Hasta dónde llegó ya una familia de marcas de población, leído de lo que el diario escribió. */
const marca = (d: Diario, prefijo: string): number =>
  d.eventos.reduce((x, e) => (e.clave.startsWith(prefijo) ? Number(e.clave.slice(prefijo.length)) : x), 0);

/**
 * Todo lo que hoy sería noticia, de lo más gordo a lo más fino. El orden **es** la prioridad: de
 * un día sale la primera línea que todavía no se haya escrito nunca, y las demás esperan a mañana.
 */
function candidatos(m: Mundo, eva: Genoma, d: Diario): Aviso[] {
  const censo = d.censo;
  const av: Aviso[] = [];
  const n = m.bichos.length;
  const c = m.cuenta;
  const muertos = c.hambre + c.comidos + c.vejez;

  if (m.extinto) {
    av.push({ clave: "extincion", texto: `extinción · ${veces(c.nacidos, "nacido", "nacidos")} y ${veces(muertos, "muerto", "muertos")} en toda la partida` });
    return av;   // de un mundo vacío no hay nada más que contar, y sus medianas son un NaN
  }
  if (n === 1) av.push({ clave: "ultimo", texto: `queda uno · ${veces(c.nacidos, "nacido", "nacidos")} y ${muertos} muertos hasta hoy` });

  // **El clima no se narra: es la vara con la que se leen las demás líneas, y lo pinta el diario
  // fuera de la cuenta de los días.** Como evento gastaba el turno del día 1 y empujaba «ya hay
  // crías» al día 4, que es cuando ya van cuarenta y cuatro.
  //
  // Y tampoco se narra que la población pase de la comida, porque **no pasa**: medido en ocho
  // semillas, el censo máximo se queda entre el 68% y el 96% del clima —la comida del día es el
  // techo y nadie lo toca—. Un evento que no puede dispararse es un gen decorativo con otro nombre.
  // Y una caída se mide contra lo que esa población llegó a ser, que tampoco es un número elegido
  // aquí. **De un hundimiento sale una sola línea, la más honda**: quien cae a la octava parte ha
  // pasado por la mitad y por el cuarto, y contarlo tres días seguidos es contar tres veces lo
  // mismo mientras está pasando.
  let cima = 0, diaCima = 0;
  for (let i = 0; i < censo.length; i++) if (censo[i] > cima) { cima = censo[i]; diaCima = i + 1; }
  const hundido = marca(d, "caida-");
  for (const [f, cuanto] of CAIDAS) {
    if (f <= hundido || n * f > cima) continue;
    av.push({ clave: `caida-${f}`, texto: `la población cae a ${cuanto} de su máximo · quedan ${n} de los ${cima} del día ${diaCima}` });
    break;
  }
  if (!m.bichos.some((b) => b.gen === 0)) {
    const linaje = Math.max(...m.bichos.map((b) => b.gen));
    av.push({ clave: "sin-fundador", texto: `muere el fundador · quedan ${n}, hasta la generación ${linaje}` });
  }

  // **«Ya ha», nunca «empieza» ni «el primero».** La cola puede retrasar una línea varios días y
  // la cifra que la acompaña es el acumulado del mundo, no la del día: «el hambre empieza a matar
  // · 28» leído el día 5 dice que hoy han muerto veintiocho, y lo que pasó es que empezó el día 2
  // y van veintiocho. El verbo es lo único que evita esa lectura.
  if (c.comidos > 0) av.push({ clave: "depredacion", texto: `ya hay quien se come a otro · ${veces(c.comidos, "comido", "comidos")} hasta hoy` });
  if (c.hambre > 0) av.push({ clave: "hambre", texto: `el hambre ya mata · ${veces(c.hambre, "muerto", "muertos")} hasta hoy` });
  if (c.vejez > 0) av.push({ clave: "vejez", texto: `la vejez ya mata · ${veces(c.vejez, "muerto", "muertos")} a los ${m.cfg.vida} días` });
  if (c.nacidos > 0) av.push({ clave: "crias", texto: `ya hay crías · ${veces(c.nacidos, "nacida", "nacidas")} hasta hoy, censo ${n}` });
  if (c.fuera > 0) av.push({ clave: "intemperie", texto: `ya hay quien duerme a la intemperie · ${veces(c.fuera, "noche", "noches")} fuera hasta hoy` });

  for (const r of RASGOS) {
    const med = mediana(m.bichos.map((b) => b.g[r]));
    // La sociabilidad no se lee en octavas —vale menos que cero cuando esquiva—, y su mediana
    // tampoco sirve: vive pegada al cero y cruzarlo por tres milésimas es ruido, no noticia. Lo
    // que sí pasa una vez es que **no quede nadie del lado del que nació el fundador**. Sin esa
    // condición la línea sale el día 2 con cinco bichos que nunca fueron de otra manera: la
    // mutación suma de poco en poco, así que una población joven hereda entero el signo de Eva.
    if (r === "sociabilidad") {
      const e = eva[r];
      if (e >= 0 && m.bichos.every((b) => b.g[r] < 0)) av.push({ clave: "todos-esquivan", texto: `ya nadie busca compañía · los ${n} esquivan, mediana ${num(med)}` });
      if (e <= 0 && m.bichos.every((b) => b.g[r] > 0)) av.push({ clave: "todos-buscan", texto: `ya nadie esquiva · los ${n} buscan compañía, mediana ${num(med)}` });
      continue;
    }
    for (const o of OCTAVAS) {
      const meta = eva[r] * o.factor;
      if (o.factor > 1 ? med >= meta : med <= meta) {
        av.push({ clave: `gen-${r}-${o.clave}`, texto: `la mediana de ${nombre(r)} ${o.texto} · ${num(med)} frente a ${num(eva[r])}` });
      }
    }
  }

  return av;
}

/**
 * Borra de `desde` en adelante: lo que el mundo tenía por delante cuando volvió atrás deja de
 * existir, y con ello su clave vuelve a estar sin usar. Lo llaman los dos que pueden dejar el
 * diario por delante del mundo — narrar un día que ya se vivió, y volver diez días atrás.
 */
export function olvidar(d: Diario, desde: number) {
  while (d.eventos.length > 0 && d.eventos[d.eventos.length - 1].dia >= desde) d.eventos.pop();
  d.censo.length = Math.max(0, desde - 1);
}

/**
 * Narra el día que acaba de cerrarse. Se llama al amanecer, en el mismo sitio que `registrar`:
 * es el único momento en el que el día anterior ya está contado y el siguiente no ha empezado.
 *
 * Lo primero que hace es **borrar lo que ya no ha pasado**, como el reparto: si el mundo ha vuelto
 * atrás, las líneas de los días que tenía por delante dejan de existir —y con ellas su clave, que
 * vuelve a estar sin usar—. Revivir escribe exactamente lo mismo, que para eso el mundo es
 * determinista, y lo comprueba `narrador.test.ts`.
 */
export function narrar(d: Diario, m: Mundo, eva: Genoma): Evento | null {
  if (m.dia < 1) return null;
  olvidar(d, m.dia);

  const vistas = new Set(d.eventos.map((e) => e.clave));
  const aviso = candidatos(m, eva, d).find((a) => !vistas.has(a.clave));
  d.censo.push(m.bichos.length);
  if (!aviso) return null;

  const evento = { dia: m.dia, ...aviso };
  d.eventos.push(evento);
  return evento;
}
