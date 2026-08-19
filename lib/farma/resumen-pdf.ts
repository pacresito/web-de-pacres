// Dibuja el PDF del resumen a partir de las filas de `resumen.ts`: una página por hoja de
// pegatinas, con el precio primero (es lo que se lee en el círculo ya recortado), el
// tamaño con su ×N de copias, el producto y el precio anterior.
import { PDFDocument, PDFFont, PDFPage, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { A4 } from "./etiquetas";
import type { FuentesEtiqueta } from "./etiquetas-pdf";
import type { FilaResumen } from "./resumen";
import type { Tamano } from "./pvp";

const MM = 72 / 25.4;
const TINTA = rgb(0.1, 0.1, 0.1);
const SUAVE = rgb(0.45, 0.45, 0.45);
const CEBRA = rgb(0.965, 0.965, 0.965);
const LINEA = rgb(0.88, 0.88, 0.88);

// Columnas en mm desde el borde izquierdo (precio y anterior se alinean a la derecha).
const COL = { precio: 40, tamano: 46, producto: 62, antes: 196 };
const Y_CABECERA = 30;
// La página no se parte nunca: la fila se encoge hasta que la hoja más llena cabe. El
// suelo de 4,6 mm da para 55 filas y una hoja A4 no admite más de 46 círculos.
const ALTO_MAX = 7;
const ALTO_MIN = 4.6;
// El punto del tamaño, a escala comprimida: ordena S/M/L/XL de un vistazo sin ocupar.
const RADIO: Record<Tamano, number> = { S: 1.3, M: 1.7, L: 2.2, XL: 2.8 };

const euro = (n: number) => n.toFixed(2).replace(".", ",") + " €";

function recortar(texto: string, font: PDFFont, size: number, maxMm: number): string {
  let s = texto;
  while (s.length > 1 && font.widthOfTextAtSize(s, size) > maxMm * MM) s = s.slice(0, -1);
  return s;
}

function cabecera(page: PDFPage, bold: PDFFont, regular: PDFFont, titulo: string, subtitulo: string) {
  page.drawText(titulo, { x: 14 * MM, y: (A4.alto - 16) * MM, size: 13, font: bold, color: TINTA });
  page.drawText(subtitulo, { x: 14 * MM, y: (A4.alto - 21) * MM, size: 8, font: regular, color: SUAVE });

  const y = (A4.alto - Y_CABECERA) * MM;
  const rotulo = (t: string, x: number, derecha = false) =>
    page.drawText(t, { x: x * MM - (derecha ? bold.widthOfTextAtSize(t, 7.5) : 0), y, size: 7.5, font: bold, color: SUAVE });
  rotulo("PRECIO", COL.precio, true);
  rotulo("ETIQUETA", COL.tamano);
  rotulo("PRODUCTO", COL.producto);
  rotulo("ANTES", COL.antes, true);
  page.drawLine({
    start: { x: 14 * MM, y: y - 2 * MM },
    end: { x: 196 * MM, y: y - 2 * MM },
    thickness: 0.7,
    color: SUAVE,
  });
}

function dibujarFila(page: PDFPage, f: FilaResumen, y: number, i: number, alto: number, bold: PDFFont, regular: PDFFont) {
  const base = (A4.alto - y) * MM;
  const fsPrecio = Math.min(10, alto * 1.75);
  const fs = Math.min(9, alto * 1.6);
  if (i % 2 === 1) {
    page.drawRectangle({ x: 14 * MM, y: base - (alto - 4) * MM, width: 182 * MM, height: alto * MM, color: CEBRA });
  }

  const principal = f.precio != null ? euro(f.precio) : (f.texto ?? "");
  page.drawText(principal, {
    x: COL.precio * MM - bold.widthOfTextAtSize(principal, fsPrecio),
    y: base,
    size: fsPrecio,
    font: bold,
    color: TINTA,
  });

  page.drawCircle({ x: (COL.tamano + 2) * MM, y: base + 1.2 * MM, size: RADIO[f.tamano] * MM, borderColor: SUAVE, borderWidth: 0.6 });
  page.drawText(f.tamano, { x: (COL.tamano + 6) * MM, y: base, size: fs - 1, font: regular, color: SUAVE });
  // Las copias van pegadas al tamaño porque hablan de la pegatina, no del producto: así
  // no abren una columna que la mayoría de las filas deja vacía.
  if (f.copias > 1) {
    page.drawText(`×${f.copias}`, { x: (COL.tamano + 10) * MM, y: base, size: fs - 1, font: regular, color: SUAVE });
  }

  page.drawText(recortar(f.producto, regular, fs, COL.antes - COL.producto - 20), {
    x: COL.producto * MM,
    y: base,
    size: fs,
    font: regular,
    color: TINTA,
  });
  if (f.antes != null) {
    const antes = euro(f.antes);
    page.drawText(antes, { x: COL.antes * MM - regular.widthOfTextAtSize(antes, fs - 1), y: base, size: fs - 1, font: regular, color: SUAVE });
  }
  page.drawLine({
    start: { x: 14 * MM, y: base - (alto - 4) * MM },
    end: { x: 196 * MM, y: base - (alto - 4) * MM },
    thickness: 0.4,
    color: LINEA,
  });
}

/** Un PDF con una página por hoja de pegatinas. `fecha` ya viene formateada: este módulo
 *  no decide en qué huso vive María. */
export async function generarPdfResumen(hojas: FilaResumen[][], fuentes: FuentesEtiqueta, fecha: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const bold = await doc.embedFont(fuentes.bold);
  const regular = await doc.embedFont(fuentes.regular);

  hojas.forEach((filas, h) => {
    const page = doc.addPage([A4.ancho * MM, A4.alto * MM]);
    const etiquetas = filas.reduce((n, f) => n + f.copias, 0);
    cabecera(
      page,
      bold,
      regular,
      `Etiquetas de precio — resumen de la hoja ${h + 1} de ${hojas.length}`,
      `${fecha} · ${etiquetas} ${etiquetas === 1 ? "etiqueta" : "etiquetas"} en esta hoja · de menor a mayor precio`,
    );
    const alto = Math.max(ALTO_MIN, Math.min(ALTO_MAX, (A4.alto - Y_CABECERA - 10) / Math.max(filas.length, 1)));
    filas.forEach((f, i) => dibujarFila(page, f, Y_CABECERA + 4 + alto + i * alto, i, alto, bold, regular));
  });

  return doc.save();
}
