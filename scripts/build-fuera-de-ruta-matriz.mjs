// Genera data/fuera-de-ruta/matriz-<comunidad>.json: la matriz de tiempos (segundos) y
// distancias (metros) de coche entre todos los destinos con GPS, con el endpoint /table
// del OSRM público. Runtime del planificador y del panel «Mi viaje» = lookup en este
// dato, sin red. Al añadir o mover destinos, regenerar.
// Uso: `node scripts/build-fuera-de-ruta-matriz.mjs [comunidad]` (por defecto navarra).
import fs from "node:fs";

const comunidad = process.argv[2] || "navarra";
const ENTRADA = new URL(`../data/fuera-de-ruta/${comunidad}.json`, import.meta.url);
const SALIDA = new URL(`../data/fuera-de-ruta/matriz-${comunidad}.json`, import.meta.url);
const OSRM = "https://router.project-osrm.org/table/v1/driving/";

const datos = JSON.parse(fs.readFileSync(ENTRADA, "utf8"));
// Solo destinos con GPS; los restaurantes van por zona (sin coordenada) y no entran.
const puntos = datos.destinos.filter((d) => Array.isArray(d.gps));
if (!puntos.length) throw new Error(`Sin destinos con GPS en ${comunidad}.json`);

const ids = puntos.map((d) => d.slug);
// OSRM espera lon,lat; nuestro gps es [lat, lon].
const coords = puntos.map((d) => `${d.gps[1]},${d.gps[0]}`).join(";");

const res = await fetch(`${OSRM}${coords}?annotations=duration,distance`);
if (!res.ok) throw new Error(`OSRM ${res.status}: ${await res.text()}`);
const { durations, distances } = await res.json();
if (!durations || !distances) throw new Error("OSRM no devolvió duraciones y distancias");

const segundos = durations.map((fila) => fila.map((s) => Math.round(s)));
const metros = distances.map((fila) => fila.map((m) => Math.round(m)));
fs.writeFileSync(SALIDA, JSON.stringify({ comunidad, ids, segundos, metros }) + "\n");
console.log(`OK matriz-${comunidad}.json | ${ids.length} destinos | ${ids.length * ids.length} pares`);
