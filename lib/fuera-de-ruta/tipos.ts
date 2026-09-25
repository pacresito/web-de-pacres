// Formas de data/fuera-de-ruta/<comunidad>.json. Todo campo opcional puede faltar y la
// UI pinta solo lo que hay. En los booleanos de compatibilidad, ausente = "no consta", no "no".

export type Rango = [number, number];

export type Acceso = "asfalto" | "pista buena" | "pista";  // de mejor a peor

export type Destino = {
  slug: string;
  nombre: string;
  zona: string;        // id de zona
  tipo: string;        // ruta | cascada | pueblo | mirador | cueva | parque | monumento | alojamiento | actividad
  actividad?: string;  // solo si tipo="actividad": tirolina, balneario, kayak…
  favoritoDeCris?: boolean;
  precio?: string;                // texto libre; dato de ficha, no filtro
  queEs: string;
  gps?: [number, number];         // el parking, no el punto de interés
  gpsAprox?: boolean;

  // Métricas físicas: los rangos filtran, los textos se muestran
  distanciaKm?: Rango;
  desnivelM?: Rango;
  duracion?: string;
  duracionHoras?: Rango;
  dificultad?: string;
  recorrido?: "circular" | "ida-vuelta" | "lineal";
  terreno?: string;

  // Compatibilidad: lo que el motor puede eliminar si el viajero lo marca imprescindible
  carrito?: boolean;
  edadMinima?: number;            // años
  vertigo?: boolean;
  accesoCarretera?: Acceso;
  bano?: boolean;
  agua?: string[];                // ibon | cascada | rio | poza | embalse
  ninos?: boolean;
  perros?: boolean;
  tipoViaje?: string[];           // pareja | amigos

  // Estancia en minutos; el motor la modula por ritmo
  estanciaMin?: number;
  estanciaIdeal?: number;

  // Contexto temporal
  mejorEpoca?: string;
  epoca?: string[];               // primavera | verano | otono | invierno
  mejorMomento?: string;
  dependeDeLuz?: boolean;         // false = se puede hacer de noche (cuevas, cenas)
  horario?: string;

  // Logística
  senalizacion?: string;          // muy buena | buena | GPS recomendable | track recomendable
  parkingGratuito?: boolean;
  reserva?: string;
  plazoReserva?: string;
  contacto?: { web?: string; tel?: string; email?: string };

  // Etiquetas del motor
  paisaje?: string[];
  experiencia?: string[];

  // Contenido
  queVer?: string[];
  loMejor?: string[];
  antesDeIr?: string[];
  detalles?: string[];
  material?: string[];
  cerca?: string[];               // slugs
  pueblosAlojamiento?: string[];  // localidades, ordenadas por cercanía
  trackWikiloc?: string;
  nota?: string;
  imagen?: string;
  imagenes?: string[];            // galería; si falta, la ficha usa [imagen]
};

export type Restaurante = {
  nombre: string;
  zona: string;
  categoria?: string;  // economico | calidad-precio | especial
  gps?: [number, number];
  reserva?: boolean;
  poblacion?: string;
  direccion?: string;
  telefono?: string;
  tipoComida?: string;
  precioMenu?: number;
  precioCarta?: Rango;
  platos?: string[];
  recomendadoTras?: string;
};

export type Zona = { id: string; nombre: string };

export type DatosViajes = {
  comunidad: string;
  zonas: Zona[];
  destinos: Destino[];
  restaurantes: Restaurante[];
};

export type Ritmo = "relajado" | "medio" | "activo";
// da-igual = restaurante si la zona tiene, picnic si no.
export type Comida = "restaurante" | "picnic" | "da-igual" | "solo-cena";
