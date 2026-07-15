// Trae los descuentos de producción (los que gobierna María) a las claves de dev.
// Correr desde la raíz del repo, con las env de local:
//   npx tsx --env-file=.env.local scripts/sync-descuentos-desde-prod.ts
// Dirección única prod → dev, sin flags: local se desactualiza cada vez que María edita,
// y al revés no hay nada que traer (el seed --prod ya mergea lo que Pablo añade).
import Redis from "ioredis";
import { KEYS } from "../lib/farma/keys";
import type { LabDescuento } from "../lib/farma/prioridades";

type Descuentos = Record<string, LabDescuento[]>;

const firma = (labs: LabDescuento[]): string =>
  labs
    .map((l) => `${l.lab}=${l.descuento}${l.inferido ? "*" : ""}`)
    .sort()
    .join("|");

async function main(): Promise<void> {
  const url = process.env.REDIS_URL;
  if (!url) throw new Error("REDIS_URL no definida — usa --env-file=.env.local.");

  const redis = new Redis(url);

  const rawProd = await redis.get(KEYS.descuentos(false));
  if (!rawProd) throw new Error(`${KEYS.descuentos(false)} no existe — nada que copiar.`);

  const rawDev = await redis.get(KEYS.descuentos(true));
  const prod = JSON.parse(rawProd) as Descuentos;
  const dev: Descuentos = rawDev ? (JSON.parse(rawDev) as Descuentos) : {};

  const cambiados = Object.entries(prod).filter(
    ([principio, labs]) => !dev[principio] || firma(dev[principio]) !== firma(labs),
  );
  for (const [principio, labs] of cambiados) {
    console.log(`${principio}: ${firma(dev[principio] ?? [])} → ${firma(labs)}`);
  }

  await redis.set(KEYS.descuentos(true), rawProd);
  console.log(
    `${KEYS.descuentos(true)} ← ${KEYS.descuentos(false)}: ` +
      `${Object.keys(prod).length} principios (${cambiados.length} con cambios).`,
  );

  await redis.quit();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
