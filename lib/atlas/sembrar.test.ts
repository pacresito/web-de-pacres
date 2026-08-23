// Test de lógica pura: `npx tsx lib/atlas/sembrar.test.ts`. Fuera del build.
import assert from "assert";
import { esPerfil, sembrar, sorteo, SEMBRADOS } from "./sembrar";
import { huecos, montar, siguiente, VIDA_DOMINADO } from "./srs";
import { PAISES } from "./paises";
import { RECORRIDO } from "@/data/atlas/orden";

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

// Un mazo sembrado son cincuenta países de los que haya, no todos: el resto sigue sin ver.
const dom = sembrar("dominado", AHORA);
assert.equal(Object.keys(dom).length, Math.min(SEMBRADOS, PAISES.length));

// "dominado" da tarjetas de tres huecos, que es lo que no se puede ver esperando.
assert.ok(Object.keys(dom).every((id) => huecos(dom, id) === 3));
assert.ok(Object.values(dom).every((e) => Object.values(e!).every((s) => s!.vida > VIDA_DOMINADO)));

// "facil" son países ya vistos con nada dominado: un hueco por tarjeta y ningún examen.
const fac = sembrar("facil", AHORA);
assert.ok(Object.keys(fac).every((id) => huecos(fac, id) === 1));
assert.ok(Object.values(fac).every((e) => Object.values(e!).every((s) => s!.vida <= VIDA_DOMINADO)));
// Y ya vistos: la primera vez enseña los cuatro datos y no sería más fácil, sería otra cosa.
assert.ok(PAISES.filter((p) => fac[p.id]).every((p) => !montar(fac, p, AHORA).primeraVez));

// Y "mezcla" reparte los tres estados, para verlos de un tirón.
const mez = sembrar("mezcla", AHORA);
const vistos = new Set(PAISES.map((p) => (montar(mez, p, AHORA).primeraVez ? 0 : huecos(mez, p.id))));
assert.ok(vistos.size >= 3, `mezcla debería dar varios estados, dio ${[...vistos]}`);

// Y un mazo sembrado tiene trabajo desde la primera tarjeta: con todo a medio camino de su vida
// no habría nada vencido y la cola se pondría a presentar países nuevos, que es exactamente lo
// que el mazo de salida existe para saltarse.
for (const perfil of ["facil", "medio", "dominado", "mezcla"] as const) {
  const mazo = sembrar(perfil, AHORA);
  const sale = siguiente(mazo, RECORRIDO, AHORA)!;
  assert.ok(mazo[sale.id], `${perfil}: la primera tarjeta sale del mazo, no de los países sin ver`);
}

console.log("sembrar: ok");
