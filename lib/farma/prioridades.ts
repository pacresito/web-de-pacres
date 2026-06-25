// Rankeo de laboratorios por principio activo: a mayor descuento, mayor prioridad
// de venta (más margen). Módulo puro: testeable con `npx tsx`.

export type LabDescuento = { lab: string; descuento: number | null };

export type FilaPrioridad = {
  denominacion: string; // "PRINCIPIO ACTIVO LAB" (lo que ve el usuario)
  lab: string;
  descuento: number | null;
  prioridad: number | null; // 1 = mejor; empates comparten; sin descuento = null (al final)
};

/** Ordena los labs de un principio por descuento desc. Empates = misma prioridad
 *  (dense rank: 60,50,50,10 → 1,2,2,3). Labs sin descuento conocido van al final
 *  con prioridad null. */
export function rankear(principio: string, labs: LabDescuento[]): FilaPrioridad[] {
  const conDescuento = labs
    .filter((l): l is { lab: string; descuento: number } => l.descuento !== null)
    .sort((a, b) => b.descuento - a.descuento);

  const filas: FilaPrioridad[] = [];
  let prioridad = 0;
  let previo: number | null = null;
  for (const l of conDescuento) {
    if (l.descuento !== previo) {
      prioridad += 1;
      previo = l.descuento;
    }
    filas.push({ denominacion: `${principio} ${l.lab}`, lab: l.lab, descuento: l.descuento, prioridad });
  }

  for (const l of labs.filter((l) => l.descuento === null)) {
    filas.push({ denominacion: `${principio} ${l.lab}`, lab: l.lab, descuento: null, prioridad: null });
  }

  return filas;
}
