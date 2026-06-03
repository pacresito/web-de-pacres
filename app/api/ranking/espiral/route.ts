import { sendEmail } from "@/lib/notify";
import { submitScore, pruneTop, readRanking } from "@/lib/ranking";
import { checkRateLimit, clientIp } from "@/lib/registro";

const KEY = process.env.NODE_ENV === "development" ? "espiral:ranking-dev" : "espiral:ranking";
const TOP = 10;

export async function GET() {
  return Response.json(await readRanking(KEY, 0, TOP - 1));
}

export async function POST(request: Request) {
  // Cada score guardado dispara un email; mismo límite que los registros de las calcs
  // (5 envíos / 15 min por IP) evita que una IP inunde el correo. Sin reset (no hay "acierto").
  if (!(await checkRateLimit(clientIp(request), "ratelimit:ranking:espiral:"))) {
    return Response.json({ error: "Demasiados envíos. Espera 15 minutos." }, { status: 429 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 });
  }
  const { name, score, speed } = body;

  // Espiral mide tiempo: menor es mejor. min 0.5s: 0.0s es imposible jugando y
  // un POST directo con score:0 liderará el ranking para siempre.
  const result = await submitScore({ key: KEY, name, score, speed, lowerIsBetter: true, min: 0.5, max: 100000 });
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 400 });
  }

  if (result.stored) {
    await pruneTop(KEY, TOP, true);
    await sendEmail({
      subject: `${result.name} ha jugado al Espiral — ${Number(score).toFixed(1)}s`,
      text: `${result.name} ha conseguido ${Number(score).toFixed(1)}s en el juego Espiral (velocidad: ${result.speed ?? "—"}).\n\nVer ranking: https://pacr.es/juegos/espiral/ranking`,
    });
  }

  return Response.json(await readRanking(KEY, 0, TOP - 1));
}
