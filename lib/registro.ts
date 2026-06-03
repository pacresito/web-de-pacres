// Lógica compartida entre los registros de partidas (Castle Combo y Agrícola).
import redis from "./redis";
import { sendEmail, type SendEmailOptions } from "./notify";

const PASSWORD = process.env.REGISTRO_PASSWORD;
const PAGE_SIZE = 10;
const RATE_MAX = 5;
const RATE_TTL = 900; // 15 min

/** Incrementa el contador por IP y devuelve si sigue dentro del límite. */
export async function checkRateLimit(ip: string, prefix: string, max = RATE_MAX, ttl = RATE_TTL): Promise<boolean> {
  const key = prefix + ip;
  const attempts = await redis.incr(key);
  if (attempts === 1) await redis.expire(key, ttl);
  return attempts <= max;
}

export async function clearRateLimit(ip: string, prefix: string): Promise<void> {
  await redis.del(prefix + ip);
}

/** IP del cliente. x-real-ip lo fija Vercel y no es spoofeable; como fallback usamos el
 *  ÚLTIMO segmento de x-forwarded-for (el que añade el proxy), no el primero: el cliente
 *  puede inyectar XFF y el primer valor sería el suyo, saltándose el rate-limit. */
export function clientIp(request: Request): string {
  return (
    request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("x-forwarded-for")?.split(",").pop()?.trim() ||
    "unknown"
  );
}

/** request.json() no valida la forma del body; estos predicados sí. */
export function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === "string");
}
export function isNumberMatrix(v: unknown): v is number[][] {
  return (
    Array.isArray(v) &&
    v.every((row) => Array.isArray(row) && row.every((n) => typeof n === "number" && Number.isFinite(n)))
  );
}

export interface PaginatedList<T> {
  records: T[];
  total: number;
  page: number;
  totalPages: number;
}

/** Lista paginada (más reciente primero) de una lista Redis de records JSON. */
export async function paginatedList<T>(key: string, page: number): Promise<PaginatedList<T>> {
  const total = await redis.llen(key);
  const start = (page - 1) * PAGE_SIZE;
  const raw = await redis.lrange(key, start, start + PAGE_SIZE - 1);
  return {
    records: raw.flatMap((r) => {
      try {
        return [JSON.parse(r) as T];
      } catch {
        return [];
      }
    }),
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

/** GET de registro: lee `?page=` y devuelve la página. */
export async function handleRegistroGet(request: Request, key: string): Promise<Response> {
  const page = Math.max(1, parseInt(new URL(request.url).searchParams.get("page") ?? "1", 10));
  return Response.json(await paginatedList(key, page));
}

interface RegistroBody {
  password?: unknown;
}

export interface RegistroPostConfig<T extends RegistroBody, R> {
  key: string;
  ratePrefix: string;
  requiredFields: (keyof T & string)[];
  /** Valida la FORMA del body (no solo la presencia): evita un 500 si, p.ej., la matriz
   *  numérica llega mal formada. Devuelve false → 400. */
  validate?: (body: T) => boolean;
  /** Construye el record a guardar a partir del body validado. */
  buildRecord: (body: T) => R;
  /** Construye el email de notificación a partir del record. */
  buildEmail: (record: R) => SendEmailOptions;
}

/**
 * POST de registro: rate‑limit → parse JSON → clave → campos requeridos →
 * guarda el record → email. Comparte el flujo entre Castle Combo y Agrícola;
 * cada uno aporta cómo construir su record y su email.
 */
export async function handleRegistroPost<T extends RegistroBody, R>(
  request: Request,
  config: RegistroPostConfig<T, R>,
): Promise<Response> {
  const ip = clientIp(request);

  if (!(await checkRateLimit(ip, config.ratePrefix))) {
    return Response.json({ error: "Demasiados intentos. Espera 15 minutos." }, { status: 429 });
  }

  let body: T;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 });
  }

  if (!PASSWORD || body.password !== PASSWORD) {
    return Response.json({ error: "Clave incorrecta" }, { status: 401 });
  }
  await clearRateLimit(ip, config.ratePrefix);

  for (const field of config.requiredFields) {
    if (body[field] === undefined || body[field] === null) {
      return Response.json({ error: "Datos incompletos" }, { status: 400 });
    }
  }

  if (config.validate && !config.validate(body)) {
    return Response.json({ error: "Datos con formato inválido" }, { status: 400 });
  }

  const record = config.buildRecord(body);
  await redis.lpush(config.key, JSON.stringify(record));
  await sendEmail(config.buildEmail(record));

  return Response.json({ ok: true });
}

/** Ganador a partir de los totales: empate si hay más de un máximo. Compartido
 *  por Castle Combo y Agrícola (idéntico en ambos). */
export function computeWinner(players: string[], totals: number[]): string {
  const max = Math.max(...totals);
  const winners = players.filter((_, i) => totals[i] === max);
  return winners.length > 1 ? "Empate" : winners[0];
}
