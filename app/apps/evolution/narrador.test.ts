// Tests del diario — `npx tsx app/apps/evolution/narrador.test.ts`. Comprueban que contar el
// mundo no lo estropea ni pierde nada.
import { copiar, correrDia, crearMundo, CONFIG, type Mundo } from "./engine";
import { crearDiario, narrar, type Diario } from "./narrador";

let fallos = 0;
function check(nombre: string, ok: boolean, detalle = "") {
  console.log(`${ok ? "✓" : "✗"} ${nombre}${detalle ? "  " + detalle : ""}`);
  if (!ok) fallos++;
}

const SEMILLA = "raiz";
const DIAS = 120;

/** Una partida narrada en cada amanecer, como en la página. */
function partida(dias: number, semilla = SEMILLA) {
  const m = crearMundo(semilla);
  const d = crearDiario();
  for (let i = 0; i < dias && !m.extinto; i++) { correrDia(m); narrar(d, m, CONFIG.fundador); }
  return { m, d };
}

const firma = (d: Diario) => d.eventos.map((e) => `${e.dia}:${e.clave}:${e.texto}`).join("|");

// 1. Volver atrás y revivir escribe la misma crónica: el diario no guarda nada fuera del mundo.
{
  const { d: recto } = partida(DIAS);

  let m: Mundo = crearMundo(SEMILLA);
  const d = crearDiario();
  let guardado: Mundo | null = null;
  for (let i = 0; i < 30; i++) {
    correrDia(m); narrar(d, m, CONFIG.fundador);
    if (m.dia === 20) guardado = copiar(m);
  }
  m = copiar(guardado!);
  while (m.dia < DIAS && !m.extinto) { correrDia(m); narrar(d, m, CONFIG.fundador); }

  check("volver atrás y revivir reescribe la misma crónica", firma(d) === firma(recto),
    `${d.eventos.length} líneas vs ${recto.eventos.length}`);
}

// 2. Una clave es una vez, y un día es como mucho una línea.
{
  const { d } = partida(DIAS);
  const claves = new Set(d.eventos.map((e) => e.clave));
  const dias = new Set(d.eventos.map((e) => e.dia));
  check("ninguna línea se repite", claves.size === d.eventos.length,
    `${d.eventos.length} líneas, ${claves.size} claves`);
  check("como mucho una línea por día", dias.size === d.eventos.length,
    `${d.eventos.length} líneas en ${dias.size} días`);
}

// 3. Lo que pasó acaba escrito, aunque ese día ya hubiera línea.
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

// 4. Un mundo largo no se vuelve un teletipo: el diario se va callando.
{
  const { d } = partida(DIAS);
  const tarde = d.eventos.filter((e) => e.dia > DIAS / 2).length;
  check("la segunda mitad de la partida habla menos que la primera",
    tarde <= d.eventos.length - tarde, `${d.eventos.length - tarde} líneas y luego ${tarde}`);
  check("el diario cabe en una pantalla", d.eventos.length <= 24, `${d.eventos.length} líneas en ${DIAS} días`);
}

// 5. La extinción cierra el diario.
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
