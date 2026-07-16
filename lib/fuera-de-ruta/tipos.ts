// Formas de datos de /fuera-de-ruta. Fuente: data/fuera-de-ruta/<comunidad>.json.
// Los campos opcionales pueden faltar en el JSON; la UI solo pinta lo que hay.
// Los campos `*Horas`/`epoca`/`agua`/`tipoViaje` numéricos o en array son la
// versión filtrable; `duracion`/`mejorEpoca` de texto se conservan para mostrar.

export type Rango = [number, number];

export type Destino = {
  slug: string;
  nombre: string;
  zona: string;        // id de zona
  tipo: string;        // ruta | cascada | pueblo | mirador | cueva | parque | monumento | alojamiento | actividad
  actividad?: string;  // solo si tipo="actividad": tirolina, teleférico, balneario, kayak…
  favoritoDeCris?: boolean;       // sticker "favorito de Cris" (solo si presente)
  precio?: string;                // libre: "gratis · parking 3 €", "entrada 5,50 €" (dato de ficha, no filtro)
  queEs: string;
  gps?: [number, number];         // el GPS es el parking (así lo trae la fuente), no el punto de interés
  gpsAprox?: boolean;  // coordenada aproximada (centro de pueblo, parking sin fijar)
  distanciaKm?: Rango;
  desnivelM?: Rango;
  duracion?: string;              // texto para mostrar ("2 a 3 horas")
  duracionHoras?: Rango;          // versión numérica [min, max] para filtrar
  dificultad?: string;
  circular?: boolean;
  bano?: boolean;
  agua?: string[];                // ibon | cascada | rio | poza | embalse
  ninos?: boolean;
  perros?: boolean;
  tipoViaje?: string[];           // pareja | amigos (niños y perros ya son booleanos)
  senalizacion?: string;          // muy buena | buena | GPS recomendable | track recomendable
  parkingGratuito?: boolean;
  reserva?: string;
  mejorEpoca?: string;            // texto para mostrar
  epoca?: string[];               // primavera | verano | otono | invierno, para filtrar
  queVer?: string[];
  loMejor?: string[];             // 3-5 puntos fuertes (✅)
  antesDeIr?: string[];           // avisos útiles (⚠)
  cerca?: string[];               // slugs de destinos cercanos (3-4 máx)
  pueblosAlojamiento?: string[];  // pueblos donde alojarse, no hoteles
  trackWikiloc?: string;          // URL de la ruta en Wikiloc
  nota?: string;
  imagen?: string;                // foto principal (opcional; sin foto → fallback "foto en camino")
  imagenes?: string[];            // galería (hoy 1; la ficha usa esta si existe, si no [imagen])
};

export type Restaurante = {
  nombre: string;
  zona: string;
  categoria?: string;  // economico | calidad-precio | especial (la ficha muestra máx. 3, uno por categoría)
  gps?: [number, number];  // solo para el pin del explorador; la lógica de ficha/planificador sigue por zona
  reserva?: boolean;   // chip "mejor reservar" (solo si presente)
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
