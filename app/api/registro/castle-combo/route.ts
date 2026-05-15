import { Resend } from "resend";
import redis from "@/lib/redis";

const KEY =
  process.env.NODE_ENV === "development"
    ? "registro:castle-combo-dev"
    : "registro:castle-combo";

const PASSWORD = "***REMOVED***";
const PAGE_SIZE = 10;

const POSITIONS = [
  "Superior izquierda", "Superior centro", "Superior derecha",
  "Centro izquierda", "Centro", "Centro derecha",
  "Inferior izquierda", "Inferior centro", "Inferior derecha",
  "Llaves",
];

function buildEmail(record: {
  date: string;
  players: string[];
  scores: number[][];
  totals: number[];
  winner: string;
}) {
  const { date, players, scores, totals, winner } = record;

  const headerCols = players
    .map(
      (p) =>
        `<th style="padding:10px 14px;text-align:center;color:#fff;background:#78b5d0;border-left:1px solid rgba(0,0,0,0.2);">${p}</th>`
    )
    .join("");

  const bodyRows = POSITIONS.map((label, i) => {
    const bg = i % 2 === 0 ? "#b5d9ee" : "#ffffff";
    const iconBg = i % 2 === 0 ? "#9dc8dc" : "#cce6f4";
    const cells = players
      .map(
        (_, pi) =>
          `<td style="padding:8px 14px;text-align:center;font-family:monospace;border-left:1px solid rgba(0,0,0,0.15);">${scores[pi][i] ?? ""}</td>`
      )
      .join("");
    return `<tr style="background:${bg};">
      <td style="padding:8px 10px;text-align:center;background:${iconBg};font-size:11px;color:#374151;">${label}</td>
      ${cells}
    </tr>`;
  }).join("");

  const totalCells = totals
    .map(
      (t, i) =>
        `<td style="padding:12px 14px;text-align:center;font-size:18px;font-weight:bold;color:${totals[i] === Math.max(...totals) ? "#fef08a" : "#fff"};border-left:1px solid rgba(0,0,0,0.2);">${t}</td>`
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:24px;background:#EBF5FB;font-family:sans-serif;">
  <div style="max-width:480px;margin:0 auto;">
    <h1 style="text-align:center;color:#1e3a5f;font-size:22px;margin:0 0 4px;">🏰 Castle Combo</h1>
    <p style="text-align:center;color:#4d91c0;font-size:14px;margin:0 0 20px;">${date}</p>
    <table style="width:100%;border-collapse:collapse;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.15);">
      <thead>
        <tr style="background:#4d91c0;border-bottom:4px solid rgba(255,255,255,0.85);">
          <th style="padding:12px 10px;text-align:center;color:white;font-size:22px;">🏰</th>
          ${headerCols}
        </tr>
      </thead>
      <tbody>
        ${bodyRows}
        <tr style="background:#4d91c0;border-top:2px solid rgba(0,0,0,0.4);">
          <td style="padding:12px 10px;text-align:center;color:#fff;font-size:20px;">Σ</td>
          ${totalCells}
        </tr>
      </tbody>
    </table>
    <p style="text-align:center;margin-top:16px;font-weight:bold;color:#78350f;background:#fbbf24;padding:10px;border-radius:8px;">🏆 ${winner}</p>
  </div>
</body>
</html>`;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
  const total = await redis.llen(KEY);
  const start = (page - 1) * PAGE_SIZE;
  const end = start + PAGE_SIZE - 1;
  const raw = await redis.lrange(KEY, start, end);
  const records = raw.map((r) => JSON.parse(r));
  return Response.json({
    records,
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { password, date, players, scores, totals, winner } = body;

  if (password !== PASSWORD) {
    return Response.json({ error: "Clave incorrecta" }, { status: 401 });
  }
  if (!date || !players || !scores || !totals || !winner) {
    return Response.json({ error: "Datos incompletos" }, { status: 400 });
  }

  const record = { date, players, scores, totals, winner };
  await redis.lpush(KEY, JSON.stringify(record));

  if (process.env.NODE_ENV !== "development") {
    const resend = new Resend(process.env.RESEND_API_KEY);
    resend.emails
      .send({
        from: "Web de Pacres <hola@pacr.es>",
        to: "pacres.g@gmail.com",
        subject: `Castle Combo — ${date}`,
        html: buildEmail(record),
      })
      .catch((err) => console.error("Resend error (registro castle-combo):", err));
  }

  return Response.json({ ok: true });
}
