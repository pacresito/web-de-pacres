// Texto de los filtros activos de /fuera-de-ruta (puro, sin React). Dos piezas:
//  - filtrosActivos(): cada filtro como unidad quitable —etiqueta de chip y los
//    filtros sin él—; alimenta "Limpiar (N)", los chips de rescate del estado 0
//    y sus recuentos (la UI cuenta re-ejecutando filtrar.ts sobre `sin`).
//  - resumenFiltros(): la frase en gris de la cabecera de resultados ("cascadas
//    en Baztán y Otsondo, para niños"), reusada en la explicación del estado 0.
import type { Desnivel, Filtros } from "./filtrar";

export type FiltroActivo = {
  etiqueta: string; // texto del chip: "cascada", "2 zonas", "baño sí", "‹ 5 km a pie"…
  sin: Filtros;     // los mismos filtros con esta unidad quitada
};

// Textos visibles de los valores filtrables (los ids del JSON van sin acento).
export const AGUA_TEXTO: Record<string, string> = {
  ibon: "ibón",
  cascada: "cascada",
  rio: "río",
  poza: "poza",
  embalse: "embalse",
};
export const EPOCA_TEXTO: Record<string, string> = {
  primavera: "primavera",
  verano: "verano",
  otono: "otoño",
  invierno: "invierno",
};
export const DESNIVEL_TEXTO: Record<Desnivel, string> = {
  "<150": "‹ 150 m",
  "<300": "‹ 300 m",
  "<500": "‹ 500 m",
  "+500": "+500 m",
};

export function filtrosActivos(f: Filtros, nombreZona: (id: string) => string): FiltroActivo[] {
  const lista: FiltroActivo[] = [];
  const uno = (etiqueta: string, sin: Partial<Filtros>) => lista.push({ etiqueta, sin: { ...f, ...sin } });

  if (f.zona?.length) uno(f.zona.length === 1 ? `solo ${nombreZona(f.zona[0])}` : `${f.zona.length} zonas`, { zona: undefined });
  if (f.tipo?.length) uno(f.tipo.length === 1 ? f.tipo[0] : `${f.tipo.length} tipos`, { tipo: undefined });
  if (f.dificultad?.length) uno(f.dificultad.length === 1 ? f.dificultad[0] : `${f.dificultad.length} dificultades`, { dificultad: undefined });
  if (f.agua?.length) uno(f.agua.length === 1 ? AGUA_TEXTO[f.agua[0]] ?? f.agua[0] : `${f.agua.length} tipos de agua`, { agua: undefined });
  if (f.epoca?.length) uno(f.epoca.length === 1 ? EPOCA_TEXTO[f.epoca[0]] ?? f.epoca[0] : `${f.epoca.length} épocas`, { epoca: undefined });
  if (f.distanciaMax !== undefined) uno(`‹ ${f.distanciaMax} km a pie`, { distanciaMax: undefined });
  if (f.duracionMax !== undefined) uno(`‹ ${f.duracionMax} h`, { duracionMax: undefined });
  if (f.desnivel) uno(DESNIVEL_TEXTO[f.desnivel], { desnivel: undefined });
  if (f.bano) uno("baño sí", { bano: undefined });
  if (f.ninos) uno("niños sí", { ninos: undefined });
  if (f.perros) uno("perros sí", { perros: undefined });
  if (f.parkingGratuito) uno("parking gratis", { parkingGratuito: undefined });
  if (f.sinReserva) uno("sin reserva", { sinReserva: undefined });
  return lista;
}

// Plural naive que basta para los tipos reales (cascada→cascadas, mirador→miradores);
// los valores multipalabra se dejan tal cual.
const plural = (s: string) => (s.includes(" ") ? s : /[aeiouáéíóú]$/i.test(s) ? `${s}s` : `${s}es`);
const juntar = (vs: string[], nexo: string) =>
  vs.length <= 1 ? vs.join("") : `${vs.slice(0, -1).join(", ")} ${nexo} ${vs[vs.length - 1]}`;

export function resumenFiltros(f: Filtros, nombreZona: (id: string) => string): string {
  // El sujeto (tipos) y su zona van juntos sin coma; el resto son apostillas.
  const sujeto = f.tipo?.length ? juntar(f.tipo.map(plural), "y") : "";
  const enZonas = f.zona?.length ? `en ${juntar(f.zona.map(nombreZona), "y")}` : "";
  const cabeza = [sujeto, enZonas].filter(Boolean).join(" ");

  const frases: string[] = [];
  if (f.dificultad?.length) frases.push(`dificultad ${juntar(f.dificultad, "o")}`);
  if (f.agua?.length) frases.push(`con ${juntar(f.agua.map((a) => AGUA_TEXTO[a] ?? a), "o")}`);
  if (f.bano) frases.push("con baño");
  if (f.ninos && f.perros) frases.push("para niños y perros");
  else if (f.ninos) frases.push("para niños");
  else if (f.perros) frases.push("para perros");
  if (f.parkingGratuito) frases.push("con parking gratis");
  if (f.sinReserva) frases.push("sin reserva");
  if (f.distanciaMax !== undefined) frases.push(`a menos de ${f.distanciaMax} km a pie`);
  if (f.duracionMax !== undefined) frases.push(`de menos de ${f.duracionMax} h`);
  if (f.desnivel) frases.push(f.desnivel === "+500" ? "con más de 500 m de desnivel" : `con menos de ${f.desnivel.slice(1)} m de desnivel`);
  if (f.epoca?.length) frases.push(`en ${juntar(f.epoca.map((e) => EPOCA_TEXTO[e] ?? e), "o")}`);

  return [cabeza, ...frases].filter(Boolean).join(", ");
}
