import { Resend } from "resend";
import redis from "@/lib/redis";

const KEY =
  process.env.NODE_ENV === "development"
    ? "registro:agricola-dev"
    : "registro:agricola";

const PASSWORD = "***REMOVED***";
const PAGE_SIZE = 20;

const PLAYERS = ["Lucas", "Pablo"];

type Animal = "sheep" | "pig" | "cow" | "horse";
const ANIMALS: Animal[] = ["sheep", "pig", "cow", "horse"];
const ANIMAL_LABELS: Record<Animal, string> = {
  sheep: "Ovejas 🐑",
  pig: "Cerdos 🐷",
  cow: "Vacas 🐄",
  horse: "Caballos 🐴",
};

function calcTablePts(count: number, animal: Animal): number {
  if (count <= 3) return -3;
  const base3: Record<Animal, number> = { sheep: 13, pig: 11, cow: 10, horse: 9 };
  if (count >= base3[animal]) return 3 + (count - base3[animal]);
  const ranges: Record<Animal, [number, number][]> = {
    sheep: [[4, 7], [8, 10], [11, 12]],
    pig:   [[4, 6], [7, 8],  [9, 10]],
    cow:   [[4, 5], [6, 7],  [8, 9]],
    horse: [[4, 4], [5, 6],  [7, 8]],
  };
  for (let pts = 0; pts <= 2; pts++) {
    const [lo, hi] = ranges[animal][pts];
    if (count >= lo && count <= hi) return pts;
  }
  return 0;
}

function getDerived(inputs: number[]) {
  const counts = inputs.slice(0, 4);
  const tablePts = ANIMALS.map((a, i) => calcTablePts(counts[i], a));
  const sigma1 = counts.reduce((a, b) => a + b, 0);
  const sigma2 = tablePts.reduce((a, b) => a + b, 0);
  const terrain = inputs[4];
  const buildings = inputs[5];
  const final = sigma1 + sigma2 + terrain + buildings;
  return { counts, tablePts, sigma1, sigma2, terrain, buildings, final };
}

function buildEmail(record: {
  date: string;
  players: string[];
  inputs: number[][];
  finals: number[];
  winner: string;
}) {
  const { date, players, inputs, finals, winner } = record;
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

  const headerCols = players
    .map(
      (p) =>
        `<th style="padding:10px 14px;text-align:center;color:${C.cream};background:${C.amber};border-left:1px solid rgba(255,255,255,0.12);">${p}</th>`
    )
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
    else if (row.kind === "bonus") label = `!${row.label.split(" ")[1] ?? ""}`;
    else if (row.kind === "terrains") label = "🌿 Terreno";
    else if (row.kind === "buildings") label = "🏠 Edificios";
    else if (row.kind === "final") label = "Σ Total";

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
    <p style="text-align:center;margin-top:16px;font-weight:bold;color:${C.cream};background:${C.amber};padding:10px;border-radius:8px;">🏆 ${winner} · ${players.map((p, i) => `${p}: ${finals[i]}`).join(" · ")}</p>
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
  const { password, date, players, inputs, finals, winner } = body;

  if (password !== PASSWORD) {
    return Response.json({ error: "Clave incorrecta" }, { status: 401 });
  }
  if (!date || !players || !inputs || !finals || !winner) {
    return Response.json({ error: "Datos incompletos" }, { status: 400 });
  }

  const record = { date, players, inputs, finals, winner };
  await redis.lpush(KEY, JSON.stringify(record));

  if (process.env.NODE_ENV !== "development") {
    const resend = new Resend(process.env.RESEND_API_KEY);
    resend.emails
      .send({
        from: "Web de Pacres <hola@pacr.es>",
        to: "pacres.g@gmail.com",
        subject: `Agrícola — ${date}`,
        html: buildEmail(record),
      })
      .catch((err) => console.error("Resend error (registro agricola):", err));
  }

  return Response.json({ ok: true });
}
