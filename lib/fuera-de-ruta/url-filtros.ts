// Filtros del explorador ↔ querystring, para que un explorador filtrado sea una URL
// compartible. Puro, sin React. Test: `npx tsx lib/fuera-de-ruta/url-filtros.test.ts`.
//
// Forma: los categóricos (multi) repiten clave —`?tipo=cascada&tipo=ibon`—; los
// umbrales y booleanos van una vez. Solo se escribe lo que filtra: sin filtros, la
// query queda vacía y la URL limpia.
//
// El parseo es defensivo (la URL no es de fiar) pero NO invalida el conjunto entero
// como hace `parsearEncargo`: aquí un valor raro se ignora y el resto de filtros
// sigue en pie. Un filtro de menos enseña más sitios; un encargo a medias monta un
// viaje falso.
import type { Desnivel, Filtros } from "./filtrar";

const MULTI = ["zona", "tipo", "dificultad", "epoca", "agua"] as const;
const BOOLEANOS = ["ninos", "perros", "bano", "parkingGratuito", "sinReserva"] as const;
const DESNIVELES: Desnivel[] = ["<150", "<300", "<500", "+500"];

export function filtrosAQuery(f: Filtros): string {
  const p = new URLSearchParams();
  for (const clave of MULTI) f[clave]?.forEach((v) => p.append(clave, v));
  if (f.distanciaMax !== undefined) p.set("distanciaMax", String(f.distanciaMax));
  if (f.duracionMax !== undefined) p.set("duracionMax", String(f.duracionMax));
  if (f.desnivel) p.set("desnivel", f.desnivel);
  for (const clave of BOOLEANOS) if (f[clave]) p.set(clave, "1");
  return p.toString();
}

export function queryAFiltros(p: URLSearchParams): Filtros {
  const f: Filtros = {};
  for (const clave of MULTI) {
    const v = p.getAll(clave).filter(Boolean);
    if (v.length) f[clave] = v;
  }
  const distanciaMax = numero(p.get("distanciaMax"));
  if (distanciaMax !== undefined) f.distanciaMax = distanciaMax;
  const duracionMax = numero(p.get("duracionMax"));
  if (duracionMax !== undefined) f.duracionMax = duracionMax;
  const desnivel = p.get("desnivel");
  if (desnivel && DESNIVELES.includes(desnivel as Desnivel)) f.desnivel = desnivel as Desnivel;
  for (const clave of BOOLEANOS) if (p.get(clave) === "1") f[clave] = true;
  return f;
}

// Umbral válido = número finito y positivo; cualquier otra cosa, sin tope.
function numero(raw: string | null): number | undefined {
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}
