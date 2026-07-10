// Genera data/viajes/matriz-<comunidad>.json: la matriz de tiempos de coche (segundos)
// entre todos los destinos con GPS, con el endpoint /table del OSRM público. Runtime
// del planificador = lookup en este dato, sin red. Al añadir o mover destinos, regenerar.
// Uso: `node scripts/build-viajes-matriz.mjs [comunidad]` (por defecto navarra).
import fs from "node:fs";

const comunidad = process.argv[2] || "navarra";
const ENTRADA = new URL(`../data/viajes/${comunidad}.json`, import.meta.url);
const SALIDA = new URL(`../data/viajes/matriz-${comunidad}.json`, import.meta.url);
const OSRM = "https://router.project-osrm.org/table/v1/driving/";

const datos = JSON.parse(fs.readFileSync(ENTRADA, "utf8"));
// Solo destinos con GPS; los restaurantes van por zona (sin coordenada) y no entran.
const puntos = datos.destinos.filter((d) => Array.isArray(d.gps));
if (!puntos.length) throw new Error(`Sin destinos con GPS en ${comunidad}.json`);

const ids = puntos.map((d) => d.slug);
// OSRM espera lon,lat; nuestro gps es [lat, lon].
const coords = puntos.map((d) => `${d.gps[1]},${d.gps[0]}`).join(";");

const res = await fetch(`${OSRM}${coords}?annotations=duration`);
if (!res.ok) throw new Error(`OSRM ${res.status}: ${await res.text()}`);
const { durations } = await res.json();
if (!durations) throw new Error("OSRM no devolvió la matriz de duraciones");

const segundos = durations.map((fila) => fila.map((s) => Math.round(s)));
fs.writeFileSync(SALIDA, JSON.stringify({ comunidad, ids, segundos }) + "\n");
console.log(`OK matriz-${comunidad}.json | ${ids.length} destinos | ${ids.length * ids.length} pares`);
