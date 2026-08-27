// npx tsx lib/keys.test.ts
//
// Las cadenas de este test están escritas a mano a propósito: son los nombres que hay ahora
// mismo en Redis, y comprobarlos contra `clave()` sería comprobar la función consigo misma.
// Si uno deja de coincidir, sus datos siguen ahí y ya no los lee nadie.
import assert from "node:assert";
import { clave, prefijo } from "./keys";

assert.equal(clave("atlas:mazo", false), "atlas:mazo");
assert.equal(clave("atlas:mazo", true), "atlas:mazo-dev");
assert.equal(clave("guestbook", true), "guestbook-dev");
assert.equal(clave("farma:metricas:2026-08-28", true), "farma:metricas:2026-08-28-dev");

// La marca va dentro, antes de los dos puntos: la IP se pega detrás.
assert.equal(prefijo("arbol:login", false), "arbol:login:");
assert.equal(prefijo("arbol:login", true), "arbol:login-dev:");

// El default sale de NODE_ENV, y **lo que no es "development" es producción**: un script suelto
// no lo pone y escribiría en los datos de verdad creyendo que está en local.
// `NODE_ENV` lo tipa Next como solo lectura, y aquí hay que moverlo para leer el default.
const env = process.env as Record<string, string | undefined>;
const previo = env.NODE_ENV;
env.NODE_ENV = "development";
assert.equal(clave("arbol:datos"), "arbol:datos-dev");
env.NODE_ENV = "production";
assert.equal(clave("arbol:datos"), "arbol:datos");
delete env.NODE_ENV;
assert.equal(clave("arbol:datos"), "arbol:datos", "sin NODE_ENV, producción");
env.NODE_ENV = previo;

console.log("keys.test.ts ok");
