// Histórico de PVP por artículo (hash farma:pvp): tipos y diff puro. Lo escribe la
// subida de inventario (diff contra el histórico, marca `pending` lo que cambió) y lo
// lee la pantalla PVP. Sin Redis para que el diff sea testeable; la lectura del hash
// vive en `pvp-store.ts` (mismo patrón que pedidos.ts / pedidos-store.ts).
import { DIAMETROS, POR_HOJA, type Tamano } from "./etiquetas";

export interface RegistroPvp {
  denominacion: string;
  oldPrice: number; // PVP anterior (la línea base previa)
  newPrice: number; // PVP actual
  firstSeen: string; // fecha del informe en que apareció el newPrice
  lastSeen: string; // fecha del último informe en que se vio el artículo
  pending: boolean; // cambió y aún no se han reetiquetado
}

export interface LineaPvp extends RegistroPvp {
  codigo: string;
}

/** Lee un registro del hash. `null` si el valor está corrupto: una línea ilegible entre
 *  miles no puede tumbar la pantalla de PVP entera ni el marcado masivo, pero tampoco
 *  desaparecer sin dejar rastro en los logs. */
export function leerRegistroPvp(codigo: string, raw: string): RegistroPvp | null {
  try {
    return JSON.parse(raw) as RegistroPvp;
  } catch {
    console.error(`farma:pvp — registro ilegible en ${codigo}, se salta`);
    return null;
  }
}

// Borrador de etiquetado que persiste entre recargas (blob farma:pvp-etiquetas):
// tamaño y cantidad por línea (clave = código real de un pendiente o id de una línea
// manual) y las líneas manuales que María añade. Tipos aquí (puros) para compartirlos
// entre el componente cliente <Pvp> y el store. El tamaño es el de `etiquetas.ts` (se
// re-exporta, no se redeclara: una lista de tamaños que se olvide de crecer guardaría
// borradores mutilados).
export type { Tamano };

// Línea manual de etiqueta: "precio" (precio libre, la denominación no se imprime),
// "texto-precio" (denominación + precio) o "promo" (texto fijo).
export interface FilaExtra {
  id: string;
  tipo: "precio" | "texto-precio" | "promo";
  denominacion: string;
  precio: number | null; // aplica a "precio" y "texto-precio"
}

export interface BorradorEtiquetas {
  tamanos: Record<string, Tamano>;
  cantidades: Record<string, number>;
  extras: FilaExtra[];
}

// ¿Esta línea manual imprime etiqueta? Las promos siempre; las de precio, solo cuando
// ya tienen número (una fila recién añadida todavía no).
export function extraImprimible(x: FilaExtra): boolean {
  return x.tipo === "promo" || x.precio != null;
}

// Lo que se cuenta de las etiquetas en curso: las líneas manuales que María ha añadido,
// las copias que se imprimirían y cuánta hoja A4 llenan (1 = una hoja entera). Se usa
// en la pantalla PVP sobre el estado en vivo y en el panel sobre el borrador guardado.
export interface ResumenEtiquetas {
  personalizadas: number;
  unidades: number;
  hojas: number;
}

export function resumenEtiquetas(pendientes: LineaPvp[], borrador: BorradorEtiquetas): ResumenEtiquetas {
  const ids = [
    ...pendientes.map((p) => p.codigo),
    ...borrador.extras.filter(extraImprimible).map((x) => x.id),
  ];
  let unidades = 0;
  let hojas = 0;
  for (const id of ids) {
    const copias = borrador.cantidades[id] ?? 1;
    unidades += copias;
    hojas += copias / POR_HOJA[borrador.tamanos[id] ?? "S"];
  }
  return { personalizadas: borrador.extras.length, unidades, hojas };
}

// Cómo se le cuenta a María lo que lleva: mientras no complete una hoja, el porcentaje
// que lleva; a partir de ahí, las hojas enteras que ya llena.
export function fraseHoja(hojas: number): string {
  const enteras = Math.floor(hojas);
  if (enteras === 1) return "¡ya llenas una hoja entera!";
  if (enteras > 1) return `¡ya llenas ${enteras} hojas enteras!`;
  return `llevas el ${Math.round(hojas * 100)}% de una hoja`;
}

const TAMANOS_VALIDOS = Object.keys(DIAMETROS) as Tamano[];
const TIPOS_EXTRA: FilaExtra["tipo"][] = ["precio", "texto-precio", "promo"];

const obj = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};

function esFilaExtra(x: unknown): x is FilaExtra {
  const f = x as FilaExtra;
  return (
    !!f &&
    typeof f.id === "string" &&
    TIPOS_EXTRA.includes(f.tipo) &&
    typeof f.denominacion === "string" &&
    (f.precio === null || typeof f.precio === "number")
  );
}

// Normaliza el borrador que llega del cliente antes de guardarlo: descarta claves y
// campos con tipo inesperado para que Redis solo reciba la forma válida (única admin,
// pero el blob se vuelve a pintar tal cual al recargar). Entrada no-objeto → vacío.
export function sanearBorrador(raw: unknown): BorradorEtiquetas {
  const o = obj(raw);
  const tamanos: Record<string, Tamano> = {};
  for (const [k, v] of Object.entries(obj(o.tamanos))) {
    if (TAMANOS_VALIDOS.includes(v as Tamano)) tamanos[k] = v as Tamano;
  }
  const cantidades: Record<string, number> = {};
  for (const [k, v] of Object.entries(obj(o.cantidades))) {
    if (typeof v === "number" && Number.isInteger(v) && v >= 1) cantidades[k] = v;
  }
  const extras = Array.isArray(o.extras) ? o.extras.filter(esFilaExtra) : [];
  return { tamanos, cantidades, extras };
}

// Aplica el diff de PVP de un artículo contra su histórico. Devuelve el registro
// actualizado: primera vez = línea base sin cambio; mismo precio = solo refresca
// lastSeen; precio distinto = el anterior pasa a oldPrice y queda pendiente.
//
// `marcar` = el artículo puede aparecer en la pantalla PVP (no es medicamento). Los
// medicamentos (Especialidades, 4%) nunca se marcan `pending`: cambian de precio a
// todas horas por revisión ministerial y María solo reetiqueta el 21%/10%. Forzar
// `pending: false` también limpia cualquier pendiente antiguo de un medicamento (el
// hash PVP se acumula, no se reescribe entero).
export function diffPvp(
  denominacion: string,
  pvp: number,
  fecha: string,
  previo: RegistroPvp | null,
  marcar: boolean,
): RegistroPvp {
  if (!previo) {
    return { denominacion, oldPrice: pvp, newPrice: pvp, firstSeen: fecha, lastSeen: fecha, pending: false };
  }
  if (pvp === previo.newPrice) {
    return { ...previo, denominacion, lastSeen: fecha, pending: previo.pending && marcar };
  }
  return { denominacion, oldPrice: previo.newPrice, newPrice: pvp, firstSeen: fecha, lastSeen: fecha, pending: marcar };
}
