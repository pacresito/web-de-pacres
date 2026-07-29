// Tipos del árbol genealógico + helpers puros de lectura. Los datos en sí viven en
// Redis (arbol:datos), sembrados desde seed/arbol.json — ver WEB/arbol-genealogico/
// PROJECT.md en Pacres para el porqué del esquema y de la fusión entre documentos.

export interface Persona {
  id: string;
  name: string;
  birth?: number;
  death?: number;
  rawDates?: string;
  uncertain?: boolean;
  nota?: string;
  fuentes: string[];
}

export interface Union {
  id: string;
  partners: string[]; // 1 (progenitor sin pareja documentada) o 2 ids
  tipo: "matrimonio" | "pareja" | null;
  children: string[];
  fuentes: string[];
  xref?: string;
}

export interface ArbolData {
  people: Persona[];
  unions: Union[];
  roots: Record<string, string[]>;
}

export interface ArbolIndex {
  data: ArbolData;
  personaPorId: Map<string, Persona>;
  unionPorId: Map<string, Union>;
  /** Unión donde esta persona es partner (su propia familia, si la tiene). */
  familiaDe: Map<string, string>;
}

export function indexar(data: ArbolData): ArbolIndex {
  const personaPorId = new Map(data.people.map((p) => [p.id, p]));
  const unionPorId = new Map(data.unions.map((u) => [u.id, u]));
  const familiaDe = new Map<string, string>();
  for (const u of data.unions) {
    for (const pid of u.partners) familiaDe.set(pid, u.id);
  }
  return { data, personaPorId, unionPorId, familiaDe };
}
