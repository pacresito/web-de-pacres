// Filtrado del explorador. Categóricos: OR dentro de la dimensión, AND entre
// dimensiones, vacío = inactiva. Umbrales: contra el MÍNIMO del rango. Dato ausente =
// fuera, salvo `sinReserva`.
import type { Destino } from "./tipos";

export type Desnivel = "<150" | "<300" | "<500" | "+500";

export type Filtros = {
  zona?: string[];        // ids de zona; vacío = todas
  tipo?: string[];        // vacío = todos los tipos
  dificultad?: string[];  // niveles normalizados: fácil | media | difícil
  epoca?: string[];       // primavera | verano | otono | invierno
  agua?: string[];        // ibon | cascada | rio | poza | embalse
  distanciaMax?: number;  // km; ausente = sin tope
  duracionMax?: number;   // horas; ausente = sin tope
  desnivel?: Desnivel;    // tramo; ausente = cualquiera
  ninos?: boolean;        // true = solo aptos para niños
  perros?: boolean;       // true = solo aptos para perros
  bano?: boolean;         // true = solo donde te puedes bañar
  parkingGratuito?: boolean; // true = solo con parking gratuito
  sinReserva?: boolean;   // true = solo los que NO exigen reserva
};

// Texto libre → niveles: "fácil media" cuenta en los dos.
export function nivelesDificultad(texto: string | undefined): string[] {
  if (!texto) return [];
  const t = texto.toLowerCase();
  const niveles: string[] = [];
  if (t.includes("fácil") || t.includes("facil")) niveles.push("fácil");
  if (t.includes("media") || t.includes("medio")) niveles.push("media");
  if (t.includes("difícil") || t.includes("dificil")) niveles.push("difícil");
  return niveles;
}

export function filtrarDestinos(destinos: Destino[], filtros: Filtros): Destino[] {
  return destinos.filter((d) => cumple(d, filtros));
}

function cumple(d: Destino, f: Filtros): boolean {
  if (f.zona?.length && !f.zona.includes(d.zona)) return false;
  if (f.tipo?.length && !f.tipo.includes(d.tipo)) return false;
  if (f.dificultad?.length && !solapa(nivelesDificultad(d.dificultad), f.dificultad)) return false;
  if (f.epoca?.length && !solapa(d.epoca, f.epoca)) return false;
  if (f.agua?.length && !solapa(d.agua, f.agua)) return false;
  if (f.distanciaMax !== undefined) {
    if (!d.distanciaKm || d.distanciaKm[0] > f.distanciaMax) return false;
  }
  if (f.duracionMax !== undefined) {
    if (!d.duracionHoras || d.duracionHoras[0] > f.duracionMax) return false;
  }
  if (f.desnivel) {
    if (!d.desnivelM || !pasaDesnivel(d.desnivelM[0], f.desnivel)) return false;
  }
  if (f.ninos && d.ninos !== true) return false;
  if (f.perros && d.perros !== true) return false;
  if (f.bano && d.bano !== true) return false;
  if (f.parkingGratuito && d.parkingGratuito !== true) return false;
  // Reserva ausente = no hace falta reservar, justo lo que busca este filtro.
  if (f.sinReserva && d.reserva) return false;
  return true;
}

const solapa = (tiene: string[] | undefined, marcados: string[]): boolean =>
  !!tiene && tiene.some((v) => marcados.includes(v));

function pasaDesnivel(min: number, tramo: Desnivel): boolean {
  switch (tramo) {
    case "<150": return min <= 150;
    case "<300": return min <= 300;
    case "<500": return min <= 500;
    case "+500": return min > 500;
  }
}
