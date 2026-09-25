// Filtros del explorador ↔ querystring. Los multi repiten clave (`?tipo=a&tipo=b`).
// Un valor inválido se ignora sin tumbar el resto: un filtro de menos solo enseña más sitios.
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

function numero(raw: string | null): number | undefined {
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}
