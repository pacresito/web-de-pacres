// Imprime los contadores de uso de /farma de los últimos N días (hashes farma:metricas:*).
// Correr desde la raíz del repo:
//   npx tsx --env-file=.env.local scripts/farma-metricas.ts [días]         → lee -dev
//   npx tsx --env-file=.env.local scripts/farma-metricas.ts --prod [días]  → lee producción
// Por defecto 14 días de -dev. Tabla: una fila por métrica, una columna por día (Madrid).
import Redis from "ioredis";
import { KEYS } from "../lib/farma/keys";
import { fechaMadrid } from "../lib/farma/tiempo";

const DIA_MS = 24 * 60 * 60 * 1000;

async function main(): Promise<void> {
  const prod = process.argv.includes("--prod");
  const dev = !prod; // dev por defecto; --prod lee las claves de prod
  const dias = Number(process.argv.find((a) => /^\d+$/.test(a))) || 14;

  const url = process.env.REDIS_URL;
  if (!url) throw new Error("REDIS_URL no definida — usa --env-file=.env.local.");
  const redis = new Redis(url);

  // Fechas de más antigua a hoy (izquierda→derecha), en huso de Madrid.
  const hoy = Date.now();
  const fechas = Array.from({ length: dias }, (_, i) => fechaMadrid(hoy - (dias - 1 - i) * DIA_MS));
  const hashes = await redis.pipeline(fechas.map((f) => ["hgetall", KEYS.metricas(f, dev)])).exec();

  // Contadores por día ya numéricos, y campos presentes en el rango (orden alfabético
  // → agrupa por prefijo: busquedas, inventario, pedidos, pvp, stmin, visitas).
  const porDia = (hashes ?? []).map(([, h]) => (h as Record<string, string>) ?? {});
  const campos = [...new Set(porDia.flatMap((h) => Object.keys(h)))].sort();

  console.log(`\nMétricas /farma · ${fechas[0]} → ${fechas[fechas.length - 1]} (${dev ? "-dev" : "prod"})\n`);

  if (campos.length === 0) {
    console.log(`Sin métricas en los últimos ${dias} días.`);
  } else {
    const conteo = (i: number, campo: string): number => Number(porDia[i][campo] ?? 0);
    const total = (campo: string): number => fechas.reduce((s, _, i) => s + conteo(i, campo), 0);

    // Anchos: la etiqueta al ancho del campo más largo; cada día al de "DD" o su mayor conteo.
    const wLabel = Math.max(...campos.map((c) => c.length));
    const dd = fechas.map((f) => f.slice(8)); // día del mes
    const anchoDia = (i: number) => Math.max(2, ...campos.map((c) => String(conteo(i, c)).length));
    const wTotal = Math.max(1, ...campos.map((c) => String(total(c)).length));

    const cabecera =
      " ".repeat(wLabel) + "  " +
      dd.map((d, i) => d.padStart(anchoDia(i))).join(" ") +
      "  │ " + "Σ".padStart(wTotal);
    console.log(cabecera);

    for (const campo of campos) {
      const celdas = fechas.map((_, i) => {
        const n = conteo(i, campo);
        return (n === 0 ? "·" : String(n)).padStart(anchoDia(i));
      });
      console.log(campo.padEnd(wLabel) + "  " + celdas.join(" ") + "  │ " + String(total(campo)).padStart(wTotal));
    }
  }

  const err = await redis.get(KEYS.metricasErrorInventario(dev));
  if (err) console.log(`\nÚltimo inventario rechazado: ${err}`);

  await redis.quit();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
