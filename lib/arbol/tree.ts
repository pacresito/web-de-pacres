// Los tipos del árbol genealógico, tal como salen del JSON y nada más: quien quiera
// recorrerlo pide el grafo a `grafo.ts`. Los datos en sí viven en Redis (arbol:datos),
// sembrados desde seed/arbol.json — ver WEB/arbol-genealogico/PROJECT.md en Pacres para el
// porqué del esquema y de la fusión entre documentos.

export interface Persona {
  id: string;
  /** El nombre de pila, ya separado de los apellidos por `scripts/fix-datos.py`. */
  nombre: string;
  /** Cero, uno o dos. Cuántos se pintan lo decide un interruptor global. */
  apellidos: string[];
  /**
   * Coloca al hombre encima de cada pareja y dice de quién viene cada apellido. No sale
   * de los Word: lo escribe `scripts/correcciones.py` uno a uno, y solo falta en los
   * cuatro «Sin nombre».
   */
  sexo?: "h" | "m";
  /** Con la precisión que consta: `"1986"` o `"1986-03-01"`. Solo los Word dan defunción. */
  birth?: string;
  death?: string;
  /** Qué dato marcaba el docx como dudoso — nunca "esta persona es dudosa". */
  incierto?: "nombre" | "fechas";
  nota?: string;
  fuentes: string[];
}

export interface Union {
  id: string;
  partners: string[]; // 1 (progenitor sin pareja documentada) o 2 ids
  tipo: "matrimonio" | "pareja" | null;
  /** La unión acabó: divorcio si fue matrimonio, ruptura si fue pareja. */
  roto?: boolean;
  children: string[];
  fuentes: string[];
}

export interface ArbolData {
  people: Persona[];
  unions: Union[];
  roots: Record<string, string[]>;
}
