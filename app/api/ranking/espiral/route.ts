import { sendEmail } from "@/lib/notify";
import { findAll, makeMember, upsertScore, pruneTop, readRanking, VALID_SPEEDS } from "@/lib/ranking";
import { checkRateLimit, clientIp } from "@/lib/registro";

const KEY = process.env.NODE_ENV === "development" ? "espiral:ranking-dev" : "espiral:ranking";
const TOP = 10;

export async function GET() {
  return Response.json(await readRanking(KEY, 0, TOP - 1));
}

export async function POST(request: Request) {
  if (!(await checkRateLimit(clientIp(request), "ratelimit:ranking:espiral:"))) {
    return Response.json({ error: "Demasiados envíos. Espera 30 minutos." }, { status: 429 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { name, score, speed } = body;

  if (typeof name !== "string" || name.trim().length === 0) {
    return Response.json({ error: "Datos inválidos" }, { status: 400 });
  }
  if (typeof score !== "number" || !Number.isFinite(score) || score < 0.5 || score > 100000) {
    return Response.json({ error: "Datos inválidos" }, { status: 400 });
  }
  if (!(VALID_SPEEDS as readonly string[]).includes(speed)) {
    return Response.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const cleanName = name.trim().slice(0, 20);
  const all = await findAll(KEY);
  const existing = all.find(({ entry }) => entry.name === cleanName && entry.speed === speed) ?? null;

  const stored = await upsertScore(
    KEY,
    makeMember(cleanName, { speed }),
    score,
    existing ? { member: existing.member, score: existing.score } : null,
    true,
  );

  if (stored) {
    await pruneTop(KEY, TOP, true);
    await sendEmail({
      subject: `${cleanName} ha jugado al Espiral — ${score.toFixed(1)}s`,
      text: `${cleanName} ha conseguido ${score.toFixed(1)}s en el juego Espiral (velocidad: ${speed}).\n\nVer ranking: https://pacr.es/juegos/espiral/ranking`,
    });
  }

  return Response.json(await readRanking(KEY, 0, TOP - 1));
}
