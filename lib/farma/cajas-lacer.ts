// Múltiplo de caja de los pedidos de Lacer: Lacer solo sirve cajas completas, así que
// la cantidad a pedir de un artículo de Lacer se redondea al alza a su tamaño de caja
// (lo aplica cantidadAPedir en pedidos.ts cuando el artículo va al pedido LACER).
//
// Default 6 uds ("MÍNIMO 6 UDS" en las plantillas de Lacer). Solo se listan las cajas
// distintas de 6 (cepillos y sprays en expositor de 12); ausente = 6. Fuente: el texto
// "EXPOSITOR / EXP. 12 UDS" de las plantillas. Una excepción de 12 no listada solo
// puede quedarse corta medio expositor (se pide de 6 en 6) — nunca parte una caja.
export const PEDIDO_LACER = "LACER";
export const CAJA_LACER_DEFAULT = 6;

export const CAJAS_LACER: Record<string, number> = {
  "162974": 12, // CEPILLO MEDIO + PASTA 5 ML (EXP. 12 UDS)
  "162982": 12, // CEPILLO SUAVE + PASTA 5 ML (EXP. 12 UDS)
  "183818": 12, // CEPILLO MINI SUAVE (EXP. 12 UDS)
  "183819": 12, // CEPILLO MINI MEDIO (EXP. 12 UDS)
  "184010": 12, // LACERFRESH SPRAY 15 ML (EXPOSITOR 12 UDS)
  "222932": 12, // LACER ALIGNER SPRAY 30 ML (EXPOSITOR 12 UDS)
};

// Múltiplo al que redondear la cantidad de un código según sus pedidos. 1 = sin
// redondeo: el resto de proveedores pide la cantidad exacta (solo Lacer va por caja).
export function tamanoCaja(codigo: string, pedidos: string[]): number {
  if (!pedidos.includes(PEDIDO_LACER)) return 1;
  return CAJAS_LACER[codigo] ?? CAJA_LACER_DEFAULT;
}
