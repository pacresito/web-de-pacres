// Lógica pura de filtrado de destinos de /viajes. Sin React ni dependencias.
// Regla de rangos: se compara contra el MÍNIMO del rango — si la ruta puede
// hacerse en menos de X, aparece (plan /viajes). Un destino sin el dato que se
// filtra no cumple: si no consta la distancia/desnivel/apto, no se garantiza.
import type { Destino } from "./tipos";

export type Desnivel = "<150" | "<300" | "<500" | "+500";

export type Filtros = {
  zona?: string;          // id de zona; ausente = todas
  tipo?: string;          // ausente = todos los tipos
  distanciaMax?: number;  // 5 | 10 | 15 | 20 | 25 km; ausente = sin tope
  desnivel?: Desnivel;    // tramo; ausente = cualquiera
  ninos?: boolean;        // true = solo aptos para niños
  perros?: boolean;       // true = solo aptos para perros
  bano?: boolean;         // true = solo donde te puedes bañar
};

export function filtrarDestinos(destinos: Destino[], filtros: Filtros): Destino[] {
  return destinos.filter((d) => cumple(d, filtros));
}

function cumple(d: Destino, f: Filtros): boolean {
  if (f.zona && d.zona !== f.zona) return false;
  if (f.tipo && d.tipo !== f.tipo) return false;
  if (f.distanciaMax !== undefined) {
    if (!d.distanciaKm) return false;
    if (d.distanciaKm[0] > f.distanciaMax) return false;
  }
  if (f.desnivel) {
    if (!d.desnivelM) return false;
    if (!pasaDesnivel(d.desnivelM[0], f.desnivel)) return false;
  }
  if (f.ninos && d.ninos !== true) return false;
  if (f.perros && d.perros !== true) return false;
  if (f.bano && d.bano !== true) return false;
  return true;
}

function pasaDesnivel(min: number, tramo: Desnivel): boolean {
  switch (tramo) {
    case "<150": return min <= 150;
    case "<300": return min <= 300;
    case "<500": return min <= 500;
    case "+500": return min > 500;
  }
}
