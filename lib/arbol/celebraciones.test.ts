// Test de lógica pura: `npx tsx lib/arbol/celebraciones.test.ts`. Fuera del build.
// Lee seed/arbol.json (gitignoreado, datos privados): sin él no hay nada que verificar.
import assert from "assert";
import { readFileSync } from "fs";
import { resolve } from "path";
import {
  anuncio,
  esFelicitacion,
  esTuDia,
  felicitacion,
  loQueViene,
  proximasCelebraciones,
  VENTANA,
  type Celebracion,
  type Dirigida,
} from "./celebraciones";
import { construirGrafo } from "./grafo";
import { onomasticaDePersona } from "./santoral";
import type { ArbolData } from "./tree";

// Sobre los datos de verdad
const data: ArbolData = JSON.parse(readFileSync(resolve("seed/arbol.json"), "utf-8"));
const g = construirGrafo(data);
const persona = (id: string) => g.personaPorId.get(id)!;

// Un día cualquiera desde Pablo: nadie muerto, nadie lejano y nada fuera de la ventana.
for (const hoy of ["2026-01-01", "2026-03-01", "2026-08-06", "2026-12-20"]) {
  for (const pov of ["p25", "p26", "p124"]) {
    for (const c of proximasCelebraciones(g, pov, hoy)) {
      assert.ok(c.faltan >= 0 && c.faltan <= VENTANA, `${c.tipo}: ${c.faltan} días fuera de la ventana`);
      // Los dos días que son de todos van sin persona, y son los únicos.
      const deNadie = c.tipo === "día del padre" || c.tipo === "día de la madre";
      assert.strictEqual(c.id === null, deNadie, `${c.tipo}: quién es no cuadra con qué es`);
      assert.strictEqual(c.nombre === null, deNadie);
      assert.strictEqual(c.dirigida !== undefined, deNadie, `${c.tipo}: solo los días de todos se dirigen`);
      if (deNadie) continue;

      assert.ok(!persona(c.id!).death, `${c.nombre} está muerto y sigue celebrando`);
      assert.strictEqual(c.esPuntoDeVista, c.id === pov);
      if (c.tipo === "cumpleaños") assert.ok(c.edad !== null && c.edad >= 0, `${c.nombre}: edad imposible`);
      else assert.strictEqual(c.edad, null, `${c.nombre}: solo el cumpleaños cuenta años`);
      if (c.tipo === "onomástica") {
        const santo = onomasticaDePersona(persona(c.id!))!;
        const año = Number(c.fecha.slice(0, 4));
        assert.strictEqual(typeof santo === "function" ? santo(año) : santo, c.fecha.slice(5), `${c.nombre}: la onomástica no cae donde dice la tabla`);
      }
    }
  }
}

// Ordenadas por fecha; y en el mismo día, el cumpleaños antes que la onomástica.
const orden = proximasCelebraciones(g, "p25", "2026-03-01", 366);
for (let i = 1; i < orden.length; i++) {
  const [previa, actual] = [orden[i - 1], orden[i]];
  assert.ok(
    previa.faltan < actual.faltan || (previa.faltan === actual.faltan && previa.tipo <= actual.tipo),
    `${previa.nombre} (${previa.faltan}) antes que ${actual.nombre} (${actual.faltan})`,
  );
}

// El 1 de marzo Pablo cumple 40, y sale él mismo marcado como punto de vista.
const suCumple = orden.find((c) => c.esPuntoDeVista && c.tipo === "cumpleaños")!;
assert.deepStrictEqual(
  { faltan: suCumple.faltan, edad: suCumple.edad, parentesco: suCumple.parentesco },
  { faltan: 0, edad: 40, parentesco: null },
  "el punto de vista no se llama a sí mismo hermano de nadie",
);

// La familia cercana, con nombre: la sangre de primer grado y las parejas de todos ellos.
const nombrados = new Map(proximasCelebraciones(g, "p25", "2026-03-01", 366).map((c) => [c.id, c.parentesco]));
assert.strictEqual(nombrados.get("p125"), "madre", "el parentesco va declinado, en singular y en femenino");
assert.strictEqual(nombrados.get("p26"), "hijo");
assert.strictEqual(nombrados.has("p124"), false, "su padre murió en 2018 y no celebra nada");
assert.strictEqual(nombrados.get("p24"), "tu pareja", "su mujer entra por él, y se la llama por lo que es");
assert.ok([...nombrados.values()].some((p) => p?.startsWith("pareja de ")), "los cuñados entran por su pareja");
// Y nadie de segundo grado: los primos segundos y los tíos abuelos se quedan fuera.
for (const [, parentesco] of nombrados) {
  assert.ok(
    parentesco === null || parentesco.startsWith("pareja") || !/(segund|abuel[oa]s|nieto)/.test(parentesco.replace(/^bisabuel/, "")),
    `${parentesco} no es familia cercana`,
  );
}

// Cambiar de punto de vista cambia el panel entero: es de quien mira, no del árbol.
const desdeSuHijo = proximasCelebraciones(g, "p26", "2026-03-01", 366);
assert.notDeepStrictEqual(
  desdeSuHijo.map((c) => c.id),
  orden.map((c) => c.id),
);
assert.strictEqual(desdeSuHijo.find((c) => c.id === "p25")!.parentesco, "padre");

// Los dos días que son de todos: una fila, sin nombres, y siempre
// El del padre no se mueve (San José) y el de la madre sí. Salen una vez y una sola, mire
// quien mire y tenga o no a quien felicitar.
for (const [pov, hoy, fecha, tipo] of [
  ["p25", "2026-03-15", "2026-03-19", "día del padre"],
  ["p25", "2026-04-20", "2026-05-03", "día de la madre"],
  ["p380", "2026-04-20", "2026-05-03", "día de la madre"], // muerta en 2003, y su día sigue saliendo
] as const) {
  const suyas = proximasCelebraciones(g, pov, hoy).filter((c) => c.tipo === tipo);
  assert.strictEqual(suyas.length, 1, `${pov}: ${tipo} sale ${suyas.length} veces`);
  assert.deepStrictEqual(
    { fecha: suyas[0].fecha, id: suyas[0].id, nombre: suyas[0].nombre },
    { fecha, id: null, nombre: null },
    `${pov}: ${tipo} no debería nombrar a nadie`,
  );
}

// A quién apunta: Pablo tiene hijos, así que los dos días van por él.
const dirigidaDe = (pov: string, hoy: string, tipo: string) =>
  proximasCelebraciones(g, pov, hoy).find((c) => c.tipo === tipo)!.dirigida;
assert.strictEqual(dirigidaDe("p25", "2026-03-15", "día del padre"), "propio");
assert.strictEqual(dirigidaDe("p25", "2026-04-20", "día de la madre"), "propio");
// Lucas no tiene hijos, y sus dos padres viven: los dos días apuntan hacia arriba.
assert.strictEqual(dirigidaDe("p26", "2026-03-15", "día del padre"), "progenitor");
assert.strictEqual(dirigidaDe("p26", "2026-04-20", "día de la madre"), "progenitor");
// Uno de cada: a los hijos de Rafa, que murió en 2016, les vive la madre y no el padre.
assert.strictEqual(dirigidaDe("p56", "2026-04-20", "día de la madre"), "progenitor");
assert.strictEqual(dirigidaDe("p56", "2026-03-15", "día del padre"), "generico");
// Y a quien no le queda ni descendencia ni progenitores, el día le llega sin dueño.
for (const tipo of ["día del padre", "día de la madre"] as const) {
  assert.strictEqual(dirigidaDe("p16", tipo === "día del padre" ? "2026-03-15" : "2026-04-20", tipo), "generico");
}

// La felicitación: siempre dice algo, y lo mismo en el servidor que en el navegador
const suya = (tipo: Celebracion["tipo"], edad: number | null, faltan: number, dirigida?: Dirigida) =>
  ({ tipo, edad, faltan, dirigida, id: "p25", nombre: "Pablo", fecha: "2026-03-01", parentesco: null, esPuntoDeVista: true }) as Celebracion;

for (let edad = 0; edad < 120; edad++) {
  const hoy = suya("cumpleaños", edad, 0);
  assert.ok(felicitacion(hoy).includes(String(edad)), `a los ${edad} no se le felicita la edad`);
  assert.strictEqual(felicitacion(hoy), felicitacion(hoy), "la frase no puede ser al azar");
}
assert.ok(felicitacion(suya("cumpleaños", 40, 1)).includes("Mañana"));
assert.ok(felicitacion(suya("cumpleaños", 40, 12)).includes("12 días"));
for (const faltan of [0, 1, 12]) assert.ok(felicitacion(suya("onomástica", null, faltan)).length > 10);

// Los dos días hablan de otra cosa según a quién apunten, y nunca se quedan mudos.
for (const tipo of ["día del padre", "día de la madre"] as const) {
  for (const faltan of [0, 1, 12]) {
    const dichas = (["propio", "progenitor", "generico"] as const).map((d) => felicitacion(suya(tipo, null, faltan, d)));
    assert.strictEqual(new Set(dichas).size, 3, `${tipo} a ${faltan} días repite frase`);
    for (const dicha of dichas) assert.ok(dicha.length > 10, `${tipo} se queda muda`);
  }
  // Al que ya no tiene ni hijos ni ese progenitor no se le hacen bromas ni se le tutea el día.
  const generica = felicitacion(suya(tipo, null, 0, "generico"));
  assert.ok(!/ti\b|tuy|tu (padre|madre)/.test(generica), `la genérica de ${tipo} se dirige a alguien: ${generica}`);
}
// Lo que se lee detrás de la fecha: cuántos caen ese día, y sin repetir el «hoy» de la línea.
const enDias = (...faltan: number[]) => faltan.map((f) => suya("cumpleaños", 40, f));
assert.strictEqual(loQueViene(enDias(0)), "¡hay un evento!", "el «hoy» ya lo dice la línea entera");
assert.strictEqual(loQueViene(enDias(0, 0, 1)), "¡hay 2 eventos!", "los de mañana no se suman a los de hoy");
assert.strictEqual(loQueViene(enDias(1)), "¡hay un evento mañana!", "y mañana sí se nombra, que no está dicho antes");
assert.strictEqual(loQueViene(enDias(1, 1)), "¡hay 2 eventos mañana!");
assert.strictEqual(loQueViene(enDias(27, 30)), "siguiente evento en 27 días");

assert.strictEqual(anuncio(suya("cumpleaños", 40, 0)), "🎂 Es tu cumpleaños");
assert.strictEqual(anuncio(suya("día de la madre", null, 0)), "🎉 Es el día de la madre");

// Solo se anuncia en el botón lo que es de quien mira: su cumpleaños, su santo y el día
// que le toca por ser padre. El de la madre de otra no llena el botón de nadie.
assert.ok(esTuDia(suya("cumpleaños", 40, 0)));
assert.ok(esTuDia(suya("día del padre", null, 0, "propio")));
for (const dirigida of ["progenitor", "generico"] as const) {
  const ajena = { ...suya("día del padre", null, 0, dirigida), esPuntoDeVista: false, id: null, nombre: null } as Celebracion;
  assert.ok(!esTuDia(ajena), `${dirigida} no es tu día`);
  assert.ok(esFelicitacion(ajena), "pero se lee como felicitación, no como fila de agenda");
}

console.log("celebraciones: ok");
