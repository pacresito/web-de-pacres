// Serialización del "encargo" de Crear mi viaje a la URL (Compartir, sin backend):
// todo lo que define un plan cabe en un querystring `?plan=`, y al abrirlo se
// reproduce el mismo encargo. Puro. Test: `npx tsx lib/viajes/planificador/encargo.test.ts`.
import type { Filtros } from "../filtrar";
import type { Comida, Ritmo } from "./tipos";

export type Encargo = {
  dias: number;             // 1-15
  fecha: string;            // yyyy-mm-dd (la que interpreta el <input type="date">)
  ritmo: Ritmo;
  comida: Comida;
  imprescindibles: string[];
  filtros: Filtros;         // los heredados del explorador
};

const RITMOS: Ritmo[] = ["relajado", "medio", "activo"];
const COMIDAS: Comida[] = ["restaurante", "picnic", "da-igual", "solo-cena"];

export function serializarEncargo(e: Encargo): string {
  return encodeURIComponent(JSON.stringify(e));
}

// Parseo defensivo: el valor viene de la URL (no confiable). Cualquier campo con
// forma inesperada invalida el encargo entero (devuelve null) en vez de arriesgar
// un estado a medias; los filtros solo se aceptan como objeto (filtrar.ts ya es
// tolerante con valores raros dentro).
export function parsearEncargo(raw: string | null): Encargo | null {
  if (!raw) return null;
  try {
    const o = JSON.parse(decodeURIComponent(raw)) as Record<string, unknown>;
    if (!o || typeof o !== "object") return null;
    const dias = Number(o.dias);
    if (!Number.isInteger(dias) || dias < 1 || dias > 15) return null;
    if (typeof o.fecha !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(o.fecha)) return null;
    if (!RITMOS.includes(o.ritmo as Ritmo)) return null;
    if (!COMIDAS.includes(o.comida as Comida)) return null;
    const imprescindibles = Array.isArray(o.imprescindibles)
      ? o.imprescindibles.filter((s): s is string => typeof s === "string")
      : [];
    const filtros = (o.filtros && typeof o.filtros === "object") ? (o.filtros as Filtros) : {};
    return { dias, fecha: o.fecha, ritmo: o.ritmo as Ritmo, comida: o.comida as Comida, imprescindibles, filtros };
  } catch {
    return null;
  }
}
