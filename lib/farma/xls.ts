// Genera el .xls de pedido que importa UnycopWin. Formato verificado contra
// `Pedidos formato.xls`: hoja "UnycopWin", cabecera Código·Denominación·Cantidad,
// una fila por artículo. La cantidad va como TEXTO (en el ejemplo real "5"/"0") y
// el código también, para no perder los ceros a la izquierda del código nacional.
import * as XLSX from "xlsx";
import type { LineaPedido } from "./pedidos";

export function generarBolsa(lineas: LineaPedido[]): Buffer {
  const filas = [
    ["Código", "Denominación", "Cantidad"],
    ...lineas.map((l) => [l.codigo, l.denominacion, String(l.cantidad)]),
  ];
  const ws = XLSX.utils.aoa_to_sheet(filas);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "UnycopWin");
  return XLSX.write(wb, { type: "buffer", bookType: "xls" });
}
