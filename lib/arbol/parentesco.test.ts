// Test de lógica pura: `npx tsx lib/arbol/parentesco.test.ts`. Fuera del build.
// Lee seed/arbol.json (gitignoreado, datos privados): sin él no hay nada que verificar.
import assert from "assert";
import { readFileSync } from "fs";
import { resolve } from "path";
import { construirGrafo } from "./grafo";
import { declinar, parentescos, relacionesDesde, terminoDe, PAREJAS, SIN_PALABRA, SIN_PARENTESCO } from "./parentesco";
import type { ArbolData } from "./tree";

// --- La regla: el ancestro común más cercano nombra el parentesco ---
// k = a qué altura queda de ti; j = a qué altura de él.
assert.strictEqual(terminoDe(1, 0), "padres");
assert.strictEqual(terminoDe(3, 0), "bisabuelos");
assert.strictEqual(terminoDe(0, 1), "hijos");
assert.strictEqual(terminoDe(0, 3), "bisnietos");
assert.strictEqual(terminoDe(1, 1), "hermanos");
assert.strictEqual(terminoDe(2, 2), "primos");
assert.strictEqual(terminoDe(3, 3), "primos segundos");
assert.strictEqual(terminoDe(2, 1), "tíos");
assert.strictEqual(terminoDe(3, 2), "tíos segundos");
assert.strictEqual(terminoDe(3, 1), "tíos abuelos", "dos grados de distancia lo suben a abuelo");
assert.strictEqual(terminoDe(1, 2), "sobrinos");
assert.strictEqual(terminoDe(1, 3), "sobrinos nietos");
// El caso que discute cualquier familia, resuelto como lo dice esta: el hijo de un primo
// hermano (k2, j2) queda a k2, j3.
assert.strictEqual(terminoDe(2, 3), "sobrinos segundos");

// El tope: los ordinales llegan al segundo, los primos al tercero, y luego el cajón se
// queda con el término base.
assert.strictEqual(terminoDe(4, 4), "primos terceros");
assert.strictEqual(terminoDe(5, 5), "otros primos");
assert.strictEqual(terminoDe(4, 3), "otros tíos");
assert.strictEqual(terminoDe(3, 4), "otros sobrinos");

// --- Declinar: singular si es uno, femenino solo si todas lo son ---
assert.strictEqual(declinar("primos", 15, 4), "primos", "un grupo mixto va en masculino");
assert.strictEqual(declinar("primos", 3, 3), "primas");
assert.strictEqual(declinar("primos", 1, 1), "prima");
assert.strictEqual(declinar("primos", 1, 0), "primo");
assert.strictEqual(declinar("tíos abuelos", 9, 9), "tías abuelas", "se declina palabra a palabra");
assert.strictEqual(declinar("otros sobrinos", 1, 1), "otra sobrina");
assert.strictEqual(declinar("padres", 2, 1), "padres");
assert.strictEqual(declinar("padres", 1, 1), "madre", "el irregular de la casa");
assert.strictEqual(declinar("padres", 2, 2), "madres");
assert.strictEqual(declinar(PAREJAS, 49, 20), "parejas");
assert.strictEqual(declinar(PAREJAS, 1, 1), "pareja");
assert.strictEqual(declinar(SIN_PARENTESCO, 12, 12), "sin parentesco", "la falta de parentesco no se declina");

// --- Sobre los datos de verdad ---
const data: ArbolData = JSON.parse(readFileSync(resolve("seed/arbol.json"), "utf-8"));
const g = construirGrafo(data);

// Todo el mundo tiene cajón, mire quien mire, y la fila es la generación relativa.
for (const pov of ["p25", "p26", "p1", "p131"]) {
  const suyos = parentescos(g, pov);
  assert.strictEqual(suyos.size, data.people.length, `${pov}: alguien se queda sin cajón`);
  const genPov = g.generacion.get(pov)!;
  for (const [id, { nivel }] of suyos) {
    assert.strictEqual(nivel, genPov - g.generacion.get(id)!, `${pov}: ${id} en la fila equivocada`);
  }
}

// El punto de vista no es un caso especial: se cuenta entre sus hermanos y su pareja cae
// en el cajón de parejas de su fila.
const desdePablo = parentescos(g, "p25");
assert.deepStrictEqual(desdePablo.get("p25"), { nivel: 0, termino: "hermanos", orden: 1 });
assert.strictEqual(desdePablo.get("p126")!.termino, "hermanos", "y su hermano, en el mismo cajón que él");
assert.strictEqual(desdePablo.get("p24")!.termino, PAREJAS, "su mujer va al cajón de parejas");
assert.strictEqual(desdePablo.get("p124")!.termino, "padres");
assert.strictEqual(desdePablo.get("p26")!.termino, "hijos");

// El reparto entero desde Pablo, que es la vista de arranque del panel.
const reparto = (pov: string, quienes: Iterable<string>) => {
  const suyos = parentescos(g, pov);
  const cuenta = new Map<string, number>();
  for (const id of quienes) {
    const { nivel, termino } = suyos.get(id)!;
    cuenta.set(`${nivel} ${termino}`, (cuenta.get(`${nivel} ${termino}`) ?? 0) + 1);
  }
  return cuenta;
};
assert.deepStrictEqual(
  [...reparto("p25", g.personaPorId.keys())].sort(),
  [
    ["-1 hijos", 3],
    ["-1 otros sobrinos", 66],
    ["-1 parejas", 1],
    ["-1 sin parentesco", 6],
    ["-1 sobrinos segundos", 16],
    ["-1 sobrinos", 5],
    ["0 hermanos", 3],
    ["0 parejas", 49],
    ["0 primos segundos", 69],
    ["0 primos", 15],
    ["0 sin parentesco", 26],
    ["1 padres", 2],
    ["1 parejas", 41],
    ["1 sin parentesco", 26],
    ["1 tíos segundos", 36],
    ["1 tíos", 8],
    ["2 abuelos", 4],
    ["2 parejas", 9],
    ["2 sin parentesco", 12],
    ["2 tíos abuelos", 9],
    ["3 bisabuelos", 6],
    ["3 sin parentesco", 4],
  ].sort(),
  "el reparto de las 416 desde Pablo",
);

// Y desde su hijo, una generación más abajo, el vocabulario se estira hasta el tope.
const desdeElHijo = new Set([...parentescos(g, "p26").values()].map((p) => p.termino));
for (const termino of ["tatarabuelos", "tíos bisabuelos", "tíos abuelos segundos", "otros tíos", "primos terceros"]) {
  assert.ok(desdeElHijo.has(termino), `desde p26 tendría que salir «${termino}»`);
}

// --- Nombrar a uno solo: lo que lee la ficha, que no es lo mismo que repartir cajones ---
const relaciones = relacionesDesde(g, "p25");
assert.strictEqual(relaciones.size, data.people.length, "alguien se queda sin relación que leer");
assert.strictEqual(relaciones.get("p25")!.frase, "Es tu Centro");
assert.strictEqual(relaciones.get("p24")!.frase, "Es tu pareja", "la suya no es «la pareja de tu hermano»");
assert.strictEqual(relaciones.get("p124")!.frase, "Es tu padre");
assert.strictEqual(relaciones.get("p26")!.frase, "Es tu hijo");
assert.deepStrictEqual(
  [relaciones.get("p124")!.pasos, relaciones.get("p126")!.pasos, relaciones.get("p24")!.pasos],
  [1, 1, 1],
  "un padre, un hermano y una pareja están a un paso",
);

// De quien entró casándose se dice de quién es pareja: son 100 de las 416 desde Pablo, y
// dejarlos en «no hay palabra» sería no saber nombrar a un tío político.
const parejas = [...parentescos(g, "p25")].filter(([, p]) => p.termino === PAREJAS).map(([id]) => id);
const nombradas = parejas.filter((id) => relaciones.get(id)!.frase.startsWith("Es la pareja de tu "));
assert.ok(nombradas.length >= parejas.length * 0.9, `solo ${nombradas.length} de ${parejas.length} parejas se saben nombrar`);
assert.strictEqual(
  relaciones.get([...parentescos(g, "p25")].find(([, p]) => p.termino === SIN_PARENTESCO)![0])!.frase,
  SIN_PALABRA,
  "y a quien no ata nada con la familia se le da la distancia, que es lo único cierto",
);

console.log("parentesco.test.ts OK");
