import { sendEmail } from "@/lib/notify";
import { submitScore, pruneTop, readRanking } from "@/lib/ranking";

const KEY = process.env.NODE_ENV === "development" ? "espiral-dev:ranking" : "espiral:ranking";
const TOP = 10;
const VALID_SPEEDS = ["slow", "normal", "fast"];

export async function GET() {
  return Response.json(await readRanking(KEY, 0, TOP - 1));
}

export async function POST(request: Request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 });
  }
  const { name, score, speed } = body;

  // Espiral mide tiempo: menor es mejor.
  const result = await submitScore({ key: KEY, name, score, speed, lowerIsBetter: true, min: 0, max: 100000 });
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 400 });
  }

  if (result.stored) {
    await pruneTop(KEY, TOP, true);
    const validSpeed = VALID_SPEEDS.includes(speed) ? speed : null;
    await sendEmail({
      subject: `${result.name} ha jugado al Espiral — ${Number(score).toFixed(1)}s`,
      text: `${result.name} ha conseguido ${Number(score).toFixed(1)}s en el juego Espiral (velocidad: ${validSpeed ?? "—"}).\n\nVer ranking: https://pacr.es/juegos/espiral/ranking`,
    });
  }

  return Response.json(await readRanking(KEY, 0, TOP - 1));
}
