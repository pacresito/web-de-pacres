// Lee el histórico de PVP desde Redis (hash farma:pvp). Lo usa la página
// /farma/maria/pvp para pintar lo pendiente de reetiquetar. El diff y los tipos son
// puros y viven en `pvp.ts` (mismo patrón que pedidos.ts / pedidos-store.ts).
import redis from "@/lib/redis";
import { KEYS } from "./keys";
import type { BorradorEtiquetas, LineaPvp, RegistroPvp } from "./pvp";

// Artículos cuyo PVP cambió y siguen pendientes de reetiquetar, ordenados por
// denominación (es lo que María lee para localizarlos).
export async function cargarPvpPendientes(): Promise<LineaPvp[]> {
  const pvp = await redis.hgetall(KEYS.pvp());
  return Object.entries(pvp)
    .map(([codigo, v]) => ({ codigo, ...(JSON.parse(v) as RegistroPvp) }))
    .filter((r) => r.pending)
    .sort((a, b) => a.denominacion.localeCompare(b.denominacion, "es"));
}

// Borrador de etiquetado (tamaño/cantidad por línea + líneas manuales) que María dejó
// a medias: se persiste para que sobreviva a las recargas de la pantalla PVP.
export async function cargarBorradorEtiquetas(): Promise<BorradorEtiquetas> {
  const raw = await redis.get(KEYS.pvpEtiquetas());
  return raw ? (JSON.parse(raw) as BorradorEtiquetas) : { tamanos: {}, cantidades: {}, extras: [] };
}

export async function guardarBorradorEtiquetas(b: BorradorEtiquetas): Promise<void> {
  await redis.set(KEYS.pvpEtiquetas(), JSON.stringify(b));
}
