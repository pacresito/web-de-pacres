// Rankeo de laboratorios por principio activo: a mayor descuento, mayor prioridad
// de venta (más margen). Módulo puro: testeable con `npx tsx`.

// `inferido`: descuento que decidimos nosotros (máx por desempate o sin dato → 0),
// no dato firme de María. Solo lo usa la pantalla Descuentos; el rankeo lo ignora.
//
// `dosis`: excepción, casi ningún principio la lleva. Un lab suele tener la misma tarifa
// para todas las presentaciones; cuando una dosis se sale, entra como entrada APARTE con
// su dosis (LORAZEPAM 0,5 MG NORMON) junto a la genérica del mismo lab. Se lee así: una
// entrada con dosis manda sobre la genérica de su lab PARA ESA DOSIS; el lab sin entrada
// con dosis vale igual para todas. Por eso la identidad de una entrada es (lab, dosis),
// no el lab (ver `mismaEntrada`).
export type LabDescuento = { lab: string; descuento: number | null; inferido: boolean; dosis?: string };

export type FilaPrioridad = {
  denominacion: string; // "PRINCIPIO ACTIVO [DOSIS] LAB" (lo que ve el usuario)
  lab: string;
  dosis?: string;
  descuento: number | null;
  inferido: boolean;
  prioridad: number | null; // 1 = mejor; empates comparten; sin descuento = null (al final)
};

/** Identidad de una entrada dentro de un principio: lab + dosis (ausente = la genérica). */
export function mismaEntrada(l: LabDescuento, lab: string, dosis?: string): boolean {
  return l.lab === lab && (l.dosis ?? "") === (dosis ?? "");
}

const denominar = (principio: string, l: LabDescuento): string =>
  l.dosis ? `${principio} ${l.dosis} ${l.lab}` : `${principio} ${l.lab}`;

/** Ordena los labs de un principio por descuento desc. Empates = misma prioridad
 *  (dense rank: 60,50,50,10 → 1,2,2,3). Labs sin descuento conocido van al final
 *  con prioridad null. Las entradas con dosis rankean en la MISMA lista que las
 *  genéricas: su número de prioridad compara cosas no comparables, pero la dosis va
 *  en la denominación y es lo que se lee. */
export function rankear(principio: string, labs: LabDescuento[]): FilaPrioridad[] {
  const conDescuento = labs
    .filter((l): l is LabDescuento & { descuento: number } => l.descuento !== null)
    .sort((a, b) => b.descuento - a.descuento);

  const filas: FilaPrioridad[] = [];
  let prioridad = 0;
  let previo: number | null = null;
  for (const l of conDescuento) {
    if (l.descuento !== previo) {
      prioridad += 1;
      previo = l.descuento;
    }
    filas.push({ denominacion: denominar(principio, l), lab: l.lab, dosis: l.dosis, descuento: l.descuento, inferido: l.inferido, prioridad });
  }

  for (const l of labs.filter((l) => l.descuento === null)) {
    filas.push({ denominacion: denominar(principio, l), lab: l.lab, dosis: l.dosis, descuento: null, inferido: l.inferido, prioridad: null });
  }

  return filas;
}
