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
  // Borrador de etiquetado de PVP (mutable, admin): blob JSON {tamanos, cantidades,
  // extras} con lo que María prepara en la pantalla PVP y aún no ha impreso/limpiado.
  pvpEtiquetas: (dev: boolean = esDev) => farmaKey("farma:pvp-etiquetas", dev),
  // Ventas cruzadas (mutable, lo edita María): blob JSON codigo → [códigos recomendados].
  // Dirigido (A→B no implica B→A). Lo lee la vista de mostrador y el panel; lo muta la
  // ruta de recomendaciones. El seed solo lo puebla si no existe (no pisa a María).
  recomendaciones: (dev: boolean = esDev) => farmaKey("farma:recomendaciones", dev),
  // Contadores de uso por día (YYYY-MM-DD, Madrid): hash campo→conteo con HINCRBY.
  // Sin TTL (a ~3.650 hashes diminutos en 10 años, escala de sobra). Internos, no
  // se exponen en la web; se consultan con scripts/farma-metricas.ts.
  metricas: (fecha: string, dev: boolean = esDev) => farmaKey(`farma:metricas:${fecha}`, dev),
  // Motivo del último inventario rechazado (fecha + texto breve), para diagnóstico.
  metricasErrorInventario: (dev: boolean = esDev) =>
    farmaKey("farma:metricas:inventario-ultimo-error", dev),
};
