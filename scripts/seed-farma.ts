// Vuelca el JSON normalizado (gitignoreado, en seed/) a Redis.
// Correr desde la raíz del repo, con las env de local:
//   npx tsx --env-file=.env.local scripts/seed-farma.ts          → siembra -dev
//   npx tsx --env-file=.env.local scripts/seed-farma.ts --prod   → siembra producción
// Por defecto escribe en -dev: los datos sin validar (por María) no tocan prod.
import Redis from "ioredis";
import { readFileSync } from "fs";
import { resolve } from "path";
import { KEYS } from "../lib/farma/keys";

async function main(): Promise<void> {
  const prod = process.argv.includes("--prod");
  const dev = !prod; // dev por defecto; --prod escribe las claves de prod

  const url = process.env.REDIS_URL;
  if (!url) throw new Error("REDIS_URL no definida — usa --env-file=.env.local.");

  const redis = new Redis(url);

  // Descuentos (Prioridades).
  const prioridades = JSON.parse(readFileSync(resolve("seed/prioridades.json"), "utf-8")) as Record<string, unknown>;
  await redis.set(KEYS.descuentos(dev), JSON.stringify(prioridades));
  console.log(`Sembrados ${Object.keys(prioridades).length} principios en ${KEYS.descuentos(dev)}.`);

  // Ventas: ref:pedidos (blob) + stmin (hash). El StMín lo gobierna María a partir de
  // aquí; solo se siembran los > 0 (StMín 0 = nunca rotura, no aporta a Pedidos ni a Mínimos).
  const ventas = JSON.parse(readFileSync(resolve("seed/ventas.json"), "utf-8")) as {
    ref_pedidos: Record<string, unknown>;
    stmin: Record<string, number>;
  };
  await redis.set(KEYS.refPedidos(dev), JSON.stringify(ventas.ref_pedidos));
  const stmin = Object.fromEntries(Object.entries(ventas.stmin).filter(([, v]) => v > 0));
  await redis.del(KEYS.stmin(dev));
  await redis.hset(KEYS.stmin(dev), stmin);
  console.log(`Sembrados ${Object.keys(ventas.ref_pedidos).length} artículos en ${KEYS.refPedidos(dev)} y ${Object.keys(stmin).length} StMín en ${KEYS.stmin(dev)}.`);

  // Pedidos: mapa codigo → [pedidos] (eje de agrupación de Pedidos, de la carpeta de María).
  const pedidos = JSON.parse(readFileSync(resolve("seed/pedidos.json"), "utf-8")) as Record<string, string[]>;
  await redis.set(KEYS.pedidoCodigos(dev), JSON.stringify(pedidos));
  const nPedidos = new Set(Object.values(pedidos).flat()).size;
  console.log(`Sembrados ${Object.keys(pedidos).length} códigos en ${nPedidos} pedidos en ${KEYS.pedidoCodigos(dev)}.`);

  await redis.quit();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
