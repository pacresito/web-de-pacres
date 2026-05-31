import Redis from "ioredis";

// Cacheamos la instancia en globalThis para no abrir una conexión nueva en cada
// recarga de Turbopack (HMR) ni en cada invocación de función serverless.
declare global {
  // eslint-disable-next-line no-var
  var __redis: Redis | undefined;
}

function createRedis(): Redis {
  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error("REDIS_URL no está definida — revisa las variables de entorno.");
  }
  const client = new Redis(url);
  client.on("error", (err) => console.error("Redis error:", err));
  return client;
}

const redis = globalThis.__redis ?? createRedis();
globalThis.__redis = redis;

export default redis;
