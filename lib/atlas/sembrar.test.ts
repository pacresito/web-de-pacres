// Test de lógica pura: `npx tsx lib/atlas/sembrar.test.ts`. Fuera del build.
import assert from "assert";
import { esPerfil, sembrar, sorteo, SEMBRADOS } from "./sembrar";
import { huecos, montar, VIDA_ASENTADO } from "./srs";
import { PAISES } from "./paises";

const AHORA = Date.parse("2026-08-21T12:00:00Z");

assert.deepStrictEqual(sembrar("vacio", AHORA), {});
assert.ok(esPerfil("mezcla") && !esPerfil("cualquiera") && !esPerfil(null));

// Es determinista a semilla igual: la misma pega se puede volver a mirar, y por eso `?sembrar`
// no pasa ninguna.
assert.deepStrictEqual(sembrar("mezcla", AHORA), sembrar("mezcla", AHORA));
assert.deepStrictEqual(sembrar("medio", AHORA, "7"), sembrar("medio", AHORA, "7"));

// El sorteo: cincuenta de los que haya, y la semilla decide cuáles. Con menos de cincuenta países
// entran todos, así que esto solo se nota de verdad con los 195 —y hay que verlo antes—.
const muchos = Array.from({ length: 60 }, (_, i) => `p${i}`);
assert.equal(sorteo(muchos, "a").length, SEMBRADOS);
assert.deepStrictEqual(sorteo(muchos, "a"), sorteo(muchos, "a"));
assert.notDeepStrictEqual(new Set(sorteo(muchos, "a")), new Set(sorteo(muchos, "b")));
assert.deepStrictEqual(sorteo(["x", "y"], "a").sort(), ["x", "y"]);

// "dominado" da tarjetas de tres huecos, que es lo que no se puede ver esperando.
const dom = sembrar("dominado", AHORA);
assert.ok(PAISES.every((p) => huecos(dom, p.id) === 3));
assert.ok(Object.values(dom).every((e) => Object.values(e!).every((s) => s!.vida > VIDA_ASENTADO)));

// "facil" son países ya vistos con nada asentado: un hueco por tarjeta y ningún examen.
const fac = sembrar("facil", AHORA);
assert.ok(PAISES.every((p) => huecos(fac, p.id) === 1));
assert.ok(Object.values(fac).every((e) => Object.values(e!).every((s) => s!.vida <= VIDA_ASENTADO)));
// Y ya vistos: la primera vez enseña los cuatro datos y no sería más fácil, sería otra cosa.
assert.ok(PAISES.every((p) => !montar(fac, p, AHORA).primeraVez));

// Y "mezcla" reparte los tres estados, para verlos de un tirón.
const mez = sembrar("mezcla", AHORA);
const vistos = new Set(PAISES.map((p) => (montar(mez, p, AHORA).primeraVez ? 0 : huecos(mez, p.id))));
assert.ok(vistos.size >= 3, `mezcla debería dar varios estados, dio ${[...vistos]}`);

console.log("sembrar: ok");
