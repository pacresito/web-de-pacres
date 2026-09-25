// Motor de recomendación en dos fases que nunca se mezclan: primero elimina por
// incompatibilidad objetiva, luego puntúa y ordena lo que queda.
import type { Destino } from "../tipos";
import { eliminar } from "./eliminar";
import { puntuar } from "./puntuar";
import type { Perfil, ResultadoMotor } from "./tipos";

export function recomendar(destinos: Destino[], perfil: Perfil): ResultadoMotor {
  const { candidatas, eliminadas } = eliminar(destinos, perfil);
  return { candidatas: puntuar(candidatas, perfil), eliminadas };
}
