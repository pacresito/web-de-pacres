// Parser del inventario de UnycopWin (.xls). Tres formatos —típico, por Familia,
// por Categoría— comparten la misma fila de artículo; solo cambian el preámbulo
// (resúmenes, estadísticas) y los agrupadores (`*** FAMILIA: … ***`, totales).
//
// Por eso NO nos anclamos a la fila de cabecera "Código" ni a la longitud del
// preámbulo: escaneamos todas las filas y nos quedamos con las que cumplen la
// FIRMA de artículo por tipos:
//
//   col0 = número (código)     col1 = texto (denominación)     col2 = número (stock)
//   col4 = número (Valor PVP)
//
// Validado con los tres ejemplos: el nº de filas que cumplen la firma coincide
// exactamente con el "Nº Items" total del preámbulo (3664 / 3659 / 1768).
//
// Gotcha PVP: "Valor PVP" (col4) NO es el precio de un artículo, es el valor del stock a
// PVP = precio unitario × existencias. El PVP unitario se recupera dividiendo por las
// unidades (col2) y redondeando a céntimos. Sin stock no es derivable (0 = desconocido).
//
// Gotcha: el código NO siempre tiene 6 dígitos (hay de 1 a 6, p. ej. 1021). Se
// normaliza a 6 con ceros a la izquierda, que es la forma canónica de Ventas
// (el código nacional con el que cruza `farma:ref:pedidos`).
//
// Familia y formato: el inventario detallado normal (el que sube María) antepone a
// cada bloque una fila `*** FAMILIA: 1 Especialidades ***` con la familia FISCAL
// (Especialidades = 4%, el resto 21%/10%). Capturamos esa familia por artículo. El
// "por Categoría" usa las mismas marcas pero con categorías COMERCIALES (Solares,
// Pediatría…) que mezclan IVAs y no traen los medicamentos. Por eso el formato se
// detecta por la presencia de la familia "Especialidades": sin ella no se puede
// distinguir el IVA ni está el inventario completo (ver `esEspecialidad`).
import * as XLSX from "xlsx";

export interface ArticuloInventario {
  codigo: string; // código nacional, 6 dígitos (con ceros a la izquierda)
  denominacion: string;
  stock: number; // unidades en existencias
  pvp: number; // PVP unitario (Valor PVP / existencias; 0 si no derivable)
  familia: string; // grupo "*** FAMILIA: … ***"; "" en el formato típico (sin grupos)
}

export interface Inventario {
  fechaInforme: string; // ISO yyyy-mm-dd (de la etiqueta "Fecha del Informe")
  formato: "familia" | "otro"; // "familia" = trae la agrupación fiscal (con "Especialidades")
  items: ArticuloInventario[];
}

const esNumero = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const esTexto = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;

// Una fila es un artículo si tiene código (col0), denominación (col1) y stock (col2).
// El resto de filas (preámbulo, agrupadores, totales) tienen col0 vacío.
const esArticulo = (r: unknown[]): boolean => esNumero(r[0]) && esTexto(r[1]) && esNumero(r[2]);

// PVP unitario desde el "Valor PVP" (col4, valor del stock a PVP) y las existencias.
const pvpUnitario = (valorPvp: unknown, stock: number): number =>
  esNumero(valorPvp) && stock > 0 ? Math.round((valorPvp / stock) * 100) / 100 : 0;

// Marca de bloque de familia: `*** FAMILIA: 1 Especialidades ***`. Devuelve el nombre
// del grupo (p. ej. "1 Especialidades") o null si la fila no es una marca.
const FAMILIA_RE = /\*\*\*\s*Familia:\s*(.+?)\s*\*\*\*/i;
const familiaDeFila = (r: unknown[]): string | null => {
  for (const c of r) {
    if (typeof c === "string") {
      const m = c.match(FAMILIA_RE);
      if (m) return m[1].trim();
    }
  }
  return null;
};

// Medicamentos (familia fiscal "Especialidades"): IVA 4%. Es la única familia que la
// pantalla PVP excluye —María solo reetiqueta no-medicamentos (21%/10%)—.
export const esEspecialidad = (a: ArticuloInventario): boolean => /especialidades/i.test(a.familia);

export function parseInventario(data: Buffer | Uint8Array | ArrayBuffer): Inventario {
  const wb = XLSX.read(data, { type: "buffer" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, blankrows: false });

  const fechaInforme = leerFechaInforme(rows);

  // Escaneo con estado: cada marca de familia fija la familia de los artículos que la siguen.
  const items: ArticuloInventario[] = [];
  let familia = "";
  for (const r of rows) {
    const marca = familiaDeFila(r);
    if (marca !== null) {
      familia = marca;
    } else if (esArticulo(r)) {
      const stock = r[2] as number;
      items.push({
        codigo: String(r[0]).padStart(6, "0"),
        denominacion: (r[1] as string).trim(),
        stock,
        pvp: pvpUnitario(r[4], stock),
        familia,
      });
    }
  }

  const formato: Inventario["formato"] = items.some(esEspecialidad) ? "familia" : "otro";
  return { fechaInforme, formato, items };
}

// Guarda de carga (#7): un inventario completo cae dentro de unos rangos conocidos.
// Fuera de ellos algo huele mal (archivo equivocado, export parcial…). Dos niveles:
//   · aviso   — fuera del rango normal pero plausible: se puede confirmar y seguir.
//   · bloqueo — tan fuera que casi seguro es un error: no se deja actualizar.
// El bloqueo es duro: ni confirmándolo se actualiza.
export type VeredictoCarga = "ok" | "aviso" | "bloqueo";

// [min, max] de artículos y unidades. RANGO_BLOQUEO viaja en la respuesta de la API
// para que el mensaje del cliente cite siempre los límites vigentes (este módulo no
// es importable desde el cliente: arrastraría xlsx al bundle).
export type RangoCarga = { articulos: [number, number]; unidades: [number, number] };
export const RANGO_BLOQUEO: RangoCarga = { articulos: [1000, 6000], unidades: [10000, 40000] };
const RANGO_NORMAL: RangoCarga = { articulos: [2000, 5000], unidades: [15000, 35000] };

const fuera = (v: number, [min, max]: [number, number]) => v < min || v > max;

export function evaluarCarga(articulos: number, unidades: number): VeredictoCarga {
  if (fuera(articulos, RANGO_BLOQUEO.articulos) || fuera(unidades, RANGO_BLOQUEO.unidades)) return "bloqueo";
  if (fuera(articulos, RANGO_NORMAL.articulos) || fuera(unidades, RANGO_NORMAL.unidades)) return "aviso";
  return "ok";
}

// Unidades totales del inventario (suma de existencias): alimenta la guarda y el panel.
export const totalUnidades = (items: ArticuloInventario[]): number =>
  items.reduce((suma, a) => suma + a.stock, 0);

// Localiza la fila "Fecha del Informe:" y convierte su serial Excel a ISO.
function leerFechaInforme(rows: unknown[][]): string {
  const fila = rows.find((r) => r.some((c) => typeof c === "string" && c.includes("Fecha del Informe")));
  const serial = fila?.find(esNumero);
  if (!serial) return "";
  const d = XLSX.SSF.parse_date_code(serial);
  const mm = String(d.m).padStart(2, "0");
  const dd = String(d.d).padStart(2, "0");
  return `${d.y}-${mm}-${dd}`;
}
