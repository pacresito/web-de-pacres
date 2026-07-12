// Formas del planificador "Crear mi viaje" (Fase E). Un Plan es una lista de
// Propuestas; cada Propuesta reparte los destinos candidatos en Días, y cada Día
// es una secuencia ordenada de Paradas. Todo lo genera planificar.ts (determinista).
import type { Filtros } from "../filtrar";
import type { DatosViajes } from "../tipos";
import type { MatrizViajes } from "./geo";

export type Ritmo = "relajado" | "medio" | "activo";
// da-igual = restaurante si hay en la zona, picnic si no (lo resuelve el motor por día).
export type Comida = "restaurante" | "picnic" | "da-igual" | "solo-cena";

export type PlanInput = {
  datos: DatosViajes;        // destinos, restaurantes y zonas de la comunidad
  matriz: MatrizViajes;      // tiempos de coche precalculados (OSRM)
  filtros: Filtros;          // incluye las zonas elegidas en el mapa (dimensión `zona`)
  dias: number;              // 1-15
  ritmo: Ritmo;              // fija las horas activas objetivo por día
  comida: Comida;            // fija el bloque de comida del mediodía
  fecha: Date;               // determina las horas de luz
  imprescindibles?: string[]; // slugs que el usuario marca como prioritarios
};

export type Parada = {
  slug: string;
  nombre: string;
  tipo: string;
  visitaMin: number;          // minutos de visita (de duracionHoras)
  cocheDesdeAnterior: number; // minutos de coche desde la parada anterior (0 la primera)
  horaInicio: number;         // minutos desde la medianoche local en que arranca la visita
};

// Candidato que no cupo en los días pedidos, con el motivo humano del descarte.
export type Descarte = {
  slug: string;
  motivo: string;                 // por qué no encajó (derivado de lo que calcula el motor)
  enPropuesta?: "A" | "B" | "C";  // otra propuesta que sí lo coloca, si existe
};

export type Dia = {
  numero: number;
  zona: string;               // zona dominante del día
  paradas: Parada[];
  restaurante?: string;       // restaurante del mediodía, si comida="restaurante" y hay en la zona
  comidaHoraInicio?: number;  // minutos desde medianoche en que se intercala la comida (si se programó)
  minutosActivos: number;     // visitas + coche + comida
  minutosLuz: number;         // ventana de luz del día en esa zona y fecha
  avisos: string[];
};

export type Propuesta = {
  id: "A" | "B" | "C";
  nombre: string;             // Equilibrada | Mínimo coche | Imprescindibles
  dias: Dia[];
  sinEncajar: Descarte[];     // candidatos que no cupieron, con motivo humano
  cocheTotalMin: number;      // suma del coche intra-día de todos los días
  avisos: string[];
};
