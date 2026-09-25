// El diario de la partida: solo lo que pasa una vez, así que ningún evento tiene umbral que
// calibrar. Se narra sobre los acumulados del mundo, no sobre el día: volver atrás no deshace
// nada, y lo que no cabe hoy se escribe mañana (por eso ninguna línea dice «el primero»). Cada
// línea cita el número que la disparó, sin interpretarlo.

import { RASGOS, mediana, nombreDe, type Genoma, type Mundo } from "./engine";

/** Una línea del diario. `clave` es lo que no se repite. */
export type Evento = { dia: number; clave: string; texto: string };

/** `censo[i]` es el censo al cerrar el día `i+1`: solo para medir las caídas. */
export type Diario = { eventos: Evento[]; censo: number[] };

export const crearDiario = (): Diario => ({ eventos: [], censo: [] });

type Aviso = { clave: string; texto: string };

const num = (x: number) => x.toLocaleString("es-ES", { maximumSignificantDigits: 3 }).replace("-", "−");
const veces = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

/** Las octavas que se narran de un gen: las mismas que enseña la leyenda. */
const OCTAVAS: { clave: string; factor: number; texto: string }[] = [
  { clave: "x2", factor: 2, texto: "dobla la del fundador" },
  { clave: "x4", factor: 4, texto: "es cuatro veces la del fundador" },
  { clave: "x8", factor: 8, texto: "es ocho veces la del fundador" },
  { clave: "d2", factor: 1 / 2, texto: "cae a la mitad de la del fundador" },
  { clave: "d4", factor: 1 / 4, texto: "cae a la cuarta parte de la del fundador" },
  { clave: "d8", factor: 1 / 8, texto: "cae a la octava parte de la del fundador" },
];

/** Lo hundida que puede estar una población respecto de su máximo. */
const CAIDAS: [number, string][] = [[8, "la octava parte"], [4, "la cuarta parte"], [2, "la mitad"]];

/** Hasta dónde llegó ya una familia de marcas, leído de lo escrito. */
const marca = (d: Diario, prefijo: string): number =>
  d.eventos.reduce((x, e) => (e.clave.startsWith(prefijo) ? Number(e.clave.slice(prefijo.length)) : x), 0);

/** Lo que hoy sería noticia. El orden es la prioridad: sale la primera que no se haya escrito. */
function candidatos(m: Mundo, eva: Genoma, d: Diario): Aviso[] {
  const censo = d.censo;
  const av: Aviso[] = [];
  const n = m.bichos.length;
  const c = m.cuenta;
  const muertos = c.hambre + c.comidos + c.vejez;

  if (m.extinto) {
    av.push({ clave: "extincion", texto: `extinción · ${veces(c.nacidos, "nacido", "nacidos")} y ${veces(muertos, "muerto", "muertos")} en toda la partida` });
    return av;
  }
  if (n === 1) av.push({ clave: "ultimo", texto: `queda uno · ${veces(c.nacidos, "nacido", "nacidos")} y ${veces(muertos, "muerto", "muertos")} hasta hoy` });

  // De un hundimiento sale una sola línea, la más honda.
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

  // «Ya», porque la cifra es el acumulado y la línea puede llegar días tarde.
  if (c.comidos > 0) av.push({ clave: "depredacion", texto: `ya hay quien se come a otro · ${veces(c.comidos, "comido", "comidos")} hasta hoy` });
  if (c.hambre > 0) av.push({ clave: "hambre", texto: `el hambre ya mata · ${veces(c.hambre, "muerto", "muertos")} hasta hoy` });
  if (c.vejez > 0) av.push({ clave: "vejez", texto: `la vejez ya mata · ${veces(c.vejez, "muerto", "muertos")} a los ${m.cfg.vida} días` });
  if (c.nacidos > 0) av.push({ clave: "crias", texto: `ya hay crías · ${veces(c.nacidos, "nacida", "nacidas")} hasta hoy, censo ${n}` });
  if (c.fuera > 0) av.push({ clave: "intemperie", texto: `ya hay quien duerme a la intemperie · ${veces(c.fuera, "noche", "noches")} fuera hasta hoy` });

  for (const r of RASGOS) {
    const med = mediana(m.bichos.map((b) => b.g[r]));
    // La sociabilidad vive cerca del cero: la noticia es que nadie quede del lado del fundador.
    if (r === "sociabilidad") {
      const e = eva[r];
      if (e >= 0 && m.bichos.every((b) => b.g[r] < 0)) av.push({ clave: "todos-esquivan", texto: `ya nadie busca compañía · los ${n} esquivan, mediana ${num(med)}` });
      if (e <= 0 && m.bichos.every((b) => b.g[r] > 0)) av.push({ clave: "todos-buscan", texto: `ya nadie esquiva · los ${n} buscan compañía, mediana ${num(med)}` });
      continue;
    }
    for (const o of OCTAVAS) {
      const meta = eva[r] * o.factor;
      if (o.factor > 1 ? med >= meta : med <= meta) {
        av.push({ clave: `gen-${r}-${o.clave}`, texto: `la mediana de ${nombreDe(r)} ${o.texto} · ${num(med)} frente a ${num(eva[r])}` });
      }
    }
  }

  return av;
}

/** Borra desde el día `desde`: lo que el mundo ha dejado atrás deja de haber pasado. */
export function olvidar(d: Diario, desde: number) {
  while (d.eventos.length > 0 && d.eventos[d.eventos.length - 1].dia >= desde) d.eventos.pop();
  d.censo.length = Math.max(0, desde - 1);
}

/** Narra el día que acaba de cerrarse; se llama al amanecer. */
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
