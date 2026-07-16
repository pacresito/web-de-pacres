// Motor de recomendación de dos fases (briefing §4). API: recomendar(). Las dos fases
// NUNCA se mezclan —primero se elimina por incompatibilidad objetiva, luego se puntúa y
// ordena el resto—; por eso viven en archivos separados. Lógica pura, IA cero.
// Test: `npx tsx lib/fuera-de-ruta/motor/*.test.ts`.
import type { Destino } from "../tipos";
import { eliminar } from "./eliminar";
import { puntuar } from "./puntuar";
import { PESOS, type Pesos } from "./pesos";
import type { Perfil, ResultadoMotor } from "./tipos";

export function recomendar(destinos: Destino[], perfil: Perfil, pesos: Pesos = PESOS): ResultadoMotor {
  const { candidatas, eliminadas } = eliminar(destinos, perfil);
  return { candidatas: puntuar(candidatas, perfil, pesos), eliminadas };
}
