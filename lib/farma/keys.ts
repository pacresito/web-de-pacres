// Claves Redis de /farma. En desarrollo llevan sufijo `-dev` (misma convención que
// el resto del sitio) para no pisar los datos de producción desde local.
// La app deja el default (lo decide NODE_ENV); el seed pasa `dev` explícito.
const esDev = process.env.NODE_ENV === "development";

const farmaKey = (base: string, dev: boolean): string => (dev ? `${base}-dev` : base);

export const KEYS = {
  // Descuentos por (principio, lab). Ya no es ref estático: es el dato MUTABLE que
  // edita María (pantalla Descuentos). Prioridades lo lee y rankea.
  descuentos: (dev: boolean = esDev) => farmaKey("farma:descuentos", dev),

  // Referencia de Ventas (estática, sembrada): blob JSON codigo → {denominacion, lab, consumoMensual}.
  refPedidos: (dev: boolean = esDev) => farmaKey("farma:ref:pedidos", dev),
  // Mapa código → [pedidos] (estático, sembrado): a qué pedido(s) pertenece cada artículo.
  // Eje de agrupación de Pedidos (la carpeta de pedidos de María). Blob JSON.
  pedidoCodigos: (dev: boolean = esDev) => farmaKey("farma:ref:pedido-codigos", dev),
  // StMín por artículo (mutable, lo edita María): hash codigo → stMin.
  stmin: (dev: boolean = esDev) => farmaKey("farma:stmin", dev),
  // Snapshot del último inventario: hash codigo → stock. Se reescribe en cada subida.
  stock: (dev: boolean = esDev) => farmaKey("farma:stock", dev),
  // Metadatos del último inventario: blob JSON {fechaInforme, loadedAt, totalArticulos}.
  meta: (dev: boolean = esDev) => farmaKey("farma:meta", dev),
  // Histórico de PVP: hash codigo → JSON {denominacion, oldPrice, newPrice, firstSeen, lastSeen, pending}.
  pvp: (dev: boolean = esDev) => farmaKey("farma:pvp", dev),
  // Pedidos fichados por María: hash pedido → orderedAt (epoch ms del check).
  pedidosHechos: (dev: boolean = esDev) => farmaKey("farma:pedidos-hechos", dev),
  // Contadores de uso por acción y mes (YYYY-MM, Madrid). No se exponen en la web.
  stats: (accion: string, mes: string, dev: boolean = esDev) =>
    farmaKey(`farma:stats:${accion}:${mes}`, dev),
};
