// Presupuesto de tiempo del flujo "Crear mi viaje": minutos activos objetivo por día
// según ritmo, y minutos de comida y de visita por defecto. Los comparten el motor de
// itinerario (itinerario/) y el panel «Mi viaje» (viaje/) para que sus estimaciones no
// se contradigan (uno diría "cabe" y el otro no). Lógica pura, IA cero.
import type { Destino } from "../tipos";
import type { Comida, Ritmo } from "./tipos";

export const RITMO_MIN: Record<Ritmo, number> = { relajado: 300, medio: 420, activo: 540 };
// "da-igual" reserva como picnic en el presupuesto global; por día se resuelve a
// restaurante (90) si la zona tiene, o picnic si no.
export const COMIDA_MIN: Record<Comida, number> = { restaurante: 90, picnic: 30, "da-igual": 30, "solo-cena": 0 };
export const VISITA_DEFECTO = 90;   // minutos si el destino no trae duracionHoras
export const visitaMin = (d: Destino) => (d.duracionHoras ? Math.round(((d.duracionHoras[0] + d.duracionHoras[1]) / 2) * 60) : VISITA_DEFECTO);
