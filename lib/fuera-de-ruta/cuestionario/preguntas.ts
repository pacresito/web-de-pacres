// Config del cuestionario "Crear mi viaje" (Fase C, spec de Cris cap. 2-3). Solo las
// preguntas que el motor puntúa hoy (decisión de Pablo): cada respuesta cambia el
// resultado. Dos bloques —el viajero (reutilizable, va a localStorage) y el viaje
// concreto (va a la URL)—. Ninguna pregunta es obligatoria; las condicionales
// (`visible`) aparecen solo cuando tienen sentido. Sin React: es dato, lo pinta la UI.

export type Campo =
  | "grupo" | "ninos" | "edades" | "carrito" | "perro" | "vertigo" | "carreteras"
  | "tiposRuta" | "paisajes" | "agua"          // ↑ bloque viajero
  | "dias" | "fecha" | "ritmo" | "prioridades" | "comida";  // bloque viaje

// Respuesta única = string; multi-selección = string[] (conjunto). Todo opcional.
export type Respuestas = Partial<Record<Campo, string | string[]>>;

export type Opcion = { valor: string; etiqueta: string };

export type Pregunta = {
  campo: Campo;
  titulo: string;
  ayuda?: string;                        // el 💡 de Cris, cuando aporta
  multi?: boolean;                       // default false (respuesta única)
  max?: number;                          // tope de la multi-selección
  control?: "fecha";                     // default: chips de opciones
  opciones?: Opcion[];                   // no aplica al control "fecha"
  visible?: (r: Respuestas) => boolean;  // condicional; ausente = siempre visible
};

export type Bloque = { id: "viajero" | "viaje"; titulo: string; intro: string; preguntas: Pregunta[] };

// --- Helpers de lectura tipada (la UI y el mapeo no tocan r[campo] a pelo) ---
export const uno = (r: Respuestas, c: Campo): string | undefined =>
  typeof r[c] === "string" ? (r[c] as string) : undefined;
export const varios = (r: Respuestas, c: Campo): string[] =>
  Array.isArray(r[c]) ? (r[c] as string[]) : [];

const esFamiliaConNinos = (r: Respuestas) => uno(r, "grupo") === "familia" && uno(r, "ninos") === "si";

export const BLOQUES: Bloque[] = [
  {
    id: "viajero",
    titulo: "Conociendo al viajero",
    intro:
      "Para prepararte el mejor viaje posible, primero queremos conoceros un poco. Nada es " +
      "obligatorio y muchas preguntas admiten varias respuestas: no buscamos la exacta, sino el " +
      "rango con el que estaríais cómodos. No marcar algo no lo descarta —solo deja de priorizarlo—; " +
      "solo quitamos actividades cuando hay una incompatibilidad clara.",
    preguntas: [
      {
        campo: "grupo",
        titulo: "¿Quién va a hacer este viaje?",
        opciones: [
          { valor: "solo", etiqueta: "Viajo solo" },
          { valor: "pareja", etiqueta: "En pareja" },
          { valor: "amigos", etiqueta: "Grupo de amigos" },
          { valor: "familia", etiqueta: "Familia" },
          { valor: "otro", etiqueta: "Otro" },
        ],
      },
      {
        campo: "ninos",
        titulo: "¿Viajáis con niños?",
        visible: (r) => uno(r, "grupo") === "familia",
        opciones: [
          { valor: "si", etiqueta: "Sí" },
          { valor: "no", etiqueta: "No" },
        ],
      },
      {
        campo: "edades",
        titulo: "Edad de los niños",
        ayuda: "No toda actividad apta para niños vale para cualquier edad.",
        multi: true,
        visible: esFamiliaConNinos,
        opciones: [
          { valor: "0", etiqueta: "Menores de 2" },
          { valor: "2", etiqueta: "2 a 5" },
          { valor: "6", etiqueta: "6 a 10" },
          { valor: "11", etiqueta: "11 a 15" },
          { valor: "16", etiqueta: "Mayores de 15" },
        ],
      },
      {
        campo: "carrito",
        titulo: "¿Y el carrito de bebé?",
        ayuda: "No queremos descartar rutas espectaculares si harías una excepción con la mochila.",
        visible: esFamiliaConNinos,
        opciones: [
          { valor: "imprescindible", etiqueta: "Imprescindible que sean aptas para carrito" },
          { valor: "prefiero", etiqueta: "Las prefiero, pero alguna corta la haría en mochila" },
          { valor: "mochila", etiqueta: "Llevaré mochila, el carrito no importa" },
          { valor: "segun", etiqueta: "Lo decidiré según cada ruta" },
        ],
      },
      {
        campo: "perro",
        titulo: "¿Viajáis con perro?",
        ayuda: "Muchos espacios naturales y playas tienen restricciones para mascotas.",
        opciones: [
          { valor: "si", etiqueta: "Sí" },
          { valor: "no", etiqueta: "No" },
        ],
      },
      {
        campo: "vertigo",
        titulo: "¿Cómo llevas las zonas expuestas o los acantilados?",
        ayuda: "Hay rutas espectaculares con pasarelas o balcones naturales con sensación de altura.",
        opciones: [
          { valor: "evitar", etiqueta: "Prefiero evitarlas" },
          { valor: "quizas", etiqueta: "Si merece mucho la pena, podría" },
          { valor: "sin-problema", etiqueta: "No es ningún problema" },
        ],
      },
      {
        campo: "carreteras",
        titulo: "¿Qué carreteras prefieres?",
        ayuda: "A veces los últimos kilómetros son pista forestal y no todos conducen cómodos por ahí.",
        opciones: [
          { valor: "asfalto", etiqueta: "Solo asfaltadas" },
          { valor: "pista-buena", etiqueta: "Asfalto, y pistas sencillas en buen estado" },
          { valor: "turismo", etiqueta: "Da igual mientras pase un turismo" },
          { valor: "sin-preferencia", etiqueta: "Sin preferencia" },
        ],
      },
      {
        campo: "tiposRuta",
        titulo: "¿Qué tipo de rutas te apetece?",
        ayuda: "No hace falta saber de desnivel: interpretamos qué encaja por lo que elijas.",
        multi: true,
        opciones: [
          { valor: "paseos", etiqueta: "Paseos tranquilos por el paisaje" },
          { valor: "comodas", etiqueta: "Rutas cómodas, aptas para casi todos" },
          { valor: "varias-horas", etiqueta: "Caminar varias horas si vale la pena" },
          { valor: "exigentes", etiqueta: "Rutas físicamente exigentes" },
          { valor: "adapto", etiqueta: "Me adapto según la actividad" },
        ],
      },
      {
        campo: "paisajes",
        titulo: "¿Qué paisajes te gustan más?",
        ayuda: "Priorizan unas actividades frente a otras. No eliminan el resto.",
        multi: true,
        opciones: [
          { valor: "bosque", etiqueta: "Bosques" },
          { valor: "hayedo", etiqueta: "Hayedos" },
          { valor: "alta montaña", etiqueta: "Alta montaña" },
          { valor: "cascada", etiqueta: "Cascadas" },
          { valor: "embalse", etiqueta: "Ibones y lagos" },
          { valor: "rio", etiqueta: "Ríos" },
          { valor: "poza", etiqueta: "Pozas" },
          { valor: "barranco", etiqueta: "Barrancos" },
          { valor: "valle", etiqueta: "Valles" },
          { valor: "acantilado", etiqueta: "Acantilados" },
          { valor: "cueva", etiqueta: "Cuevas" },
          { valor: "desierto", etiqueta: "Desiertos" },
          { valor: "pueblo", etiqueta: "Pueblos" },
        ],
      },
      {
        campo: "agua",
        titulo: "¿Qué relación quieres con el agua?",
        ayuda: "Tendremos en cuenta la época del año antes de recomendar lugares de baño.",
        opciones: [
          { valor: "banarse", etiqueta: "Bañarme siempre que la época lo permita" },
          { valor: "refrescar", etiqueta: "Refrescarme o meter los pies" },
          { valor: "visitar", etiqueta: "Ver lugares con agua, aunque no me bañe" },
          { valor: "indiferente", etiqueta: "Me es indiferente" },
          { valor: "no", etiqueta: "No me interesa especialmente" },
        ],
      },
    ],
  },
  {
    id: "viaje",
    titulo: "Cómo quieres vivir este viaje",
    intro:
      "Ya os conocemos un poco. Ahora, cómo queréis organizar este viaje en concreto: cuánto " +
      "tiempo dar a cada sitio, cómo repartir los días y dónde parar a comer. No responder nunca " +
      "impide preparar el viaje —solo lo personaliza menos—.",
    preguntas: [
      {
        campo: "dias",
        titulo: "¿Cuántos días dura el viaje?",
        opciones: [
          { valor: "1", etiqueta: "Un día" },
          { valor: "2", etiqueta: "2 días" },
          { valor: "3", etiqueta: "3" },
          { valor: "4", etiqueta: "4" },
          { valor: "5", etiqueta: "5" },
          { valor: "6", etiqueta: "6-7" },
          { valor: "8", etiqueta: "Más de una semana" },
        ],
      },
      {
        campo: "fecha",
        titulo: "¿Cuándo?",
        ayuda: "La fecha decide las horas de luz y la época del año.",
        control: "fecha",
      },
      {
        campo: "ritmo",
        titulo: "¿Qué ritmo queréis llevar?",
        opciones: [
          { valor: "maximo", etiqueta: "Aprovechar y ver el máximo de lugares" },
          { valor: "bastante", etiqueta: "Ver bastante, pero sin prisas" },
          { valor: "tranquilo", etiqueta: "Disfrutar cada sitio aunque vea menos" },
          { valor: "relax", etiqueta: "Un viaje muy relajado" },
          { valor: "ia", etiqueta: "Prefiero que se decida por mí" },
        ],
      },
      {
        campo: "prioridades",
        titulo: "¿Qué te gustaría priorizar?",
        ayuda: "Da prioridad cuando hay alternativas. No hace desaparecer el resto (máx. 5).",
        multi: true,
        max: 5,
        opciones: [
          { valor: "naturaleza", etiqueta: "Naturaleza" },
          { valor: "senderismo", etiqueta: "Senderismo" },
          { valor: "cascadas", etiqueta: "Cascadas" },
          { valor: "ibones", etiqueta: "Ibones y lagos" },
          { valor: "bosques", etiqueta: "Bosques" },
          { valor: "pueblos", etiqueta: "Pueblos con encanto" },
          { valor: "gastronomia", etiqueta: "Gastronomía" },
          { valor: "fotografia", etiqueta: "Fotografía" },
          { valor: "fauna", etiqueta: "Fauna" },
          { valor: "historia", etiqueta: "Historia" },
        ],
      },
      {
        campo: "comida",
        titulo: "¿Cómo queréis comer?",
        ayuda: "Reservamos 30-45 min para un bocadillo y 90 min para un restaurante.",
        opciones: [
          { valor: "bocadillo", etiqueta: "Principalmente bocadillo" },
          { valor: "combinar", etiqueta: "Combinar restaurantes y bocadillos" },
          { valor: "restaurante", etiqueta: "Restaurante todos los días" },
          { valor: "marcha", etiqueta: "Lo decidiremos sobre la marcha" },
        ],
      },
    ],
  },
];

// Campos de cada bloque (para el reparto localStorage ↔ URL). Derivado de la config:
// no hay una segunda lista que mantener.
export const camposDe = (id: Bloque["id"]): Campo[] =>
  BLOQUES.find((b) => b.id === id)!.preguntas.map((p) => p.campo);

// Valores válidos de un campo de opciones (para validar lo que llega por la URL).
export const opcionesDe = (campo: Campo): string[] =>
  BLOQUES.flatMap((b) => b.preguntas)
    .find((p) => p.campo === campo)?.opciones?.map((o) => o.valor) ?? [];

// Etiqueta legible de un valor (para el resumen). El valor crudo si no se encuentra.
export const etiqueta = (campo: Campo, valor: string): string =>
  BLOQUES.flatMap((b) => b.preguntas)
    .find((p) => p.campo === campo)?.opciones?.find((o) => o.valor === valor)?.etiqueta ?? valor;
