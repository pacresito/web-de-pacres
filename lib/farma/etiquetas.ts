// Etiquetas de precio para /farma/maria/pvp: geometría pura (sin pdf-lib), para que
// el empaquetado sea testeable con `npx tsx lib/farma/etiquetas.test.ts`. El dibujo del
// PDF vive en `etiquetas-pdf.ts` (mismo patrón puro↔store que pvp.ts / pvp-store.ts).
//
// Cada etiqueta es un círculo. Diámetros medidos en los PDF de referencia de María
// (A4, tres tamaños fijos). El círculo tiene una parte principal en negrita —un precio
// (entero grande + decimales pegados, `21` + `,95€`) o un texto ("3x2", "-50%")— y, si
// hace falta, un título fino encima (denominación o "2ª unidad"), como en los PDF.

export type Tamano = "S" | "M" | "L";

// Diámetro en mm de cada tamaño (medido en los PDF de María).
export const DIAMETROS: Record<Tamano, number> = { S: 21.2, M: 39.0, L: 56.7 };

export interface Etiqueta {
  diametro: number; // mm
  titulo?: string; // texto fino encima (denominación, "2ª unidad"); se parte en líneas
  entero?: string; // parte entera del precio ("21") — parte principal si es precio
  decimales?: string; // resto pegado (",95€")
  texto?: string; // texto principal en negrita en vez de precio ("3x2", "-50%")
}

// Una fila de la pantalla PVP lista para imprimir: un diámetro, cuántas copias y su
// contenido. La UI (pendientes + extras) se traduce a esto antes de empaquetar, para
// que el packing no conozca los tipos de la pantalla. `titulo` y (`precio`|`texto`) se
// combinan: precio solo, texto solo, o título + precio/texto.
export interface FuenteEtiqueta {
  diametro: number;
  cantidad: number;
  titulo?: string; // se imprime encima; ausente = círculo solo con la parte principal
  precio?: number; // euros
  texto?: string; // texto principal ("3x2", "-50%")
}

// "21,95€" → { entero: "21", decimales: ",95€" }. El símbolo va pegado a los decimales
// porque en las etiquetas se imprime pequeño junto a ellos.
export function formatoPrecio(euros: number): { entero: string; decimales: string } {
  const [entero, dec] = euros.toFixed(2).split(".");
  return { entero, decimales: `,${dec}€` };
}

// Expande las fuentes a la lista de círculos a imprimir (una por copia). Las fuentes de
// precio sin número (precio libre a null) ya vienen filtradas por la UI.
export function expandir(fuentes: FuenteEtiqueta[]): Etiqueta[] {
  const etiquetas: Etiqueta[] = [];
  for (const f of fuentes) {
    const base: Etiqueta = { diametro: f.diametro };
    if (f.precio != null) Object.assign(base, formatoPrecio(f.precio));
    else base.texto = f.texto ?? "";
    if (f.titulo) base.titulo = f.titulo;
    for (let i = 0; i < f.cantidad; i++) etiquetas.push({ ...base });
  }
  return etiquetas;
}

export interface Colocada extends Etiqueta {
  x: number; // centro (mm) desde el borde izquierdo
  y: number; // centro (mm) desde el borde superior
}

export interface HojaConfig {
  ancho: number; // mm
  alto: number; // mm
  margen: number; // mm libres en cada borde
  gap: number; // mm de separación mínima entre círculos
  paso: number; // mm de la rejilla de escaneo (menor = más apretado, más lento)
}

export const A4: HojaConfig = { ancho: 210, alto: 297, margen: 7, gap: 1.5, paso: 2 };

// Primera posición libre (escaneo arriba→abajo, izquierda→derecha) para un círculo de
// diámetro d sobre los ya colocados, o null si no cabe en la hoja. El escaneo top-left
// mete los pequeños en los huecos que dejan los grandes → mosaico apretado.
function primeraLibre(colocadas: Colocada[], d: number, cfg: HojaConfig): { x: number; y: number } | null {
  const r = d / 2;
  for (let y = cfg.margen + r; y <= cfg.alto - cfg.margen - r; y += cfg.paso) {
    for (let x = cfg.margen + r; x <= cfg.ancho - cfg.margen - r; x += cfg.paso) {
      const libre = colocadas.every((c) => Math.hypot(c.x - x, c.y - y) >= (c.diametro + d) / 2 + cfg.gap);
      if (libre) return { x, y };
    }
  }
  return null;
}

// Empaqueta las etiquetas en hojas. Ordena de mayor a menor diámetro (mejor packing) y
// abre una hoja nueva cuando la actual no admite el siguiente círculo.
export function empaquetar(etiquetas: Etiqueta[], cfg: HojaConfig = A4): Colocada[][] {
  const orden = [...etiquetas].sort((a, b) => b.diametro - a.diametro);
  const hojas: Colocada[][] = [[]];
  for (const e of orden) {
    let hoja = hojas[hojas.length - 1];
    let pos = primeraLibre(hoja, e.diametro, cfg);
    if (!pos) {
      hoja = [];
      hojas.push(hoja);
      pos = primeraLibre(hoja, e.diametro, cfg);
    }
    if (pos) hoja.push({ ...e, x: pos.x, y: pos.y });
  }
  return hojas;
}
