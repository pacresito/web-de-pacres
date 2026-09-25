// Presupuesto de tiempo de «Crear mi viaje». Lo comparten el panel «Mi viaje» y el
// itinerario para que no se contradigan: si uno dice que cabe, el otro también.
import type { Comida, Destino, Ritmo } from "./tipos";

// Minutos activos por día según el ritmo.
export const RITMO_MIN: Record<Ritmo, number> = { relajado: 300, medio: 420, activo: 540 };
// "da-igual" cuenta como picnic; por día se resuelve a restaurante si la zona tiene.
export const COMIDA_MIN: Record<Comida, number> = { restaurante: 90, picnic: 30, "da-igual": 30, "solo-cena": 0 };
const VISITA_DEFECTO = 90;

// Estancia según el ritmo: activo tira al mínimo, relajado al ideal, medio al punto medio.
// Sin estancias en el dato, cae a los extremos de `duracionHoras`.
export function estanciaPorRitmo(d: Destino, ritmo: Ritmo): number {
  const min = d.estanciaMin ?? (d.duracionHoras ? Math.round(d.duracionHoras[0] * 60) : VISITA_DEFECTO);
  const ideal = d.estanciaIdeal ?? (d.duracionHoras ? Math.round(d.duracionHoras[1] * 60) : min);
  if (ritmo === "activo") return min;
  if (ritmo === "relajado") return ideal;
  return Math.round((min + ideal) / 2);
}
