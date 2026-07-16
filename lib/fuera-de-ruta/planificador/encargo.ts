// Serialización del "encargo" de Crear mi viaje a la URL (Compartir y Mis viajes, sin
// backend): todo lo que define un plan cabe en la query, y al abrirla se reproduce el
// mismo encargo. Puro. Test: `npx tsx lib/fuera-de-ruta/planificador/encargo.test.ts`.
//
// **Query plana, un solo lenguaje con el explorador** (`?dias=3&ritmo=medio&zona=…`):
// los filtros los pone `url-filtros.ts`, el mismo que sirve `/sitios`. Antes era el
// JSON del encargo metido en `?plan=`, y como el JSON es casi todo puntuación salía
// escapado (`%7B%22dias%22…`): ilegible y el doble de largo.
import type { Filtros } from "../filtrar";
import { filtrosAQuery, queryAFiltros } from "../url-filtros";
import type { Comida, Propuesta, Ritmo } from "./tipos";

export type Encargo = {
  dias: number;             // 1-15
  fecha: string;            // yyyy-mm-dd (la que interpreta el <input type="date">)
  ritmo: Ritmo;
  comida: Comida;
  imprescindibles: string[];
  filtros: Filtros;         // los heredados del explorador
  propuesta?: Propuesta["id"]; // la elegida (A/B/C); ausente = la primera
};

const RITMOS: Ritmo[] = ["relajado", "medio", "activo"];
const COMIDAS: Comida[] = ["restaurante", "picnic", "da-igual", "solo-cena"];
const IDS: Propuesta["id"][] = ["A", "B", "C"];

// Devuelve la query sin el "?": quien la use decide dónde la pega.
export function serializarEncargo(e: Encargo): string {
  const p = new URLSearchParams();
  p.set("dias", String(e.dias));
  p.set("fecha", e.fecha);
  p.set("ritmo", e.ritmo);
  p.set("comida", e.comida);
  for (const slug of e.imprescindibles) p.append("imp", slug);
  if (e.propuesta) p.set("propuesta", e.propuesta);
  return [p.toString(), filtrosAQuery(e.filtros)].filter(Boolean).join("&");
}

// Un encargo es "lo que trae la query" solo si está entero: si falta o desentona
// cualquier campo, `validarEncargo` devuelve null y el planificador arranca en el
// formulario con los filtros que hubiera. Por eso no hace falta una clave centinela
// como el viejo `?plan=` — la propia query responde si hay plan o solo filtros.
export function parsearEncargo(p: URLSearchParams): Encargo | null {
  return validarEncargo({
    dias: p.get("dias"),
    fecha: p.get("fecha"),
    ritmo: p.get("ritmo"),
    comida: p.get("comida"),
    imprescindibles: p.getAll("imp"),
    filtros: queryAFiltros(p),
    propuesta: p.get("propuesta") ?? undefined,
  });
}

// Validación defensiva: el valor viene de fuera (la URL, o el localStorage de
// `guardados.ts`). Cualquier campo con forma inesperada invalida el encargo entero
// (devuelve null) en vez de arriesgar un estado a medias; los filtros solo se
// aceptan como objeto (filtrar.ts ya es tolerante con valores raros dentro).
export function validarEncargo(valor: unknown): Encargo | null {
  try {
    const o = valor as Record<string, unknown>;
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
    // La propuesta es opcional: un enlace de antes de que se guardara no la lleva, y
    // una basura tampoco invalida el plan entero — se cae a la primera. Sin ella, la
    // clave no se pone: un encargo sin propuesta vuelve del round-trip idéntico.
    const propuesta = IDS.includes(o.propuesta as Propuesta["id"]) ? (o.propuesta as Propuesta["id"]) : undefined;
    return { dias, fecha: o.fecha, ritmo: o.ritmo as Ritmo, comida: o.comida as Comida, imprescindibles, filtros, ...(propuesta && { propuesta }) };
  } catch {
    return null;
  }
}
