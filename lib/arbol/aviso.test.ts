// Test de lógica pura: `npx tsx lib/arbol/aviso.test.ts`. Fuera del build.
// Lee seed/arbol.json (gitignoreado, datos privados): sin él no hay nada que verificar.
import assert from "assert";
import { readFileSync } from "fs";
import { resolve } from "path";
import { aLasDiez, avisoDeVispera, FIESTAS, HORA, TARTAS } from "./aviso";
import { construirGrafo } from "./grafo";
import type { ArbolData } from "./tree";

// La hora de salida
// Las diez de la noche de Madrid, que en verano son las 20:00Z y en invierno las 21:00Z.
assert.strictEqual(new Date(aLasDiez("2026-08-14")).toISOString(), "2026-08-14T20:00:00.000Z");
assert.strictEqual(new Date(aLasDiez("2026-12-14")).toISOString(), "2026-12-14T21:00:00.000Z");
// Y las dos noches en que cambia la hora, que es donde una sola pasada se equivoca.
assert.strictEqual(new Date(aLasDiez("2026-03-29")).toISOString(), "2026-03-29T20:00:00.000Z");
assert.strictEqual(new Date(aLasDiez("2026-10-25")).toISOString(), "2026-10-25T21:00:00.000Z");
// Siempre por delante del cron que lo programa, que corre por la mañana.
assert.ok(aLasDiez("2026-08-14") > Date.parse("2026-08-14T12:00:00Z"), `las ${HORA} no pueden caer antes de mediodía`);

// Qué dice
const data: ArbolData = JSON.parse(readFileSync(resolve("seed/arbol.json"), "utf-8"));
const g = construirGrafo(data);
const laNoche = (hoy: string) => avisoDeVispera(g, hoy);
const dias = (desde: string, cuantos: number) =>
  Array.from({ length: cuantos }, (_, i) => new Date(Date.parse(desde) + i * 86_400_000).toISOString().slice(0, 10));

// La noche en que no celebra nadie no se avisa de nada: el aviso que llega vacío enseña a no
// mirarlos.
assert.strictEqual(laNoche("2026-08-25"), null);

// La víspera de mi cumpleaños se me habla a mí, y no se me lee mi propia ficha.
const mio = laNoche("2026-02-28")!;
assert.strictEqual(mio.id, "arbol-2026-03-01", "el id es el día que se anuncia, para no avisar dos veces de lo mismo");
assert.strictEqual(new Date(mio.sale).toISOString(), "2026-02-28T21:00:00.000Z");
assert.ok(mio.texto.startsWith("<b>Mañana</b>"), mio.texto);
assert.ok(/Mañana son 40|Mañana cumples 40|^40 mañana/m.test(mio.texto), mio.texto);
assert.ok(!mio.texto.includes("<b>Pablo</b>"), "a mí no se me nombra en tercera persona");
assert.ok(!mio.texto.includes("pacr.es"), "ni fecha ni enlace: el mensaje es de mañana y ya está");

// El 19 de marzo, que es el día que más junta: mi día del padre delante de las onomásticas, y
// cada una diciendo quién es y de qué la conozco.
const marzo = laNoche("2026-03-18")!;
const lineas = marzo.texto.split("\n").filter((l) => l.startsWith("🎂") || l.startsWith("🎉"));
assert.strictEqual(lineas[0], "🎉 Mañana es el día del padre, y va por ti. Ve dejando pistas.");
assert.ok(/^\S+ <b>Pepe<\/b>, tu tío — /m.test(marzo.texto), marzo.texto);
// El santo llega hasta la casa de Carmen —su padre sí— y no más allá: su tío, no.
assert.ok(/^\S+ <b>José Alberto<\/b>, el padre de Carmen — /m.test(marzo.texto), marzo.texto);
assert.ok(!marzo.texto.includes("tío de Carmen"), "de sus tíos, el cumpleaños y nada más");

// El día de la madre no va por mí aunque sea padre: va por Carmen, y por la mía mientras viva.
const mayo = laNoche("2026-05-02")!;
assert.ok(mayo.texto.includes("🎉 Mañana es el día de la madre. Va por Carmen, y tu madre espera su llamada."), mayo.texto);

// El santo pide año de nacimiento. La víspera de San Miguel se felicita al primo, que nació
// en 1961, y no al bisabuelo, del que solo consta el nombre: sin fecha, la regla de los 99
// años no tiene de qué contar y lo habría felicitado un siglo después de enterrarlo.
const sanMiguel = laNoche("2026-09-28")!;
assert.strictEqual(g.personaPorId.get("p211")!.birth, undefined, "p211 era el Miguel sin fecha");
assert.ok(sanMiguel.texto.includes("<b>Miguel</b>, tu primo"), sanMiguel.texto);
assert.ok(!sanMiguel.texto.includes("tu bisabuelo"), `al bisabuelo sin fecha se le sigue felicitando:\n${sanMiguel.texto}`);

// Los dos días caen una vez al año y una sola, y ninguno se pierde.
const delAño = dias("2026-01-01", 365).map(laNoche);
for (const dia of ["día del padre", "día de la madre"]) {
  const veces = delAño.filter((a) => a?.texto.includes(dia)).length;
    assert.strictEqual(veces, 1, `el ${dia} sale ${veces} veces al año`);
}

// Un cumpleaños ajeno dice quién es y los que cumple, y nunca cae en la línea de otro.
const conCumple = delAño.find((a) => /^\S+ [^\n]*<b>Mar<\/b>/m.test(a?.texto ?? ""))!;
assert.ok(/<b>Mar<\/b>, la pareja de Ricardo[.,] /.test(conCumple.texto), conCumple.texto);
assert.ok(/\b45\b/.test(conCumple.texto.split("\n").find((l) => l.includes("<b>Mar</b>"))!), conCumple.texto);

// Todo el año: cada línea con su emoji, nadie sin decir quién es y nada a medio redactar.
for (const aviso of delAño) {
  if (!aviso) continue;
  for (const linea of aviso.texto.split("\n").slice(2)) {
    assert.ok(new RegExp(`^(${[...TARTAS, ...FIESTAS].join("|")}) \\S`, "u").test(linea), `línea sin emoji o vacía: «${linea}»`);
    assert.ok(!/undefined|null|NaN/.test(linea), `línea a medio redactar: «${linea}»`);
    // Quien no soy yo va nombrado en negrita y con lo que me es detrás.
    assert.ok(!linea.includes("<b>") || /<\/b>, \S/.test(linea), `línea sin decir quién es: «${linea}»`);
  }
}

// Cuántas noches del año suena esto: si un día se dispara, es que una regla de la lista se ha
// abierto de más y el aviso ha dejado de ser una noticia.
const noches = delAño.filter(Boolean).length;
assert.ok(noches > 40 && noches < 150, `${noches} noches con aviso al año`);

// El nombre que trajera marcado se escapa: el mensaje va en HTML y los nombres vienen de los
// documentos de la familia, no de aquí.
const trucado = structuredClone(data);
// Por el apodo, que es con el que el aviso nombra a quien lo tiene: es lo que se escapa.
trucado.people.find((p) => p.id === "p125")!.apodos = ["<b>Lola</b> & Co"];
const conMarcado = avisoDeVispera(construirGrafo(trucado), "2026-08-15")!;
assert.ok(conMarcado.texto.includes("&lt;b&gt;Lola&lt;/b&gt; &amp; Co"), conMarcado.texto);

console.log("aviso: ok");
