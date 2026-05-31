import { handleRegistroGet, handleRegistroPost } from "@/lib/registro";

const KEY =
  process.env.NODE_ENV === "development"
    ? "registro:castle-combo-dev"
    : "registro:castle-combo";

const POSITIONS = [
  "↖️", "⬆️", "↗️",
  "⬅️", "⏺️", "➡️",
  "↙️", "⬇️", "↘️",
  "🗝️",
];

interface CastleRecord {
  date: string;
  players: string[];
  scores: number[][];
  totals: number[];
  winner: string;
}

type CastlePayload = CastleRecord & { password?: unknown };

function buildEmailHtml(record: CastleRecord) {
  const { date, players, scores, totals, winner } = record;

  const isEmpate = winner === "Empate";
  const headerCols = players
    .map((p) => {
      const hl = !isEmpate && p === winner;
      return `<th style="padding:10px 14px;text-align:center;color:#fff;background:${hl ? "#fbbf24" : "#78b5d0"};border-left:1px solid rgba(0,0,0,0.2);">${p}</th>`;
    })
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
    .map((t, i) => {
      const hl = !isEmpate && players[i] === winner;
      return `<td style="padding:12px 14px;text-align:center;font-size:18px;font-weight:bold;color:${hl ? "#fef08a" : "#fff"};border-left:1px solid rgba(0,0,0,0.2);">${t}</td>`;
    })
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
    <p style="text-align:center;margin-top:16px;font-weight:bold;color:#fff;background:#fbbf24;padding:10px;border-radius:8px;">🏆 ${winner}</p>
  </div>
</body>
</html>`;
}

export async function GET(request: Request) {
  return handleRegistroGet(request, KEY);
}

export async function POST(request: Request) {
  return handleRegistroPost<CastlePayload, CastleRecord>(request, {
    key: KEY,
    ratePrefix: "ratelimit:registro:castle-combo:",
    requiredFields: ["date", "players", "scores", "totals", "winner"],
    buildRecord: ({ date, players, scores, totals, winner }) => ({ date, players, scores, totals, winner }),
    buildEmail: (record) => ({
      subject: `Castle Combo — ${record.date}`,
      html: buildEmailHtml(record),
      text: `Castle Combo — ${record.date}\n${record.players.map((p, i) => `${p}: ${record.totals[i]}`).join("  |  ")}\nGanador: ${record.winner}`,
    }),
  });
}
