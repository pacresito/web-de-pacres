// Pesos de la fase 2: cambian el ORDEN del listado, nunca qué destinos aparecen.
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
  imprescindible: 20,  // domina sobre cualquier suma de afinidades
  favoritoDeCris: 1,
};
