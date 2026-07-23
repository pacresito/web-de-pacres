// Traduce las Respuestas del cuestionario a lo que consumen el motor (Perfil) y el
// planificador (Viaje). Los mapeos son tablas explícitas, no lógica lista-para-lucirse:
// se leen de un vistazo y se ajustan sin miedo. Puro, con test al lado.
import type { Acceso, Perfil } from "../motor/tipos";
import type { Comida, Ritmo } from "../tipos";
import { uno, varios, type Respuestas } from "./preguntas";

export type Viaje = { dias: number; fecha: string; ritmo: Ritmo; comida: Comida };

// --- Tablas de traducción (valor del cuestionario → dato del motor) ---
const ACCESO: Record<string, Acceso> = {
  asfalto: "asfalto",
  "pista-buena": "pista buena",
  turismo: "pista",
  // "sin-preferencia" no está: sin entrada = sin tope de acceso.
};

// Cada tipo de ruta abre una franja de dificultades (niveles de nivelesDificultad()).
const DIFICULTAD: Record<string, string[]> = {
  paseos: ["fácil"],
  comodas: ["fácil", "media"],
  "varias-horas": ["media", "difícil"],
  exigentes: ["difícil"],
  // "adapto" no acota nada.
};

// Prioridades (Cris) → dimensiones del destino. Una opción puede alimentar varias.
const PRIORIDAD: Record<string, Partial<Pick<Perfil, "experiencias" | "paisajes" | "tipos">>> = {
  naturaleza: { experiencias: ["naturaleza"] },
  senderismo: { experiencias: ["senderismo"] },
  gastronomia: { experiencias: ["gastronomia"] },
  fotografia: { experiencias: ["fotografia"] },
  historia: { experiencias: ["historia"] },
  fauna: { experiencias: ["naturaleza"] },   // sin vocab propio: lo más cercano
  cascadas: { paisajes: ["cascada"], tipos: ["cascada"] },
  ibones: { paisajes: ["embalse"] },
  bosques: { paisajes: ["bosque"] },
  pueblos: { paisajes: ["pueblo"], tipos: ["pueblo"] },
};

const RITMO: Record<string, Ritmo> = {
  maximo: "activo",
  bastante: "medio",
  tranquilo: "relajado",
  relax: "relajado",
  // "ia" (que decida) → sin entrada → cae al medio por defecto en aViaje.
};

const COMIDA: Record<string, Comida> = {
  bocadillo: "picnic",
  combinar: "da-igual",
  restaurante: "restaurante",
  marcha: "da-igual",
};

// Mes (0-11) → estación, para puntuar la época del destino desde la fecha del viaje.
export function estacionDe(fecha: string): string | undefined {
  const mes = new Date(`${fecha}T00:00`).getMonth();
  if (Number.isNaN(mes)) return undefined;
  if (mes >= 2 && mes <= 4) return "primavera";
  if (mes >= 5 && mes <= 7) return "verano";
  if (mes >= 8 && mes <= 10) return "otono";
  return "invierno";
}

// Une los valores de varias dimensiones sin duplicados y en orden estable.
const unir = (valores: string[]): string[] => [...new Set(valores)];

// Respuestas → Perfil del motor. `zonas` viene del mapa (filtros de la URL), no del
// cuestionario. Solo se rellena lo respondido: lo vacío no elimina ni puntúa.
export function aPerfil(r: Respuestas, zonas: string[] | undefined): Perfil {
  const perfil: Perfil = {};
  if (zonas?.length) perfil.zonas = zonas;

  // --- Eliminación (solo incompatibilidad explícita) ---
  if (uno(r, "carrito") === "imprescindible") perfil.carritoImprescindible = true;
  if (uno(r, "perro") === "si") perfil.conPerro = true;
  if (uno(r, "vertigo") === "evitar") perfil.conVertigo = true;
  const edades = varios(r, "edades").map(Number).filter((n) => !Number.isNaN(n));
  if (edades.length) perfil.edadMinNino = Math.min(...edades);
  const acceso = ACCESO[uno(r, "carreteras") ?? ""];
  if (acceso) perfil.accesoMax = acceso;

  // --- Puntuación (nunca elimina, solo ordena) ---
  const dificultades = unir(varios(r, "tiposRuta").flatMap((v) => DIFICULTAD[v] ?? []));
  if (dificultades.length) perfil.dificultades = dificultades;

  const paisajes = varios(r, "paisajes");
  const prioridades = varios(r, "prioridades").map((v) => PRIORIDAD[v]).filter(Boolean);
  const juntar = (base: string[], clave: "experiencias" | "paisajes" | "tipos") =>
    unir([...base, ...prioridades.flatMap((p) => p![clave] ?? [])]);

  const todosPaisajes = juntar(paisajes, "paisajes");
  if (todosPaisajes.length) perfil.paisajes = todosPaisajes;
  const experiencias = juntar([], "experiencias");
  if (experiencias.length) perfil.experiencias = experiencias;
  const tipos = juntar([], "tipos");
  if (tipos.length) perfil.tipos = tipos;

  const agua = uno(r, "agua");
  if (agua === "banarse" || agua === "refrescar") perfil.quiereBano = true;

  const estacion = estacionDe(uno(r, "fecha") ?? "");
  if (estacion) perfil.epoca = [estacion];

  return perfil;
}

// Respuestas → Viaje (lo que necesita el planificador). Con valores por defecto
// sensatos para lo no respondido: sin días, un fin de semana; sin ritmo, medio.
export function aViaje(r: Respuestas): Viaje {
  const dias = Number(uno(r, "dias"));
  return {
    dias: Number.isFinite(dias) && dias > 0 ? dias : 2,
    fecha: uno(r, "fecha") ?? new Date().toISOString().slice(0, 10),
    ritmo: RITMO[uno(r, "ritmo") ?? ""] ?? "medio",
    comida: COMIDA[uno(r, "comida") ?? ""] ?? "da-igual",
  };
}
