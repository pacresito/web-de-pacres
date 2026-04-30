import redis from "@/lib/redis";

const KEY = "espiral:ranking";
const TOP = 10;

function parseEntry(member: string, score: number) {
  try {
    const parsed = JSON.parse(member);
    return { name: parsed.name ?? member, date: parsed.date ?? null, score };
  } catch {
    return { name: member, date: null, score };
  }
}

export async function GET() {
  const entries = await redis.zrange(KEY, 0, TOP - 1, "WITHSCORES");
  const ranking = [];
  for (let i = 0; i < entries.length; i += 2) {
    ranking.push(parseEntry(entries[i], Number(entries[i + 1])));
  }
  return Response.json(ranking);
}

export async function POST(request: Request) {
  const { name, score } = await request.json();

  if (typeof name !== "string" || name.trim().length === 0 || typeof score !== "number") {
    return Response.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const member = JSON.stringify({
    name: name.trim().slice(0, 20),
    date: new Date().toISOString().slice(0, 10),
  });

  await redis.zadd(KEY, score, member);

  const count = await redis.zcard(KEY);
  if (count > TOP) {
    await redis.zremrangebyrank(KEY, TOP, -1);
  }

  const entries = await redis.zrange(KEY, 0, TOP - 1, "WITHSCORES");
  const ranking = [];
  for (let i = 0; i < entries.length; i += 2) {
    ranking.push(parseEntry(entries[i], Number(entries[i + 1])));
  }
  return Response.json(ranking);
}
