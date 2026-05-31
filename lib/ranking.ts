// Lógica compartida entre los rankings de Espiral y Laberinto.
import redis from "./redis";

export interface RankEntry {
  name: string;
  date: string | null;
  score: number;
  speed: string | null;
}

const VALID_SPEEDS = ["slow", "normal", "fast"];

export function parseEntry(member: string, score: number): RankEntry {
  try {
    const parsed = JSON.parse(member);
    return { name: parsed.name ?? member, date: parsed.date ?? null, score, speed: parsed.speed ?? null };
  } catch {
    return { name: member, date: null, score, speed: null };
  }
}

/** Lee un rango del zset (orden ascendente) como entradas parseadas. */
export async function readRanking(key: string, start = 0, stop = -1): Promise<RankEntry[]> {
  const raw = await redis.zrange(key, start, stop, "WITHSCORES");
  const out: RankEntry[] = [];
  for (let i = 0; i < raw.length; i += 2) {
    out.push(parseEntry(raw[i], Number(raw[i + 1])));
  }
  return out;
}

/** Busca la entrada (member crudo + score) de un nombre ya normalizado. */
export async function findMember(
  key: string,
  name: string,
): Promise<{ member: string; score: number } | null> {
  const raw = await redis.zrange(key, 0, -1, "WITHSCORES");
  for (let i = 0; i < raw.length; i += 2) {
    if (parseEntry(raw[i], Number(raw[i + 1])).name === name) {
      return { member: raw[i], score: Number(raw[i + 1]) };
    }
  }
  return null;
}

export interface SubmitOptions {
  key: string;
  name: unknown;
  score: unknown;
  speed?: unknown;
  /** true → menor es mejor (Espiral, tiempo); false → mayor es mejor (Laberinto, puntos). */
  lowerIsBetter: boolean;
  min?: number;
  max?: number;
}

export type SubmitResult =
  | { ok: false; error: string }
  | { ok: true; stored: boolean; name: string };

/**
 * Valida y guarda una puntuación. Mantiene una sola entrada por nombre, quedándose
 * con la mejor según `lowerIsBetter`. No envía email ni poda: eso lo decide el route.
 */
export async function submitScore(opts: SubmitOptions): Promise<SubmitResult> {
  const { key, lowerIsBetter, min = -Infinity, max = Infinity } = opts;

  if (typeof opts.name !== "string" || opts.name.trim().length === 0) {
    return { ok: false, error: "Datos inválidos" };
  }
  if (typeof opts.score !== "number" || !Number.isFinite(opts.score) || opts.score < min || opts.score > max) {
    return { ok: false, error: "Datos inválidos" };
  }

  const name = opts.name.trim().slice(0, 20);
  const score = opts.score;
  const speed = VALID_SPEEDS.includes(opts.speed as string) ? (opts.speed as string) : null;

  const existing = await findMember(key, name);
  if (existing) {
    const isBetter = lowerIsBetter ? score < existing.score : score > existing.score;
    if (!isBetter) return { ok: true, stored: false, name };
    await redis.zrem(key, existing.member);
  }

  const member = JSON.stringify({
    name,
    date: new Date().toISOString().slice(0, 10),
    ...(speed ? { speed } : {}),
  });
  await redis.zadd(key, score, member);

  return { ok: true, stored: true, name };
}

/** Poda dejando solo las `keep` mejores entradas (Espiral: top‑N). */
export async function pruneTop(key: string, keep: number, lowerIsBetter: boolean): Promise<void> {
  const count = await redis.zcard(key);
  if (count <= keep) return;
  // El zset está en orden ascendente: si menor es mejor, las mejores son las
  // primeras y se descartan las de cola; si mayor es mejor, al revés.
  if (lowerIsBetter) await redis.zremrangebyrank(key, keep, -1);
  else await redis.zremrangebyrank(key, 0, count - keep - 1);
}

/** Poda dejando las `keep` más altas y las `keep` más bajas (Laberinto: top/bottom). */
export async function pruneExtremes(key: string, keep: number): Promise<void> {
  const count = await redis.zcard(key);
  if (count <= keep * 2) return;
  await redis.zremrangebyrank(key, keep, count - keep - 1);
}
