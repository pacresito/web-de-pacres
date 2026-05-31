import { sendEmail } from "@/lib/notify";
import { submitScore, pruneExtremes, readRanking, type RankEntry } from "@/lib/ranking";

const KEY = process.env.NODE_ENV === "development" ? "laberinto-dev:ranking" : "laberinto:ranking";

async function getRanking(): Promise<{ top: RankEntry[]; bottom: RankEntry[] }> {
  const all = await readRanking(KEY);
  all.sort((a, b) => b.score - a.score);
  const top = all.filter((e) => e.score > 0).slice(0, 5);
  const bottom = all.filter((e) => e.score < 0).slice(-5).reverse();
  return { top, bottom };
}

export async function GET() {
  return Response.json(await getRanking());
}

export async function POST(request: Request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 });
  }
  const { name, score } = body;

  // Laberinto mide puntos (pueden ser negativos): mayor es mejor.
  const result = await submitScore({ key: KEY, name, score, lowerIsBetter: false, min: -100000, max: 100000 });
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 400 });
  }

  if (result.stored) {
    // Mantiene acotado el zset conservando las 10 más altas y 10 más bajas
    // (el ranking solo muestra top 5 / bottom 5).
    await pruneExtremes(KEY, 10);
    await sendEmail({
      subject: `${result.name} ha jugado al Laberinto — ${score} pts`,
      text: `${result.name} ha conseguido ${score} puntos en el Laberinto.\n\nVer ranking: https://pacr.es/juegos/laberinto/ranking`,
    });
  }

  return Response.json(await getRanking());
}
