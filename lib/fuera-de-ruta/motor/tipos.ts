// Formas del motor. Todo el Perfil es opcional: no marcar algo nunca elimina, solo deja
// de sumar puntos.
import type { Acceso, Destino } from "../tipos";

export type Perfil = {
  // Fase 1: solo estos campos eliminan
  zonas?: string[];
  carritoImprescindible?: boolean;
  conPerro?: boolean;
  conVertigo?: boolean;
  edadMinNino?: number;             // edad del menor del grupo
  accesoMax?: Acceso;               // peor acceso rodado que el grupo acepta

  // Fase 2: solo ordenan
  paisajes?: string[];
  experiencias?: string[];
  tipos?: string[];
  dificultades?: string[];
  epoca?: string[];
  quiereBano?: boolean;
  imprescindibles?: string[];       // slugs
};

export type Candidata = { destino: Destino; puntos: number };

export type Eliminada = { destino: Destino; motivo: string };

export type ResultadoMotor = {
  candidatas: Candidata[];  // por afinidad desc
  eliminadas: Eliminada[];
};
