// Genera el .xls de pedido que importa UnycopWin. Formato verificado contra
// `Pedidos formato.xls`: hoja "UnycopWin", cabecera Código·Denominación·Cantidad,
// una fila por artículo. La cantidad va como TEXTO (en el ejemplo real "5"/"0") y
// el código también, para no perder los ceros a la izquierda del código nacional.
import * as XLSX from "xlsx";
import type { LineaPedido } from "./pedidos";

// Solo necesita los tres campos que van al .xls; el resto de LineaPedido (existencias,
// consumo, min) es contexto de pantalla que aquí no pinta.
export function generarBolsa(lineas: Pick<LineaPedido, "codigo" | "denominacion" | "cantidad">[]): Buffer {
  const filas = [
    ["Código", "Denominación", "Cantidad"],
    ...lineas.map((l) => [l.codigo, l.denominacion, String(l.cantidad)]),
  ];
  const ws = XLSX.utils.aoa_to_sheet(filas);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "UnycopWin");
  return XLSX.write(wb, { type: "buffer", bookType: "xls" });
}
