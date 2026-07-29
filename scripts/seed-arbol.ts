// Vuelca seed/arbol.json (gitignoreado; se regenera desde WEB/arbol-genealogico/
// en Pacres) a Redis. Correr desde la raíz del repo, con las env de local:
//   npx tsx --env-file=.env.local scripts/seed-arbol.ts          → siembra -dev
//   npx tsx --env-file=.env.local scripts/seed-arbol.ts --prod   → siembra producción
import Redis from "ioredis";
import { readFileSync } from "fs";
import { resolve } from "path";
import { KEYS } from "../lib/arbol/keys";

async function main(): Promise<void> {
  const prod = process.argv.includes("--prod");
  const dev = !prod;

  const url = process.env.REDIS_URL;
  if (!url) throw new Error("REDIS_URL no definida — usa --env-file=.env.local.");

  const redis = new Redis(url);
  const data = readFileSync(resolve("seed/arbol.json"), "utf-8");
  const parsed = JSON.parse(data);
  await redis.set(KEYS.datos(dev), JSON.stringify(parsed));
  console.log(
    `Sembrado en ${KEYS.datos(dev)}: ${parsed.people.length} personas, ${parsed.unions.length} uniones.`,
  );
  redis.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
