// Resumen de las etiquetas impresas: la hoja de papel normal que acompaña a cada hoja de
// pegatinas para que los técnicos sepan a qué producto va cada círculo. Geometría pura
// (sin pdf-lib), testeable con `npx tsx lib/farma/resumen.test.ts`; el dibujo vive en
// `resumen-pdf.ts` (mismo patrón que etiquetas.ts / etiquetas-pdf.ts).
//
// Reglas del resumen, acordadas con María:
// - Una página por hoja de pegatinas, y entera: se recorta una hoja mirando una sola cara.
// - De menor a mayor precio, que es como se busca un círculo ya recortado. El precio no
//   identifica solo (dos productos pueden costar lo mismo), pero precio + tamaño sí: si
//   además coinciden en tamaño, las pegatinas son idénticas y da igual cuál va en cuál.
// - Las copias de una línea que caen en la misma hoja se agrupan en una fila con su ×N.
// - Las promos ("3x2") no tienen precio que ordenar y van al final.
import type { Colocada } from "./etiquetas";
import type { Tamano } from "./pvp";

// Lo que la pantalla sabe de cada línea y el círculo no: qué producto es y de qué precio
// viene. Se indexa por la `ref` que viaja con la etiqueta desde `expandir`.
export interface DatosLinea {
  producto: string;
  tamano: Tamano;
  precio: number | null; // null = promo, que se muestra por su texto
  texto?: string; // "3x2", "-50%"
  antes: number | null; // PVP anterior; ausente en las líneas manuales
}

export interface FilaResumen extends DatosLinea {
  copias: number;
}

/** Las filas de cada hoja, agrupadas y ordenadas. Una etiqueta sin `ref` conocida no
 *  puede describirse y se queda fuera: el resumen habla de lo que sabe. */
export function filasPorHoja(hojas: Colocada[][], datos: Record<string, DatosLinea>): FilaResumen[][] {
  return hojas.map((hoja) => {
    const filas = new Map<string, FilaResumen>();
    for (const c of hoja) {
      const d = c.ref ? datos[c.ref] : undefined;
      if (!d) continue;
      const ya = filas.get(c.ref!);
      if (ya) ya.copias++;
      else filas.set(c.ref!, { ...d, copias: 1 });
    }
    const todas = [...filas.values()];
    const conPrecio = todas
      .filter((f) => f.precio != null)
      .sort((a, b) => a.precio! - b.precio! || a.producto.localeCompare(b.producto, "es"));
    const promos = todas.filter((f) => f.precio == null);
    return [...conPrecio, ...promos];
  });
}
