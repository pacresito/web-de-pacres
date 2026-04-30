import redis from "@/lib/redis";

const KEY = "espiral:ranking";
const TOP = 10;

export async function GET() {
  const entries = await redis.zrange(KEY, 0, TOP - 1, "WITHSCORES");
  const ranking = [];
  for (let i = 0; i < entries.length; i += 2) {
    ranking.push({ name: entries[i], score: Number(entries[i + 1]) });
  }
  return Response.json(ranking);
}

export async function POST(request: Request) {
  const { name, score } = await request.json();

  if (typeof name !== "string" || name.trim().length === 0 || typeof score !== "number") {
    return Response.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const trimmedName = name.trim().slice(0, 20);

  await redis.zadd(KEY, score, trimmedName);

  const count = await redis.zcard(KEY);
  if (count > TOP) {
    await redis.zremrangebyrank(KEY, TOP, -1);
  }

  const entries = await redis.zrange(KEY, 0, TOP - 1, "WITHSCORES");
  const ranking = [];
  for (let i = 0; i < entries.length; i += 2) {
    ranking.push({ name: entries[i], score: Number(entries[i + 1]) });
  }
  return Response.json(ranking);
}
