// Imprime los contadores de uso de /farma de los últimos N días (hashes farma:metricas:*).
// Correr desde la raíz del repo:
//   npx tsx --env-file=.env.local scripts/farma-metricas.ts [días]         → lee -dev
//   npx tsx --env-file=.env.local scripts/farma-metricas.ts --prod [días]  → lee producción
// Por defecto 14 días de -dev. Tabla: una fila por métrica, una columna por día (Madrid).
import redis from "../lib/redis";
import { leerMetricas } from "../lib/farma/metricas";

async function main(): Promise<void> {
  const prod = process.argv.includes("--prod");
  const dev = !prod; // dev por defecto; --prod lee las claves de prod
  const dias = Number(process.argv.find((a) => /^\d+$/.test(a))) || 14;

  // El agregado (rango de fechas Madrid, matriz campos×día, totales) lo comparte con
  // el panel farma-stats; aquí solo lo pintamos en ASCII.
  const { fechas, campos, conteos, totales, errorInventario } = await leerMetricas(dias, dev);

  console.log(`\nMétricas /farma · ${fechas[0]} → ${fechas[fechas.length - 1]} (${dev ? "-dev" : "prod"})\n`);

  if (campos.length === 0) {
    console.log(`Sin métricas en los últimos ${dias} días.`);
  } else {
    // Anchos: la etiqueta al ancho del campo más largo; cada día al de "DD" o su mayor conteo.
    const wLabel = Math.max(...campos.map((c) => c.length));
    const dd = fechas.map((f) => f.slice(8)); // día del mes
    const anchoDia = (i: number) => Math.max(2, ...campos.map((c) => String(conteos[c][i]).length));
    const wTotal = Math.max(1, ...campos.map((c) => String(totales[c]).length));

    const cabecera =
      " ".repeat(wLabel) + "  " +
      dd.map((d, i) => d.padStart(anchoDia(i))).join(" ") +
      "  │ " + "Σ".padStart(wTotal);
    console.log(cabecera);

    for (const campo of campos) {
      const celdas = fechas.map((_, i) => {
        const n = conteos[campo][i];
        return (n === 0 ? "·" : String(n)).padStart(anchoDia(i));
      });
      console.log(campo.padEnd(wLabel) + "  " + celdas.join(" ") + "  │ " + String(totales[campo]).padStart(wTotal));
    }
  }

  if (errorInventario) console.log(`\nÚltimo inventario rechazado: ${errorInventario}`);

  await redis.quit();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
