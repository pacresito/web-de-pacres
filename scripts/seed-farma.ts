// Vuelca el JSON normalizado (gitignoreado, en seed/) a Redis.
// Correr desde la raíz del repo, con las env de local:
//   npx tsx --env-file=.env.local scripts/seed-farma.ts          → siembra -dev
//   npx tsx --env-file=.env.local scripts/seed-farma.ts --prod   → siembra producción
// Por defecto escribe en -dev: los datos sin validar (por María) no tocan prod.
import Redis from "ioredis";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { KEYS } from "../lib/farma/keys";
import type { LabDescuento } from "../lib/farma/prioridades";

type Descuentos = Record<string, LabDescuento[]>;

async function main(): Promise<void> {
  const prod = process.argv.includes("--prod");
  const dev = !prod; // dev por defecto; --prod escribe las claves de prod

  const url = process.env.REDIS_URL;
  if (!url) throw new Error("REDIS_URL no definida — usa --env-file=.env.local.");

  const redis = new Redis(url);

  // Descuentos (Prioridades). Una vez sembrado, el blob lo gobierna María (lo edita
  // desde la pantalla Descuentos, incl. altas de labs). Por eso NO se sobrescribe: se
  // MERGEA — el blob existente gana en todo conflicto y el seed solo AÑADE lo que falta
  // (principios nuevos como los que mete Pablo por el pipeline, o labs nuevos de un
  // principio). Así un re-seed nunca borra lo que María validó ni sus altas.
  const seedDesc = JSON.parse(readFileSync(resolve("seed/prioridades.json"), "utf-8")) as Descuentos;
  const rawPrev = await redis.get(KEYS.descuentos(dev));
  const prev: Descuentos = rawPrev ? JSON.parse(rawPrev) : {};
  const merged: Descuentos = { ...prev };
  let nuevosPrincipios = 0;
  let nuevosLabs = 0;
  for (const [principio, labs] of Object.entries(seedDesc)) {
    const existentes = merged[principio];
    if (!existentes) {
      merged[principio] = labs;
      nuevosPrincipios++;
      continue;
    }
    const presentes = new Set(existentes.map((l) => l.lab));
    const anadir = labs.filter((l) => !presentes.has(l.lab));
    if (anadir.length) merged[principio] = [...existentes, ...anadir];
    nuevosLabs += anadir.length;
  }
  await redis.set(KEYS.descuentos(dev), JSON.stringify(merged));
  console.log(
    `Descuentos en ${KEYS.descuentos(dev)}: ${Object.keys(merged).length} principios ` +
      `(+${nuevosPrincipios} principios, +${nuevosLabs} labs nuevos; el resto se conserva).`,
  );

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

  // Recomendaciones (ventas cruzadas): dato mutable de María. A diferencia del resto, se
  // siembra SOLO si la clave no existe, para no pisar sus ediciones en un re-seed. El
  // JSON curado llega en otra fase; si aún no está, se salta sin ruido.
  const recomPath = resolve("seed/recomendaciones.json");
  if (!existsSync(recomPath)) {
    console.log("Sin seed/recomendaciones.json — se omiten las recomendaciones.");
  } else if (await redis.exists(KEYS.recomendaciones(dev))) {
    console.log(`${KEYS.recomendaciones(dev)} ya existe — no se pisa (lo gobierna María).`);
  } else {
    const recom = JSON.parse(readFileSync(recomPath, "utf-8")) as Record<string, string[]>;
    await redis.set(KEYS.recomendaciones(dev), JSON.stringify(recom));
    console.log(`Sembradas ${Object.keys(recom).length} recomendaciones en ${KEYS.recomendaciones(dev)}.`);
  }

  await redis.quit();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
