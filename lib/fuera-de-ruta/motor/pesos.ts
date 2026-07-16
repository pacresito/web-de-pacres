// Pesos del motor de puntuación (Fase B, briefing §4). Objeto de configuración: se
// ajusta aquí para re-ponderar el ORDEN del listado sin tocar la lógica del motor —y
// nunca cambia qué destinos aparecen, eso lo decide solo la fase de eliminación.
export type Pesos = {
  paisaje: number;         // por cada paisaje del destino que el usuario quiere
  experiencia: number;     // por cada experiencia que coincide
  tipo: number;            // si el tipo del destino está entre los preferidos
  dificultad: number;      // si la dificultad encaja con lo cómodo
  epoca: number;           // si la época del viaje entra en la del destino
  bano: number;            // si el usuario quiere baño y el destino lo tiene
  imprescindible: number;  // si el usuario marcó el destino como prioritario
  favoritoDeCris: number;  // empujón de curaduría
};

export const PESOS: Pesos = {
  paisaje: 3,
  experiencia: 3,
  tipo: 2,
  dificultad: 2,
  epoca: 1,
  bano: 2,
  imprescindible: 20,  // domina: lo que el usuario marca a mano manda sobre las afinidades
  favoritoDeCris: 1,
};
