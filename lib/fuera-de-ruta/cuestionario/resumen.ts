// "Así es el viaje que vamos a preparar…": frases legibles del perfil detectado, para
// el cierre editable del cuestionario (spec cap. 3). Solo frasea lo respondido; lo que
// se omite no aparece. Puro: devuelve las líneas, las pinta la UI.
import { etiqueta, uno, varios, type Respuestas } from "./preguntas";

const GRUPO: Record<string, string> = {
  solo: "Viajas solo.",
  pareja: "Viajáis en pareja.",
  amigos: "Sois un grupo de amigos.",
  familia: "Viajáis en familia.",
  otro: "",
};

const RITMO: Record<string, string> = {
  maximo: "Queréis aprovechar y ver el máximo de lugares.",
  bastante: "Queréis ver bastante, sin prisas.",
  tranquilo: "Preferís disfrutar cada sitio con calma.",
  relax: "Buscáis un viaje muy relajado.",
  ia: "",
};

const RUTAS: Record<string, string> = {
  paseos: "paseos tranquilos",
  comodas: "rutas cómodas",
  "varias-horas": "caminatas de varias horas",
  exigentes: "rutas exigentes",
  adapto: "",
};

const AGUA: Record<string, string> = {
  banarse: "Os gustaría bañaros cuando la época lo permita.",
  refrescar: "Os gustaría refrescaros por el camino.",
  visitar: "Disfrutáis de los lugares con agua aunque no os bañéis.",
  indiferente: "",
  no: "",
};

// Frase propia para los días: la etiqueta del chip es compacta ("3", "6-7") y quedaría
// coja en prosa ("El viaje dura 3.").
const DIAS: Record<string, string> = {
  "1": "Es una excursión de un día.",
  "2": "El viaje dura 2 días.",
  "3": "El viaje dura 3 días.",
  "4": "El viaje dura 4 días.",
  "5": "El viaje dura 5 días.",
  "6": "El viaje dura entre 6 y 7 días.",
  "8": "El viaje dura más de una semana.",
};

const COMIDA: Record<string, string> = {
  bocadillo: "Comeréis sobre todo de bocadillo.",
  combinar: "Combinaréis restaurantes y bocadillos.",
  restaurante: "Comeréis en restaurante.",
  marcha: "",
};

// Une una lista en lenguaje natural: "a, b y c".
const enumerar = (v: string[]) =>
  v.length <= 1 ? v.join("") : `${v.slice(0, -1).join(", ")} y ${v[v.length - 1]}`;

export function resumen(r: Respuestas): string[] {
  const lineas: string[] = [];
  const empujar = (s: string) => s && lineas.push(s);

  empujar(GRUPO[uno(r, "grupo") ?? ""]);
  empujar(RITMO[uno(r, "ritmo") ?? ""]);

  const rutas = varios(r, "tiposRuta").map((v) => RUTAS[v]).filter(Boolean);
  if (rutas.length) empujar(`Haréis ${enumerar(rutas)}.`);

  const paisajes = varios(r, "paisajes").map((v) => etiqueta("paisajes", v).toLowerCase());
  if (paisajes.length) empujar(`Preferís ${enumerar(paisajes)}.`);

  const prioridades = varios(r, "prioridades").map((v) => etiqueta("prioridades", v).toLowerCase());
  if (prioridades.length) empujar(`Priorizáis ${enumerar(prioridades)}.`);

  empujar(AGUA[uno(r, "agua") ?? ""]);

  empujar(DIAS[uno(r, "dias") ?? ""]);

  empujar(COMIDA[uno(r, "comida") ?? ""]);

  return lineas;
}
