// Los tests del diario — `npx tsx app/apps/evolution/narrador.test.ts`.
// No es parte del build; corre sin navegador y en segundos.
//
// Como los del reparto, **no comprueban el mundo sino que contarlo no lo estropea ni se pierde
// nada**: que volver atrás reescribe la misma crónica, que ninguna línea se repite, que lo que
// ocurrió acaba escrito aunque ese día ya hubiera línea, y que un mundo largo no se convierte en
// un teletipo.
import { copiar, correrDia, crearMundo, evaDe, azarCon, CONFIG, type Mundo } from "./engine";
import { crearDiario, narrar, type Diario } from "./narrador";

let fallos = 0;
function check(nombre: string, ok: boolean, detalle = "") {
  console.log(`${ok ? "✓" : "✗"} ${nombre}${detalle ? "  " + detalle : ""}`);
  if (!ok) fallos++;
}

const SEMILLA = "hola";
const DIAS = 120;

const eva = (s: string) => evaDe(azarCon(s), CONFIG);

/** Corre una partida narrando cada amanecer, que es donde la página llama. */
function partida(dias: number, semilla = SEMILLA) {
  const m = crearMundo(semilla);
  const d = crearDiario();
  for (let i = 0; i < dias && !m.extinto; i++) { correrDia(m); narrar(d, m, eva(semilla)); }
  return { m, d };
}

const firma = (d: Diario) => d.eventos.map((e) => `${e.dia}:${e.clave}:${e.texto}`).join("|");

// 1. Volver atrás y revivir escribe la misma crónica. El diario no guarda «lo que ya vi» aparte
//    del mundo —las condiciones son acumulados que viven en él y se restauran con él—, así que
//    esto es lo que dice que esa decisión se sostiene. Si se colara un contador propio, aquí se
//    vería: el mundo volvería al día 20 y el narrador no.
{
  const { d: recto } = partida(DIAS);

  let m: Mundo = crearMundo(SEMILLA);
  const d = crearDiario();
  let guardado: Mundo | null = null;
  for (let i = 0; i < 30; i++) {
    correrDia(m); narrar(d, m, eva(SEMILLA));
    if (m.dia === 20) guardado = copiar(m);
  }
  m = copiar(guardado!);
  while (m.dia < DIAS && !m.extinto) { correrDia(m); narrar(d, m, eva(SEMILLA)); }

  check("volver atrás y revivir reescribe la misma crónica", firma(d) === firma(recto),
    `${d.eventos.length} líneas vs ${recto.eventos.length}`);
}

// 2. Una clave es una vez, y un día es como mucho una línea. Las dos juntas son la promesa del
//    diario: sin la primera se repetiría, sin la segunda sería el teletipo que se descartó.
{
  const { d } = partida(DIAS);
  const claves = new Set(d.eventos.map((e) => e.clave));
  const dias = new Set(d.eventos.map((e) => e.dia));
  check("ninguna línea se repite", claves.size === d.eventos.length,
    `${d.eventos.length} líneas, ${claves.size} claves`);
  check("como mucho una línea por día", dias.size === d.eventos.length,
    `${d.eventos.length} líneas en ${dias.size} días`);
}

// 3. Lo que pasó acaba escrito. Un día puede traer tres noticias y solo escribirse una, así que
//    la condición tiene que seguir cumpliéndose mañana y no evaporarse: lo que se mira aquí son
//    las cinco cuentas del motor, que son las únicas comprobables desde fuera.
{
  const { m, d } = partida(DIAS);
  const claves = new Set(d.eventos.map((e) => e.clave));
  const debidos: [number, string][] = [
    [m.cuenta.comidos, "depredacion"], [m.cuenta.hambre, "hambre"], [m.cuenta.vejez, "vejez"],
    [m.cuenta.nacidos, "crias"], [m.cuenta.fuera, "intemperie"],
  ];
  const falta = debidos.filter(([n, k]) => n > 0 && !claves.has(k)).map(([, k]) => k);
  check("la cola se drena: lo que ocurrió está escrito", falta.length === 0, falta.join(", "));
}

// 4. Un mundo largo no se vuelve un teletipo. El diario habla al principio y se va callando: si
//    creciera con los días, es que se ha colado un evento que se dispara con la costumbre.
{
  const { d } = partida(DIAS);
  const tarde = d.eventos.filter((e) => e.dia > DIAS / 2).length;
  check("la segunda mitad de la partida habla menos que la primera",
    tarde <= d.eventos.length - tarde, `${d.eventos.length - tarde} líneas y luego ${tarde}`);
  check("el diario cabe en una pantalla", d.eventos.length <= 24, `${d.eventos.length} líneas en ${DIAS} días`);
}

// 5. La extinción cierra el diario: de un mundo vacío no hay más que contar, y las medianas de
//    una población que no existe no son noticia sino un NaN.
{
  let semilla = "", dias = 0;
  for (const s of ["frio", "yermo", "sal", "duna", "hielo", "cardo", "sequia", "roca"]) {
    const m = crearMundo(s);
    for (let i = 0; i < 400 && !m.extinto; i++) correrDia(m);
    if (m.extinto) { semilla = s; dias = m.dia; break; }
  }
  if (!semilla) check("hay una semilla que se extingue para probarlo", false, "ninguna en 400 días");
  else {
    const { d } = partida(dias + 5, semilla);
    const ultima = d.eventos[d.eventos.length - 1];
    check(`«${semilla}» se extingue y la última línea lo dice`, ultima?.clave === "extincion",
      `día ${dias}, última: ${ultima?.clave ?? "ninguna"}`);
  }
}

console.log(fallos === 0 ? "\nTodo en orden." : `\n${fallos} fallo(s).`);
process.exit(fallos ? 1 : 0);
