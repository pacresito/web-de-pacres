import { handleRegistroGet, handleRegistroPost } from "@/lib/registro";
import {
  type Animal,
  ANIMALS,
  ANIMAL_LABELS,
  getDerived,
  computeFinals,
  computeWinner,
} from "@/lib/agricola";

const KEY =
  process.env.NODE_ENV === "development"
    ? "registro:agricola-dev"
    : "registro:agricola";

interface AgricolaRecord {
  date: string;
  players: string[];
  inputs: number[][];
  finals: number[];
  winner: string;
}

type AgricolaPayload = {
  date: string;
  players: string[];
  inputs: number[][];
  password?: unknown;
};

function buildEmailHtml(record: AgricolaRecord) {
  const { date, players, inputs, winner } = record;
  const derived = inputs.map((inp) => getDerived(inp));

  const C = {
    headerBg: "#3D2B1F",
    sigmaGreen: "#4A6741",
    sigmaLight: "#5C7A52",
    finalBg: "#2D1F14",
    parchA: "#F5E6C8",
    parchB: "#EDD9A3",
    parchIconA: "#E8D5A3",
    parchIconB: "#DFC88A",
    amber: "#C4832A",
    text: "#2C1810",
    cream: "#FFF8E7",
  };

  const isEmpate = winner === "Empate";
  const headerCols = players
    .map((p, pi) => {
      const hl = !isEmpate && p === winner;
      return `<th style="padding:10px 14px;text-align:center;color:${hl ? C.cream : "#e8d5b0"};background:${hl ? C.amber : "rgba(255,255,255,0.07)"};border-left:1px solid rgba(255,255,255,0.12);">${p}</th>`;
    })
    .join("");

  type RowSpec =
    | { kind: "animal"; animal: Animal; idx: number; label: string }
    | { kind: "sigma1" }
    | { kind: "bonus"; animal: Animal; idx: number; label: string }
    | { kind: "sigma2" }
    | { kind: "terrains" }
    | { kind: "buildings" }
    | { kind: "final" };

  const rows: RowSpec[] = [
    ...ANIMALS.map((a, i) => ({ kind: "animal" as const, animal: a, idx: i, label: ANIMAL_LABELS[a] })),
    { kind: "sigma1" },
    ...ANIMALS.map((a, i) => ({ kind: "bonus" as const, animal: a, idx: i, label: `! ${ANIMAL_LABELS[a]}` })),
    { kind: "sigma2" },
    { kind: "terrains" },
    { kind: "buildings" },
    { kind: "final" },
  ];

  const bodyRows = rows.map((row, rowIdx) => {
    const isFinal = row.kind === "final";
    const isSigma = row.kind === "sigma1" || row.kind === "sigma2" || isFinal;
    const even = rowIdx % 2 === 0;

    const rowBg = isFinal ? C.finalBg : isSigma ? C.sigmaGreen : even ? C.parchA : C.parchB;
    const iconBg = isFinal ? "rgba(255,255,255,0.08)" : isSigma ? C.sigmaLight : even ? C.parchIconA : C.parchIconB;
    const labelColor = isSigma ? C.cream : C.text;
    const borderTop = isSigma ? `border-top:2px solid ${isFinal ? C.amber : "rgba(255,255,255,0.25)"};` : "";

    let label = "Σ";
    if (row.kind === "animal") label = row.label;
    else if (row.kind === "bonus") label = row.label;
    else if (row.kind === "terrains") label = "🌿";
    else if (row.kind === "buildings") label = "🏠";

    const getVal = (pi: number): number | null => {
      const d = derived[pi];
      switch (row.kind) {
        case "animal":    return d.counts[row.idx];
        case "sigma1":    return d.sigma1;
        case "bonus":     return d.tablePts[row.idx];
        case "sigma2":    return d.sigma2;
        case "terrains":  return d.terrain;
        case "buildings": return d.buildings;
        case "final":     return d.final;
      }
    };

    const cells = players
      .map((_, pi) => {
        const val = getVal(pi);
        const color =
          val !== null
            ? isSigma
              ? C.cream
              : val < 0
              ? "#B91C1C"
              : C.text
            : "rgba(0,0,0,0.12)";
        return `<td style="padding:8px 14px;text-align:center;font-family:monospace;font-weight:bold;color:${color};border-left:1px solid rgba(0,0,0,0.12);">${val ?? ""}</td>`;
      })
      .join("");

    return `<tr style="background:${rowBg};${borderTop}">
      <td style="padding:8px 10px;text-align:center;background:${iconBg};font-size:11px;color:${labelColor};font-weight:bold;">${label}</td>
      ${cells}
    </tr>`;
  }).join("");

  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:24px;background:#FAF3E0;font-family:serif;">
  <div style="max-width:400px;margin:0 auto;">
    <h1 style="text-align:center;color:${C.headerBg};font-size:22px;margin:0 0 2px;letter-spacing:0.04em;">Agrícola</h1>
    <p style="text-align:center;color:${C.amber};font-size:13px;margin:0 0 20px;">All Creatures Big and Small · ${date}</p>
    <table style="width:100%;border-collapse:collapse;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.15);border:2px solid ${C.headerBg};">
      <thead>
        <tr style="background:${C.headerBg};border-bottom:3px solid ${C.amber};">
          <th style="padding:12px 10px;text-align:center;color:${C.amber};font-size:22px;">🌾</th>
          ${headerCols}
        </tr>
      </thead>
      <tbody>
        ${bodyRows}
      </tbody>
    </table>
    <p style="text-align:center;margin-top:16px;font-weight:bold;color:${C.cream};background:${C.amber};padding:10px;border-radius:8px;">🏆 ${winner}</p>
  </div>
</body>
</html>`;
}

export async function GET(request: Request) {
  return handleRegistroGet(request, KEY);
}

export async function POST(request: Request) {
  return handleRegistroPost<AgricolaPayload, AgricolaRecord>(request, {
    key: KEY,
    ratePrefix: "ratelimit:registro:agricola:",
    requiredFields: ["date", "players", "inputs"],
    // El servidor es la fuente única de finals y winner: los recalcula desde los
    // inputs en vez de confiar en los que manda el cliente.
    buildRecord: ({ date, players, inputs }) => {
      const finals = computeFinals(inputs);
      return { date, players, inputs, finals, winner: computeWinner(players, finals) };
    },
    buildEmail: (record) => ({
      subject: `Agrícola — ${record.date}`,
      html: buildEmailHtml(record),
      text: `Agrícola — ${record.date}\n${record.players.map((p, i) => `${p}: ${record.finals[i]}`).join("  |  ")}\nGanador: ${record.winner}`,
    }),
  });
}
