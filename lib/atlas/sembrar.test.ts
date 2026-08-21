// Test de lógica pura: `npx tsx lib/atlas/sembrar.test.ts`. Fuera del build.
import assert from "assert";
import { esPerfil, sembrar } from "./sembrar";
import { huecos, montar, VIDA_ASENTADO } from "./srs";
import { PAISES } from "./paises";

const AHORA = Date.parse("2026-08-21T12:00:00Z");

assert.deepStrictEqual(sembrar("vacio", AHORA), {});
assert.ok(esPerfil("mezcla") && !esPerfil("cualquiera") && !esPerfil(null));

// Es determinista: la misma pega se puede volver a mirar.
assert.deepStrictEqual(sembrar("mezcla", AHORA), sembrar("mezcla", AHORA));

// "dominado" da tarjetas de tres huecos, que es lo que no se puede ver esperando.
const dom = sembrar("dominado", AHORA);
assert.ok(PAISES.every((p) => huecos(dom, p.id) === 3));
assert.ok(Object.values(dom).every((e) => Object.values(e!).every((s) => s!.vida > VIDA_ASENTADO)));

// Y "mezcla" reparte los tres estados, para verlos de un tirón.
const mez = sembrar("mezcla", AHORA);
const vistos = new Set(PAISES.map((p) => (montar(mez, p, AHORA).primeraVez ? 0 : huecos(mez, p.id))));
assert.ok(vistos.size >= 3, `mezcla debería dar varios estados, dio ${[...vistos]}`);

console.log("sembrar: ok");
