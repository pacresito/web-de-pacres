// Fase 1 del motor (briefing §4A): elimina SOLO por incompatibilidad objetiva. Una
// preferencia no marcada como imprescindible NUNCA llega aquí (esa es la Fase 2). Y
// "ausente = no consta", no "no": solo elimina la incompatibilidad EXPLÍCITA
// (carrito===false), jamás el dato que falta — así ninguna preferencia vacía el resultado.
import type { Destino } from "../tipos";
import type { Acceso, Eliminada, Perfil } from "./tipos";

const ACCESOS: Acceso[] = ["asfalto", "pista buena", "pista"];  // de mejor a peor

// Motivo de incompatibilidad, o null si el destino es compatible con el perfil.
function incompatibilidad(d: Destino, p: Perfil): string | null {
  if (p.zonas?.length && !p.zonas.includes(d.zona)) return "fuera de las zonas elegidas";
  if (p.carritoImprescindible && d.carrito === false) return "no es apta para carrito";
  if (p.conPerro && d.perros === false) return "no admite perros";
  if (p.conVertigo && d.vertigo === true) return "tiene pasos con vértigo";
  if (p.edadMinNino !== undefined && d.edadMinima !== undefined && d.edadMinima > p.edadMinNino)
    return `edad mínima ${d.edadMinima} años`;
  if (p.accesoMax && d.accesoCarretera && ACCESOS.indexOf(d.accesoCarretera) > ACCESOS.indexOf(p.accesoMax))
    return `acceso por ${d.accesoCarretera}`;
  return null;
}

export function eliminar(
  destinos: Destino[],
  p: Perfil,
): { candidatas: Destino[]; eliminadas: Eliminada[] } {
  const candidatas: Destino[] = [];
  const eliminadas: Eliminada[] = [];
  for (const d of destinos) {
    const motivo = incompatibilidad(d, p);
    if (motivo) eliminadas.push({ destino: d, motivo });
    else candidatas.push(d);
  }
  return { candidatas, eliminadas };
}
