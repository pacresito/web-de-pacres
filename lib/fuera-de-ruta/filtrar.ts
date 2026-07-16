// Lógica pura de filtrado de destinos de /fuera-de-ruta. Sin React ni dependencias.
// Dos familias de filtro:
//  - Categóricos multi-selección (zona, tipo, dificultad, época, agua): el destino
//    pasa si coincide con ALGUNO de los valores marcados (OR dentro de la dimensión);
//    las dimensiones se acumulan entre sí (AND). Un array vacío = dimensión inactiva.
//  - Umbrales (distancia, duración, desnivel): se comparan contra el MÍNIMO del rango
//    —si la ruta puede hacerse en menos de X, aparece—.
// Regla general: un destino sin el dato que se filtra no cumple (dato ausente = fuera).
// Excepción documentada: `sinReserva` invierte la regla (ver cumple()).
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

// Traduce el texto libre de dificultad a niveles normalizados. "fácil media"
// abarca ambos, así el destino aparece tanto en el filtro "fácil" como en "media".
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
  if (activo(f.zona) && !f.zona!.includes(d.zona)) return false;
  if (activo(f.tipo) && !f.tipo!.includes(d.tipo)) return false;
  if (activo(f.dificultad) && !solapa(nivelesDificultad(d.dificultad), f.dificultad!)) return false;
  if (activo(f.epoca) && !solapa(d.epoca, f.epoca!)) return false;
  if (activo(f.agua) && !solapa(d.agua, f.agua!)) return false;
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
  // Excepción a "ausente = fuera": reserva ausente significa que NO se necesita
  // reserva (estado por defecto), que es justo lo que este filtro busca.
  if (f.sinReserva && d.reserva) return false;
  return true;
}

const activo = (arr: string[] | undefined): boolean => arr !== undefined && arr.length > 0;

// ¿Tiene el destino algún valor de los marcados? Si no tiene el dato, no cumple.
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
