// Claves Redis de /farma. El sufijo `-dev` y su porqué viven en `lib/keys.ts`; la app deja el
// default y el seed pasa `dev` explícito, que un script suelto no es development y escribiría
// sobre los datos de María.
import { clave } from "../keys";

export const KEYS = {
  // Descuentos por (principio, lab). Ya no es ref estático: es el dato MUTABLE que
  // edita María (pantalla Descuentos). Prioridades lo lee y rankea.
  descuentos: (dev?: boolean) => clave("farma:descuentos", dev),
  // Historial de `descuentos`: lista con los N blobs anteriores (el 0 es el último). La
  // escribe `guardarDescuentos` antes de pisar el dato; es el deshacer de un error de
  // María, que ahora puede cambiar la identidad de una entrada (convertir una genérica en
  // dosis) y eso no se ve al mirar la tabla.
  descuentosHistorial: (dev?: boolean) => clave("farma:descuentos:historial", dev),

  // Referencia de Ventas (estática, sembrada): blob JSON codigo → {denominacion, lab, consumoMensual}.
  refPedidos: (dev?: boolean) => clave("farma:ref:pedidos", dev),
  // Mapa código → [pedidos] (estático, sembrado): a qué pedido(s) pertenece cada artículo.
  // Eje de agrupación de Pedidos (la carpeta de pedidos de María). Blob JSON.
  pedidoCodigos: (dev?: boolean) => clave("farma:ref:pedido-codigos", dev),
  // StMín por artículo (mutable, lo edita María): hash codigo → stMin.
  stmin: (dev?: boolean) => clave("farma:stmin", dev),
  // Snapshot del último inventario: hash codigo → stock. Se reescribe en cada subida.
  stock: (dev?: boolean) => clave("farma:stock", dev),
  // Metadatos del último inventario: blob JSON {fechaInforme, loadedAt, totalArticulos}.
  meta: (dev?: boolean) => clave("farma:meta", dev),
  // Histórico de PVP: hash codigo → JSON {denominacion, oldPrice, newPrice, firstSeen, lastSeen, pending}.
  pvp: (dev?: boolean) => clave("farma:pvp", dev),
  // Pedidos fichados por María: hash pedido → orderedAt (epoch ms del check).
  pedidosHechos: (dev?: boolean) => clave("farma:pedidos-hechos", dev),
  // Borrador de etiquetado de PVP (mutable, admin): blob JSON {tamanos, cantidades,
  // extras} con lo que María prepara en la pantalla PVP y aún no ha impreso/limpiado.
  pvpEtiquetas: (dev?: boolean) => clave("farma:pvp-etiquetas", dev),
  // Ventas cruzadas (mutable, lo edita María): blob JSON codigo → [códigos recomendados].
  // Dirigido (A→B no implica B→A). Lo lee la vista de mostrador y el panel; lo muta la
  // ruta de recomendaciones. El seed solo lo puebla si no existe (no pisa a María).
  recomendaciones: (dev?: boolean) => clave("farma:recomendaciones", dev),
  // Contadores de uso por día (YYYY-MM-DD, Madrid): hash campo→conteo con HINCRBY.
  // Sin TTL (a ~3.650 hashes diminutos en 10 años, escala de sobra). Agregados y sin
  // ningún dato identificable — por eso pueden pintarse en una página sin clave. Un
  // campo nuevo tiene que seguir cumpliéndolo.
  metricas: (fecha: string, dev?: boolean) => clave(`farma:metricas:${fecha}`, dev),
  // Motivo del último inventario rechazado (fecha + texto breve), para diagnóstico.
  metricasErrorInventario: (dev?: boolean) => clave("farma:metricas:inventario-ultimo-error", dev),
};
