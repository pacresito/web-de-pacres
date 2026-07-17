// Ritmo y comida del flujo "Crear mi viaje": los dos ejes del encargo que fijan el
// presupuesto de tiempo del día (ver presupuesto.ts).
export type Ritmo = "relajado" | "medio" | "activo";
// da-igual = restaurante si hay en la zona, picnic si no (lo resuelve el motor por día).
export type Comida = "restaurante" | "picnic" | "da-igual" | "solo-cena";
