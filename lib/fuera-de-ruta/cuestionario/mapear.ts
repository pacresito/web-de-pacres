// Respuestas del cuestionario → Perfil del motor y Viaje del planificador, por tablas.
import type { Perfil } from "../motor/tipos";
import type { Acceso, Comida, Ritmo } from "../tipos";
import { uno, varios, type Respuestas } from "./preguntas";

export type Viaje = { dias: number; fecha: string; ritmo: Ritmo; comida: Comida };

// Una opción sin entrada en su tabla no filtra ni puntúa.
const ACCESO: Record<string, Acceso> = {
  asfalto: "asfalto",
  "pista-buena": "pista buena",
  turismo: "pista",
};

const DIFICULTAD: Record<string, string[]> = {
  paseos: ["fácil"],
  comodas: ["fácil", "media"],
  "varias-horas": ["media", "difícil"],
  exigentes: ["difícil"],
};

const PRIORIDAD: Record<string, Partial<Pick<Perfil, "experiencias" | "paisajes" | "tipos">>> = {
  naturaleza: { experiencias: ["naturaleza"] },
  senderismo: { experiencias: ["senderismo"] },
  gastronomia: { experiencias: ["gastronomia"] },
  fotografia: { experiencias: ["fotografia"] },
  historia: { experiencias: ["historia"] },
  fauna: { experiencias: ["naturaleza"] },   // sin vocabulario propio
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
};

const COMIDA: Record<string, Comida> = {
  bocadillo: "picnic",
  combinar: "da-igual",
  restaurante: "restaurante",
  marcha: "da-igual",
};

export function estacionDe(fecha: string): string | undefined {
  const mes = new Date(`${fecha}T00:00`).getMonth();
  if (Number.isNaN(mes)) return undefined;
  if (mes >= 2 && mes <= 4) return "primavera";
  if (mes >= 5 && mes <= 7) return "verano";
  if (mes >= 8 && mes <= 10) return "otono";
  return "invierno";
}

const unir = (valores: string[]): string[] => [...new Set(valores)];

// `zonas` viene del mapa (filtros de la URL), no del cuestionario.
export function aPerfil(r: Respuestas, zonas: string[] | undefined): Perfil {
  const perfil: Perfil = {};
  if (zonas?.length) perfil.zonas = zonas;

  // Fase 1
  if (uno(r, "carrito") === "imprescindible") perfil.carritoImprescindible = true;
  if (uno(r, "perro") === "si") perfil.conPerro = true;
  if (uno(r, "vertigo") === "evitar") perfil.conVertigo = true;
  const edades = varios(r, "edades").map(Number).filter((n) => !Number.isNaN(n));
  if (edades.length) perfil.edadMinNino = Math.min(...edades);
  const acceso = ACCESO[uno(r, "carreteras") ?? ""];
  if (acceso) perfil.accesoMax = acceso;

  // Fase 2
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

// Lo no respondido: un fin de semana, desde hoy, a ritmo medio.
export function aViaje(r: Respuestas): Viaje {
  const dias = Number(uno(r, "dias"));
  return {
    dias: Number.isFinite(dias) && dias > 0 ? dias : 2,
    fecha: uno(r, "fecha") ?? new Date().toISOString().slice(0, 10),
    ritmo: RITMO[uno(r, "ritmo") ?? ""] ?? "medio",
    comida: COMIDA[uno(r, "comida") ?? ""] ?? "da-igual",
  };
}
