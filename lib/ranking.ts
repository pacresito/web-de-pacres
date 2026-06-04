import redis from "./redis";

export interface RankEntry {
  name: string;
  date: string | null;
  score: number;
  speed: string | null;
}

export const VALID_SPEEDS = ["slow", "normal", "fast"] as const;
export type SpeedLevel = (typeof VALID_SPEEDS)[number];

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

export interface Slot {
  member: string;
  score: number;
  entry: RankEntry;
}

/** Lee todos los miembros del zset con sus scores y entries parseadas. */
export async function findAll(key: string): Promise<Slot[]> {
  const raw = await redis.zrange(key, 0, -1, "WITHSCORES");
  const out: Slot[] = [];
  for (let i = 0; i < raw.length; i += 2) {
    const score = Number(raw[i + 1]);
    out.push({ member: raw[i], score, entry: parseEntry(raw[i], score) });
  }
  return out;
}

/** Construye el string miembro del zset. `extras` permite añadir campos de dedup (speed, sign…). */
export function makeMember(name: string, extras?: Record<string, string>): string {
  return JSON.stringify({
    name,
    date: new Date().toISOString().slice(0, 10),
    ...extras,
  });
}

/**
 * Guarda `score` si mejora al existente. Devuelve true si se almacenó.
 * `existing` es la entrada actual para la misma clave de unicidad (nombre, nombre+velocidad, etc.).
 */
export async function upsertScore(
  key: string,
  member: string,
  score: number,
  existing: { member: string; score: number } | null,
  lowerIsBetter: boolean,
): Promise<boolean> {
  if (existing) {
    if (lowerIsBetter ? score >= existing.score : score <= existing.score) return false;
    await redis.zrem(key, existing.member);
  }
  await redis.zadd(key, score, member);
  return true;
}

/** Poda dejando solo las `keep` mejores entradas (Espiral: top‑N por tiempo). */
export async function pruneTop(key: string, keep: number, lowerIsBetter: boolean): Promise<void> {
  const count = await redis.zcard(key);
  if (count <= keep) return;
  if (lowerIsBetter) await redis.zremrangebyrank(key, keep, -1);
  else await redis.zremrangebyrank(key, 0, count - keep - 1);
}

/** Poda dejando las `keep` más altas y las `keep` más bajas (Laberinto: top/bottom). */
export async function pruneExtremes(key: string, keep: number): Promise<void> {
  const count = await redis.zcard(key);
  if (count <= keep * 2) return;
  await redis.zremrangebyrank(key, keep, count - keep - 1);
}
