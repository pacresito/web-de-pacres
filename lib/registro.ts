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
    records: raw.map((r) => JSON.parse(r) as T),
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
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";

  if (!(await checkRateLimit(ip, config.ratePrefix))) {
    return Response.json({ error: "Demasiados intentos. Espera 15 minutos." }, { status: 429 });
  }

  let body: T;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 });
  }

  if (body.password !== PASSWORD) {
    return Response.json({ error: "Clave incorrecta" }, { status: 401 });
  }
  await clearRateLimit(ip, config.ratePrefix);

  for (const field of config.requiredFields) {
    if (body[field] === undefined || body[field] === null) {
      return Response.json({ error: "Datos incompletos" }, { status: 400 });
    }
  }

  const record = config.buildRecord(body);
  await redis.lpush(config.key, JSON.stringify(record));
  await sendEmail(config.buildEmail(record));

  return Response.json({ ok: true });
}
