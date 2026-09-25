// Crédito de cada foto por su ruta, no por destino: una galería puede mezclar
// procedencias. Sin entrada = foto de Cris, sin línea de crédito.
import creditos from "@/data/fuera-de-ruta/creditos.json";

export type Credito = { autor?: string; licencia?: string; fuente?: string; url?: string };

const CREDITOS: Record<string, Credito> = creditos;

export const creditoDe = (src: string): Credito | undefined => CREDITOS[src];

export const lineaCredito = (c: Credito): string =>
  [c.autor, c.licencia, c.fuente].filter(Boolean).join(" · ");
