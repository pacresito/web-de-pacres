// Formas de datos de /fuera-de-ruta. Fuente: data/fuera-de-ruta/<comunidad>.json.
// Los campos opcionales pueden faltar en el JSON; la UI solo pinta lo que hay.
// Los campos `*Horas`/`epoca`/`agua`/`tipoViaje` numéricos o en array son la
// versión filtrable; `duracion`/`mejorEpoca` de texto se conservan para mostrar.

export type Rango = [number, number];

// Un campo booleano de compatibilidad (carrito, vertigo) solo se rellena donde la
// pregunta se plantea de verdad: ausente = "no consta", no "no". La ficha pinta el
// dato que hay; la tarjeta, solo lo que distingue (los "no"). Campos externos que no
// se pueden confirmar sin inventar (horario, contacto, plazoReserva…) se dejan
// ausentes y se anotan en verificar-con-cris.md — nunca se rellenan a ojo.
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

  // Métricas físicas
  distanciaKm?: Rango;
  desnivelM?: Rango;
  duracion?: string;              // texto para mostrar ("2 a 3 horas")
  duracionHoras?: Rango;          // versión numérica [min, max] para filtrar
  dificultad?: string;
  recorrido?: "circular" | "ida-vuelta" | "lineal";  // tipo de recorrido (antes: `circular` booleano)
  terreno?: string;               // tipo de terreno ("sendero de tierra", "pasarelas de madera"…)

  // Compatibilidad (lo que puede eliminar un destino en el motor, si es imprescindible)
  carrito?: boolean;              // apta para carrito de bebé
  edadMinima?: number;            // edad mínima recomendada, en años
  vertigo?: boolean;              // pasarelas, cadenas o zonas expuestas
  accesoCarretera?: "asfalto" | "pista buena" | "pista";  // tipo de acceso rodado al parking
  bano?: boolean;
  agua?: string[];                // ibon | cascada | rio | poza | embalse
  ninos?: boolean;
  perros?: boolean;
  tipoViaje?: string[];           // pareja | amigos (niños y perros ya son booleanos)

  // Estancia (minutos): mínimo para disfrutarla y tiempo ideal; el motor lo modula por ritmo
  estanciaMin?: number;
  estanciaIdeal?: number;

  // Contexto temporal
  mejorEpoca?: string;            // texto para mostrar
  epoca?: string[];               // primavera | verano | otono | invierno, para filtrar
  mejorMomento?: string;          // mejor momento del día + justificación ("atardecer: el mirador mira al oeste")
  dependeDeLuz?: boolean;         // necesita luz natural (senderos, miradores) vs. nocturna (cuevas, cenas)
  horario?: string;               // horario de apertura, si aplica (teleférico, monumento)

  // Logística
  senalizacion?: string;          // muy buena | buena | GPS recomendable | track recomendable
  parkingGratuito?: boolean;
  reserva?: string;
  plazoReserva?: string;          // con cuánta antelación reservar ("2-3 días antes")
  contacto?: { web?: string; tel?: string; email?: string };  // enlace oficial / teléfono cuando exista

  // Etiquetas para el motor (uso interno; también las lee el explorador)
  paisaje?: string[];             // bosque | hayedo | alta montaña | cascada | ibon | rio | poza | barranco | desierto | valle…
  experiencia?: string[];         // senderismo | fotografia | gastronomia | historia | naturaleza | cultura…

  // Contenido
  queVer?: string[];
  loMejor?: string[];             // 3-5 puntos fuertes (✅)
  antesDeIr?: string[];           // avisos útiles (⚠)
  detalles?: string[];            // "detalles que marcan la diferencia": consejos y curiosidades de Cris
  material?: string[];            // material recomendable (calzado de montaña, linterna…)
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

// Ritmo y comida del flujo "Crear mi viaje": los dos ejes del encargo que fijan el
// presupuesto de tiempo del día (ver presupuesto.ts).
export type Ritmo = "relajado" | "medio" | "activo";
// da-igual = restaurante si hay en la zona, picnic si no (lo resuelve el motor por día).
export type Comida = "restaurante" | "picnic" | "da-igual" | "solo-cena";
