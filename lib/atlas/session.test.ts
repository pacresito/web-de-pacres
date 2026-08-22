// npx tsx lib/atlas/session.test.ts
import assert from "node:assert";
import { signSession, verifySession } from "./session";

// El secreto se lee al firmar, no al importar: por eso basta con ponerlo aquí.
process.env.ATLAS_SESSION_SECRET = "secreto-de-prueba";

const { valor } = signSession();
assert.ok(verifySession(valor), "la recién firmada vale");
assert.ok(!verifySession(undefined) && !verifySession("") && !verifySession("ok.1.2"), "la basura no");

// Firma buena pero caducada: la fecha va dentro de lo firmado, así que no se puede estirar.
const vieja = signSession(new Date(Date.now() - 400 * 86_400_000));
assert.ok(!verifySession(vieja.valor), "la caducada no vale");

// Y ponerle a una firma buena una fecha nueva la invalida.
const [tag, , sig] = valor.split(".");
assert.ok(!verifySession(`${tag}.${Math.floor(Date.now() / 1000) + 99999}.${sig}`), "no se puede estirar");

// Sin secreto no hay sesión, y sin 500: un despliegue al que le falte la variable se queda sin
// puerta, no revienta en cada visita.
delete process.env.ATLAS_SESSION_SECRET;
assert.ok(!verifySession(valor), "sin secreto no vale ninguna");
assert.throws(() => signSession(), "pero firmar sin secreto sí avisa");

console.log("session: ok");
