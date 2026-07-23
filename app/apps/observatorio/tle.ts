// Elementos orbitales (TLE) de Celestrak: público, gratuito y sin API key.
// Se refrescan cada 6 h — los TLE se publican un par de veces al día y su precisión
// se degrada en días, no en horas.
import type { Satelite } from "./engine";

const CACHE_SEGUNDOS = 6 * 60 * 60;
// Celestrak entra en el prerender: sin tope, una petición colgada cuelga el build entero.
const TIMEOUT_MS = 10_000;

/**
 * `magEstandar` es la magnitud a 1000 km con el disco medio iluminado, el valor de
 * referencia que publica Heavens-Above para cada objeto.
 */
const SEGUIDOS = [
  { nombre: "ISS", catnr: 25544, magEstandar: -1.8 },
  { nombre: "Tiangong", catnr: 48274, magEstandar: -0.8 },
];

async function cargarUno(sat: (typeof SEGUIDOS)[number]): Promise<Satelite | null> {
  const url = `https://celestrak.org/NORAD/elements/gp.php?CATNR=${sat.catnr}&FORMAT=tle`;
  const res = await fetch(url, {
    next: { revalidate: CACHE_SEGUNDOS },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) return null;

  const [, tle1, tle2] = (await res.text()).trim().split("\n").map((l) => l.trim());
  if (!tle1?.startsWith("1 ") || !tle2?.startsWith("2 ")) return null;
  return { nombre: sat.nombre, magEstandar: sat.magEstandar, tle1, tle2 };
}

/**
 * Los satélites que se siguen, con su TLE fresco. Si Celestrak no responde para alguno
 * se omite: la agenda sigue teniendo Luna y planetas, que no dependen de la red.
 */
export async function cargarSatelites(): Promise<Satelite[]> {
  const resultados = await Promise.allSettled(SEGUIDOS.map(cargarUno));
  return resultados
    .map((r) => (r.status === "fulfilled" ? r.value : null))
    .filter((s): s is Satelite => s !== null);
}
