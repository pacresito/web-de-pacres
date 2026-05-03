import { Resend } from "resend";
import redis from "@/lib/redis";

const KEY = process.env.NODE_ENV === "development" ? "laberinto-dev:ranking" : "laberinto:ranking";
const resend = new Resend(process.env.RESEND_API_KEY);

function parseEntry(member: string, score: number) {
  try {
    const parsed = JSON.parse(member);
    return { name: parsed.name ?? member, date: parsed.date ?? null, score };
  } catch {
    return { name: member, date: null, score };
  }
}

async function findExisting(normalizedName: string): Promise<{ member: string; score: number } | null> {
  const entries = await redis.zrange(KEY, 0, -1, "WITHSCORES");
  for (let i = 0; i < entries.length; i += 2) {
    const entry = parseEntry(entries[i], Number(entries[i + 1]));
    if (entry.name === normalizedName) {
      return { member: entries[i], score: entry.score };
    }
  }
  return null;
}

async function getAll() {
  const entries = await redis.zrange(KEY, 0, -1, "WITHSCORES");
  const all = [];
  for (let i = 0; i < entries.length; i += 2) {
    all.push(parseEntry(entries[i], Number(entries[i + 1])));
  }
  all.sort((a, b) => b.score - a.score);
  const top = all.slice(0, 5);
  const bottom = all.length > 5 ? all.slice(-5).reverse() : [...all].reverse().slice(0, 5);
  return { top, bottom };
}

export async function GET() {
  return Response.json(await getAll());
}

export async function POST(request: Request) {
  const { name, score } = await request.json();

  if (typeof name !== "string" || name.trim().length === 0 || typeof score !== "number") {
    return Response.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const normalizedName = name.trim().slice(0, 20);
  const existing = await findExisting(normalizedName);

  if (existing) {
    if (existing.score >= score) {
      return Response.json(await getAll());
    }
    await redis.zrem(KEY, existing.member);
  }

  const member = JSON.stringify({ name: normalizedName, date: new Date().toISOString().slice(0, 10) });
  await redis.zadd(KEY, score, member);

  if (process.env.NODE_ENV !== "development") {
    resend.emails.send({
      from: "Web de Pacres <hola@pacr.es>",
      to: "pacres.g@gmail.com",
      subject: `${normalizedName} ha jugado al Laberinto — ${score} pts`,
      text: `${normalizedName} ha conseguido ${score} puntos en el Laberinto.\n\nVer ranking: https://pacr.es/juegos/laberinto/ranking`,
    });
  }

  return Response.json(await getAll());
}
