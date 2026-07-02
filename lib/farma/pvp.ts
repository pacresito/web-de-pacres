// Histórico de PVP por artículo (hash farma:pvp): tipos y diff puro. Lo escribe la
// subida de inventario (diff contra el histórico, marca `pending` lo que cambió) y lo
// lee la pantalla PVP. Sin Redis para que el diff sea testeable; la lectura del hash
// vive en `pvp-store.ts` (mismo patrón que pedidos.ts / pedidos-store.ts).
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
