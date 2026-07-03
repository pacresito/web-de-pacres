// Dibuja el PDF de etiquetas de precio a partir de la geometría pura de `etiquetas.ts`.
// Aparte de ella porque usa pdf-lib (no testeable en Node sin las fuentes). Réplica de
// los PDF de María: A4, círculos de borde tenue; parte principal en negrita (precio con
// entero grande y decimales pequeños pegados, o un texto como "3x2"/"-50%") y, si la
// etiqueta lleva título (denominación o "2ª unidad"), va fino y en gris encima.
import { PDFDocument, PDFFont, PDFPage, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { empaquetar, Colocada, Etiqueta, A4 } from "./etiquetas";

const MM = 72 / 25.4; // puntos PDF por mm
const BORDE = rgb(0.8, 0.8, 0.8);
const TINTA = rgb(0, 0, 0);
const GRIS = rgb(0.3, 0.3, 0.3); // título fino, como en los PDF de María

export interface FuentesEtiqueta {
  bold: ArrayBuffer | Uint8Array;
  regular: ArrayBuffer | Uint8Array;
}

// Parte el título en las líneas que caben en `maxW` (una palabra suelta más ancha no se
// corta: se deja desbordar, es preferible a partir una palabra).
function envolver(texto: string, font: PDFFont, size: number, maxW: number): string[] {
  const lineas: string[] = [];
  let actual = "";
  for (const palabra of texto.split(/\s+/).filter(Boolean)) {
    const tentativa = actual ? `${actual} ${palabra}` : palabra;
    if (!actual || font.widthOfTextAtSize(tentativa, size) <= maxW) actual = tentativa;
    else {
      lineas.push(actual);
      actual = palabra;
    }
  }
  if (actual) lineas.push(actual);
  return lineas;
}

// Dibuja el precio (entero grande + decimales pequeños pegados) centrado en cx, con la
// base del bloque en `base`. Devuelve la altura de mayúscula ocupada.
function dibujarPrecio(page: PDFPage, e: Etiqueta, cx: number, base: number, d: number, font: PDFFont, conTitulo: boolean) {
  let fsEntero = d * (conTitulo ? 0.34 : 0.42);
  let fsDec = fsEntero * 0.5;
  let wEntero = font.widthOfTextAtSize(e.entero ?? "", fsEntero);
  let wDec = font.widthOfTextAtSize(e.decimales ?? "", fsDec);
  const maxW = d * 0.82;
  if (wEntero + wDec > maxW) {
    const f = maxW / (wEntero + wDec); // encoge para que un precio largo no se salga
    fsEntero *= f;
    fsDec *= f;
    wEntero *= f;
    wDec *= f;
  }
  const xIni = cx - (wEntero + wDec) / 2;
  page.drawText(e.entero ?? "", { x: xIni, y: base, size: fsEntero, font, color: TINTA });
  page.drawText(e.decimales ?? "", { x: xIni + wEntero, y: base, size: fsDec, font, color: TINTA });
  return fsEntero * 0.72;
}

// Dibuja el texto principal en negrita (p. ej. "3x2", "-50%"), ajustando el tamaño para
// que quepa. Devuelve la altura de mayúscula ocupada.
function dibujarTexto(page: PDFPage, texto: string, cx: number, base: number, d: number, font: PDFFont, conTitulo: boolean) {
  let fs = d * (conTitulo ? 0.42 : 0.5);
  const maxW = d * 0.82;
  const w = font.widthOfTextAtSize(texto, fs);
  if (w > maxW) fs *= maxW / w;
  page.drawText(texto, { x: cx - font.widthOfTextAtSize(texto, fs) / 2, y: base, size: fs, font, color: TINTA });
  return fs * 0.72;
}

// Dibuja un círculo con su contenido. pdf-lib tiene el origen abajo-izquierda; la
// geometría viene con `y` desde arriba, así que se invierte. Con título: fino y gris
// arriba, parte principal abajo, todo centrado como bloque. Sin título: principal en el
// centro.
function dibujar(page: PDFPage, c: Colocada, bold: PDFFont, regular: PDFFont, altoMm: number) {
  const cx = c.x * MM;
  const cy = (altoMm - c.y) * MM;
  const d = c.diametro * MM;
  page.drawCircle({ x: cx, y: cy, size: d / 2, borderColor: BORDE, borderWidth: 0.5 });

  const conTitulo = !!c.titulo;
  const dibujarPrincipal = (base: number) =>
    c.entero != null ? dibujarPrecio(page, c, cx, base, d, bold, conTitulo) : dibujarTexto(page, c.texto ?? "", cx, base, d, bold, conTitulo);

  if (!conTitulo) {
    dibujarPrincipal(cy - (c.entero != null ? d * 0.42 : d * 0.5) * 0.36);
    return;
  }

  const maxW = d * 0.82;
  let fsTit = d * 0.135;
  const lineas = envolver(c.titulo ?? "", regular, fsTit, maxW);
  const anchoMax = Math.max(...lineas.map((l) => regular.widthOfTextAtSize(l, fsTit)));
  if (anchoMax > maxW) fsTit *= maxW / anchoMax; // una palabra sola más ancha que el círculo
  const altoTit = lineas.length * fsTit * 1.18;
  const capPrincipal = (c.entero != null ? d * 0.34 : d * 0.42) * 0.72;
  const total = altoTit + d * 0.03 + capPrincipal;
  const top = cy + total / 2;
  lineas.forEach((linea, i) => {
    page.drawText(linea, {
      x: cx - regular.widthOfTextAtSize(linea, fsTit) / 2,
      y: top - fsTit * 0.85 - i * fsTit * 1.18,
      size: fsTit,
      font: regular,
      color: GRIS,
    });
  });
  dibujarPrincipal(cy - total / 2);
}

// Genera el PDF (una página por hoja empaquetada). Las fuentes (Planer bold y regular)
// las carga el cliente desde /public.
export async function generarPdfEtiquetas(etiquetas: Etiqueta[], fuentes: FuentesEtiqueta): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const bold = await doc.embedFont(fuentes.bold);
  const regular = await doc.embedFont(fuentes.regular);
  for (const hoja of empaquetar(etiquetas)) {
    const page = doc.addPage([A4.ancho * MM, A4.alto * MM]);
    for (const c of hoja) dibujar(page, c, bold, regular, A4.alto);
  }
  return doc.save();
}
