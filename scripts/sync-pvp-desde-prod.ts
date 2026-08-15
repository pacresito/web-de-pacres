// Trae el histórico de PVP y el borrador de etiquetado de producción a las claves de dev.
// Correr desde la raíz del repo, con las env de local:
//   npx tsx --env-file=.env.local scripts/sync-pvp-desde-prod.ts
// Dirección única prod → dev (gemelo de sync-descuentos-desde-prod.ts): lo que hay en
// prod lo genera la subida de inventario de María y lo edita ella, y en local no se puede
// reproducir. Sobrescribe las claves de dev enteras: no hay nada que conservar en local.
import Redis from "ioredis";
import { KEYS } from "../lib/farma/keys";
import { leerRegistroPvp } from "../lib/farma/pvp";

async function main(): Promise<void> {
  const url = process.env.REDIS_URL;
  if (!url) throw new Error("REDIS_URL no definida — usa --env-file=.env.local.");

  const redis = new Redis(url);

  const pvp = await redis.hgetall(KEYS.pvp(false));
  const codigos = Object.keys(pvp);
  if (codigos.length === 0) throw new Error(`${KEYS.pvp(false)} vacío — nada que copiar.`);

  await redis.del(KEYS.pvp(true));
  await redis.hset(KEYS.pvp(true), pvp);
  const pendientes = codigos.filter((c) => leerRegistroPvp(c, pvp[c])?.pending).length;
  console.log(`${KEYS.pvp(true)} ← ${KEYS.pvp(false)}: ${codigos.length} artículos (${pendientes} pendientes).`);

  const borrador = await redis.get(KEYS.pvpEtiquetas(false));
  if (borrador) {
    await redis.set(KEYS.pvpEtiquetas(true), borrador);
    console.log(`${KEYS.pvpEtiquetas(true)} ← ${KEYS.pvpEtiquetas(false)}.`);
  } else {
    console.log(`${KEYS.pvpEtiquetas(false)} no existe — María no tiene borrador a medias.`);
  }

  await redis.quit();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
