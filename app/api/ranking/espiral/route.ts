import { Resend } from "resend";
import redis from "@/lib/redis";
import { parseEntry } from "@/lib/ranking";

const KEY = process.env.NODE_ENV === "development" ? "espiral-dev:ranking" : "espiral:ranking";
const TOP = 10;
const resend = new Resend(process.env.RESEND_API_KEY);

async function findExistingMember(normalizedName: string): Promise<{ member: string; score: number } | null> {
  const entries = await redis.zrange(KEY, 0, -1, "WITHSCORES");
  for (let i = 0; i < entries.length; i += 2) {
    const entry = parseEntry(entries[i], Number(entries[i + 1]));
    if (entry.name === normalizedName) {
      return { member: entries[i], score: entry.score };
    }
  }
  return null;
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

  const normalizedName = name.trim().slice(0, 20);
  const existing = await findExistingMember(normalizedName);
  if (existing) {
    if (score >= existing.score) {
      return Response.json({ skipped: true });
    }
    await redis.zrem(KEY, existing.member);
  }

  const member = JSON.stringify({
    name: normalizedName,
    date: new Date().toISOString().slice(0, 10),
  });

  await redis.zadd(KEY, score, member);

  const count = await redis.zcard(KEY);
  if (count > TOP) {
    await redis.zremrangebyrank(KEY, TOP, -1);
  }

  if (process.env.NODE_ENV !== "development") {
    resend.emails.send({
      from: "Web de Pacres <hola@pacr.es>",
      to: "pacres.g@gmail.com",
      subject: `${normalizedName} ha jugado al Espiral — ${score.toFixed(1)}s`,
      text: `${normalizedName} ha conseguido ${score.toFixed(1)}s en el juego Espiral.\n\nVer ranking: https://pacr.es/juegos/espiral/ranking`,
    }).catch((err) => console.error("Resend error (espiral):", err));
  }

  const entries = await redis.zrange(KEY, 0, TOP - 1, "WITHSCORES");
  const ranking = [];
  for (let i = 0; i < entries.length; i += 2) {
    ranking.push(parseEntry(entries[i], Number(entries[i + 1])));
  }
  return Response.json(ranking);
}
