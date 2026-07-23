// Crédito de una foto, indexado por su ruta de archivo (no por destino: la galería
// de un destino puede mezclar procedencias). Sin entrada = foto de Cris = sin línea,
// así lo que ella entregue no da trabajo y solo se anota lo que viene de fuera.
import creditos from "@/data/fuera-de-ruta/creditos.json";

export type Credito = { autor?: string; licencia?: string; fuente?: string; url?: string };

const CREDITOS: Record<string, Credito> = creditos;

export const creditoDe = (src: string): Credito | undefined => CREDITOS[src];

// Línea de cara al usuario; los campos que falten se omiten sin dejar separadores.
export const lineaCredito = (c: Credito): string =>
  [c.autor, c.licencia, c.fuente].filter(Boolean).join(" · ");
