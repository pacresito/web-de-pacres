import { sendEmail } from "@/lib/notify";
import { findAll, makeMember, upsertScore, pruneExtremes, readRanking, type RankEntry } from "@/lib/ranking";
import { checkRateLimit, clientIp } from "@/lib/registro";

const KEY = process.env.NODE_ENV === "development" ? "laberinto:ranking-dev" : "laberinto:ranking";

async function getRanking(): Promise<{ top: RankEntry[]; bottom: RankEntry[] }> {
  const all = await readRanking(KEY);
  all.sort((a, b) => b.score - a.score);
  // bottom: los 5 más negativos, ordenados de más negativo a menos (posición #1 = el peor)
  const top = all.filter((e) => e.score > 0).slice(0, 5);
  const bottom = all.filter((e) => e.score < 0).slice(-5).reverse();
  return { top, bottom };
}

export async function GET() {
  return Response.json(await getRanking());
}

export async function POST(request: Request) {
  if (!(await checkRateLimit(clientIp(request), "ratelimit:ranking:laberinto:"))) {
    return Response.json({ error: "Demasiados envíos. Espera 15 minutos." }, { status: 429 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { name, score } = body;

  if (typeof name !== "string" || name.trim().length === 0) {
    return Response.json({ error: "Datos inválidos" }, { status: 400 });
  }
  if (typeof score !== "number" || !Number.isFinite(score) || score < -100000 || score > 100000) {
    return Response.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const cleanName = name.trim().slice(0, 20);
  // Clave de unicidad: nombre + signo. Un mismo nombre puede tener una entrada positiva y una negativa.
  const sign = score >= 0 ? "positive" : "negative";
  const all = await findAll(KEY);
  const existing = all.find(({ score: s, entry }) =>
    entry.name === cleanName && (s >= 0 ? "positive" : "negative") === sign
  ) ?? null;

  const stored = await upsertScore(
    KEY,
    makeMember(cleanName, { sign }),
    score,
    existing ? { member: existing.member, score: existing.score } : null,
    false,
  );

  if (stored) {
    await pruneExtremes(KEY, 10);
    await sendEmail({
      subject: `${cleanName} ha jugado al Laberinto — ${score} pts`,
      text: `${cleanName} ha conseguido ${score} puntos en el Laberinto.\n\nVer ranking: https://pacr.es/juegos/laberinto/ranking`,
    });
  }

  return Response.json(await getRanking());
}
