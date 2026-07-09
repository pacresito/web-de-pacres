// Formas de datos de /viajes. Fuente: data/viajes/<comunidad>.json.
// Los campos opcionales pueden faltar en el JSON; la UI solo pinta lo que hay.

export type Rango = [number, number];

export type Destino = {
  slug: string;
  nombre: string;
  zona: string;        // id de zona
  tipo: string;        // ruta | cascada | pueblo | mirador | cueva | parque | monumento | alojamiento
  queEs: string;
  gps?: [number, number];
  gpsAprox?: boolean;  // coordenada aproximada (centro de pueblo, parking sin fijar)
  distanciaKm?: Rango;
  desnivelM?: Rango;
  duracion?: string;
  dificultad?: string;
  circular?: boolean;
  bano?: boolean;
  ninos?: boolean;
  perros?: boolean;
  senalizacion?: string;
  reserva?: string;
  mejorEpoca?: string;
  queVer?: string[];
  nota?: string;
  imagen: string;
};

export type Restaurante = {
  nombre: string;
  zona: string;
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
