// Rankeo de laboratorios por principio activo: a mayor descuento, mayor prioridad
// de venta (más margen). Módulo puro: testeable con `npx tsx`.

// `inferido`: descuento que decidimos nosotros (máx por desempate o sin dato → 0),
// no dato firme de María. Solo lo usa la pantalla Descuentos; el rankeo lo ignora.
export type LabDescuento = { lab: string; descuento: number | null; inferido: boolean };

export type FilaPrioridad = {
  denominacion: string; // "PRINCIPIO ACTIVO LAB" (lo que ve el usuario)
  lab: string;
  descuento: number | null;
  inferido: boolean;
  prioridad: number | null; // 1 = mejor; empates comparten; sin descuento = null (al final)
};

/** Ordena los labs de un principio por descuento desc. Empates = misma prioridad
 *  (dense rank: 60,50,50,10 → 1,2,2,3). Labs sin descuento conocido van al final
 *  con prioridad null. */
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
    filas.push({ denominacion: `${principio} ${l.lab}`, lab: l.lab, descuento: l.descuento, inferido: l.inferido, prioridad });
  }

  for (const l of labs.filter((l) => l.descuento === null)) {
    filas.push({ denominacion: `${principio} ${l.lab}`, lab: l.lab, descuento: null, inferido: l.inferido, prioridad: null });
  }

  return filas;
}
