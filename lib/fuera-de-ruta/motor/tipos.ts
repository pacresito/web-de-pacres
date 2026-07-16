// Formas del motor de recomendación de dos fases (briefing §4). El Perfil lo rellena
// el cuestionario (Fase C); el motor lo lee sin interpretar texto libre. Todo opcional:
// no marcar algo NUNCA elimina (regla transversal §11), solo deja de sumar puntos. Solo
// las compatibilidades marcadas como imprescindibles y la zona eliminan destinos.
import type { Destino } from "../tipos";

export type Acceso = "asfalto" | "pista buena" | "pista";

export type Perfil = {
  // --- Compatibilidad → fase de eliminación (solo estos campos eliminan) ---
  zonas?: string[];                 // zonas elegidas en el mapa; fuera de ellas se elimina
  carritoImprescindible?: boolean;  // elimina destinos marcados NO aptos para carrito
  conPerro?: boolean;               // elimina destinos marcados NO aptos para perros
  conVertigo?: boolean;             // elimina destinos con vértigo declarado
  edadMinNino?: number;             // edad del menor del grupo; elimina si edadMinima es mayor
  accesoMax?: Acceso;               // peor acceso rodado que el grupo acepta; elimina los peores
  // Movilidad reducida (briefing §4A) no entra aún: no hay campo en los datos que la
  // sostenga sin inventar. Cuando exista, se añade aquí como otra incompatibilidad.

  // --- Preferencias → fase de puntuación (nunca eliminan, solo ordenan) ---
  paisajes?: string[];              // paisajes que gustan
  experiencias?: string[];          // tipos de experiencia buscados (prioridades, máx 5)
  tipos?: string[];                 // tipos de destino preferidos (cascada, pueblo…)
  dificultades?: string[];          // niveles de dificultad cómodos
  epoca?: string[];                 // épocas del viaje
  quiereBano?: boolean;             // suma a los destinos con baño
  imprescindibles?: string[];       // slugs que el usuario marca como prioritarios
};

// Un destino que sobrevive a la eliminación, con su puntuación de afinidad (interna,
// no visible por defecto — §11). `motivos` es para depurar y para futuras explicaciones.
export type Candidata = {
  destino: Destino;
  puntos: number;
  motivos: string[];
};

// Un destino eliminado por incompatibilidad objetiva, con su motivo humano.
export type Eliminada = {
  destino: Destino;
  motivo: string;
};

export type ResultadoMotor = {
  candidatas: Candidata[];  // ordenadas por afinidad desc (la puntuación ordena, nunca elimina)
  eliminadas: Eliminada[];  // solo incompatibilidades objetivas
};
