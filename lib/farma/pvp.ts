// Histórico de PVP por artículo (hash farma:pvp). Lo escribe la subida de
// inventario (diff contra el histórico, marca `pending` lo que cambió) y lo lee la
// pantalla PVP. La forma vive aquí para que productor y consumidor compartan tipo.
import redis from "@/lib/redis";
import { KEYS } from "./keys";

export interface RegistroPvp {
  denominacion: string;
  oldPrice: number; // PVP anterior (la línea base previa)
  newPrice: number; // PVP actual
  firstSeen: string; // fecha del informe en que apareció el newPrice
  lastSeen: string; // fecha del último informe en que se vio el artículo
  pending: boolean; // cambió y aún no se han reetiquetado
}

export interface LineaPvp extends RegistroPvp {
  codigo: string;
}

// Artículos cuyo PVP cambió y siguen pendientes de reetiquetar, ordenados por
// denominación (es lo que María lee para localizarlos).
export async function cargarPvpPendientes(): Promise<LineaPvp[]> {
  const pvp = await redis.hgetall(KEYS.pvp());
  return Object.entries(pvp)
    .map(([codigo, v]) => ({ codigo, ...(JSON.parse(v) as RegistroPvp) }))
    .filter((r) => r.pending)
    .sort((a, b) => a.denominacion.localeCompare(b.denominacion, "es"));
}
