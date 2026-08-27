// Vuelca Redis a un JSON en `WEB/redis-backup/`, que es lo que recoge el zip de
// `scripts/backup.sh` — Redis no está en el disco, así que sin este volcado el backup de Pacres
// se lleva el código y deja fuera los datos: el mazo de Atlas, el estado vivo de farma (stock,
// pedidos hechos, historial de descuentos, métricas) y los rankings de los juegos.
//
//   npx tsx --env-file=.env.local scripts/volcar-redis.ts
//
// Solo lee. Restaurar es escribir en producción y no se hace desde aquí.
import Redis from "ioredis";
import { existsSync, mkdirSync, readdirSync, renameSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const DESTINO = join(__dirname, "..", "..", "redis-backup");
const CUANTOS = 3;

// Las claves de desarrollo no se guardan: se resiembran desde prod con los `seed-*.ts`, y son la
// mitad del volcado. Es el mismo criterio que el zip aplica a `node_modules` o `.next`.
// Los dos convenios de sufijo conviven en Redis: `espiral:ranking-dev` y `espiral-dev:ranking`.
const esDev = (clave: string) => clave.endsWith("-dev") || clave.includes("-dev:");

type Entrada = { tipo: string; ttl?: number; valor: unknown };

async function leer(r: Redis, clave: string): Promise<Entrada | null> {
  const tipo = await r.type(clave);
  const ttl = await r.ttl(clave);
  const valor =
    tipo === "string" ? await r.get(clave)
    : tipo === "hash" ? await r.hgetall(clave)
    : tipo === "list" ? await r.lrange(clave, 0, -1)
    : tipo === "set" ? await r.smembers(clave)
    // El zset se guarda como pares [miembro, puntuación] para que un RESTORE los reponga con su
    // orden; `zrange` a secas devuelve los miembros y pierde la puntuación, que es el ranking.
    : tipo === "zset" ? await r.zrange(clave, 0, -1, "WITHSCORES").then(paresDe)
    : null;
  if (valor === null) return null; // tipo que este volcado no sabe leer: mejor no fingir que sí
  return { tipo, ...(ttl > 0 ? { ttl } : {}), valor };
}

const paresDe = (plano: string[]) =>
  Array.from({ length: plano.length / 2 }, (_, i) => [plano[i * 2], Number(plano[i * 2 + 1])]);

/** Deja los `CUANTOS` volcados más recientes; los demás, a la papelera (nunca `rm`). */
function podar() {
  const viejos = readdirSync(DESTINO)
    .filter((n) => /^redis-\d{4}-\d{2}-\d{2}\.json$/.test(n))
    .sort() // el nombre lleva la fecha en ISO, así que ordenar por nombre es ordenar por fecha
    .slice(0, -CUANTOS);
  for (const n of viejos) {
    let destino = join(homedir(), ".Trash", n);
    if (existsSync(destino)) destino = destino.replace(/\.json$/, `.${Date.now()}.json`);
    renameSync(join(DESTINO, n), destino);
    console.log(`  a la papelera: ${n}`);
  }
}

async function main() {
  if (!process.env.REDIS_URL) throw new Error("REDIS_URL no está definida — ¿falta --env-file=.env.local?");
  const r = new Redis(process.env.REDIS_URL);

  let cursor = "0";
  const claves: string[] = [];
  do {
    const [siguiente, lote] = await r.scan(cursor, "COUNT", 500);
    cursor = siguiente;
    claves.push(...lote);
  } while (cursor !== "0");

  const guardadas = claves.filter((c) => !esDev(c)).sort();
  const entradas: [string, Entrada][] = [];
  for (const c of guardadas) {
    const e = await leer(r, c);
    if (e) entradas.push([c, e]);
    else console.log(`  ! omitida (tipo desconocido): ${c}`);
  }
  await r.quit();

  // Un volcado vacío sobrescribiría el bueno del día y no fallaría nada: la carpeta seguiría
  // llena de archivos con pinta de backup. Antes se para.
  if (!entradas.length) throw new Error("Redis no ha devuelto ninguna clave — no se escribe nada");

  // Una clave por línea, montado a mano: con `JSON.stringify(_, null, 2)` cada campo de un hash
  // de 4.900 se lleva su línea y el archivo deja de poder mirarse; en una sola línea no se puede
  // buscar nada. Así se abre, se lee el índice de claves y se compara con el volcado anterior.
  const cuerpo = entradas.map(([c, e]) => `  ${JSON.stringify(c)}: ${JSON.stringify(e)}`).join(",\n");
  // La fecha del nombre es la local, no la de `toISOString()`: el zip de `backup.sh` se nombra
  // con `date +%F`, y a las 00:30 de Madrid el UTC va por el día anterior — volcado y zip de la
  // misma corrida llevarían fechas distintas.
  const d = new Date();
  const fecha = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const json = `{\n "fecha": ${JSON.stringify(new Date().toISOString())},\n "claves": ${entradas.length},\n "datos": {\n${cuerpo}\n }\n}\n`;

  mkdirSync(DESTINO, { recursive: true });
  const archivo = join(DESTINO, `redis-${fecha}.json`);
  writeFileSync(archivo, json);
  console.log(`Volcado: ${archivo}`);
  console.log(`  ${entradas.length} claves · ${(json.length / 1024 / 1024).toFixed(1)} MB · ${claves.length - guardadas.length} de dev omitidas`);
  podar();
}

main().catch((e) => {
  console.error("Volcado de Redis fallido:", e.message);
  process.exit(1);
});
