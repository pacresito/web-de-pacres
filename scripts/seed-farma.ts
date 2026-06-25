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

  const url = process.env.REDIS_URL;
  if (!url) throw new Error("REDIS_URL no definida — usa --env-file=.env.local.");

  const ruta = resolve("seed/prioridades.json");
  const prioridades = JSON.parse(readFileSync(ruta, "utf-8")) as Record<string, unknown>;
  const n = Object.keys(prioridades).length;

  const redis = new Redis(url);
  const key = KEYS.refPrioridades(!prod); // dev por defecto; --prod escribe la clave de prod
  await redis.set(key, JSON.stringify(prioridades));
  await redis.quit();
  console.log(`Sembrados ${n} principios en ${key}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
