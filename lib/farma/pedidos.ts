// Cálculo de pedidos a partir del snapshot de inventario y la referencia de Ventas.
// Lógica pura, testeable con `npx tsx lib/farma/pedidos.test.ts`. Fuera del build.
//
// El eje de agrupación es el PEDIDO, no el laboratorio del producto: un mismo lab puede
// partirse en varios pedidos. `pedidosDeCodigo` (codigo → [pedidos], clave Redis
// `farma:ref:pedido-codigos`) dice a qué pedido(s) va cada artículo; un código puede ir
// en varios por colisión almacén ↔ marca. El `lab` del `RefArticulo` es otro eje (el del
// producto en Ventas) y aquí no agrupa.
//
// Reglas:
// - Universo: todo artículo de Ventas es reponible por su consumo, tenga o no StMín.
//   El StMín es opcional: sin él, el objetivo es solo el consumo.
// - Cantidad: max(0, max(StMín, ceil(consumo_mensual)) − stock). Hay línea que pedir
//   cuando sale > 0, esté el artículo en rotura o solo por debajo de su consumo.
// - Rotura: stock < StMín. Un artículo sin StMín nunca rompe: aporta su línea por
//   consumo pero no dispara el pedido por sí solo (por el manual sí es pedible).
// - Pedido pendiente: entra en la lista solo si cumple LAS DOS: ≥1 artículo en rotura
//   y ≥6 líneas que pedir. El umbral de 6 evita disparar pedidos minúsculos.
// - Un artículo de Ventas que no esté en ningún pedido se IGNORA: no se puede reponer
//   por la herramienta.
// - Stock mínimo > consumo no es un error (con el objetivo = max, pides hasta el
//   StMín). Solo un aviso informativo, contado sobre TODO el universo de stock mínimo
//   haya rotura o no; aquí va únicamente el total para la línea-resumen.
// - Ciclo de vida por PEDIDO, disparado por la DESCARGA del .xls:
//     · descargado: hace < 5 días → va a "descargados" aunque no cumpla lo de arriba.
//       Así entran también los pedidos manuales que María descarga.
//     · pendiente: cumple las dos condiciones y no se descargó hace < 5 días.
//     · resuelto: si un inventario nuevo lo repone del todo (ninguna línea con cantidad
//       > 0), no se construye y desaparece de ambas listas.

import { tamanoCaja } from "./cajas-lacer";

const CINCO_DIAS_MS = 5 * 24 * 60 * 60 * 1000;
const MIN_LINEAS_PEDIDO = 6; // #1b: un pedido con menos líneas no se considera pendiente

export interface RefArticulo {
  denominacion: string;
  lab: string; // laboratorio del producto (eje de Prioridades/Descuentos); aquí no agrupa
  consumoMensual: number; // ceil(unidades_anuales / 12), de Ventas
}

export type RefPedidos = Record<string, RefArticulo>; // codigo → ref
export type PedidosDeCodigo = Record<string, string[]>; // codigo → pedidos a los que pertenece
export type Stocks = Record<string, number>; // codigo → stock (snapshot del último inventario)
export type StMins = Record<string, number>; // codigo → StMín (editable por María)
export type Hechos = Record<string, number>; // pedido → orderedAt (epoch ms del check)

export interface LineaPedido {
  codigo: string;
  denominacion: string;
  cantidad: number;
  // Contexto para que María vea por qué está la línea y de dónde sale la cantidad:
  // existencias del inventario, consumo mensual (de Ventas) y StMín (null = sin definir).
  existencias: number;
  consumo: number;
  min: number | null;
}

export interface BolsaPedido {
  pedido: string;
  lineas: LineaPedido[];
}

export interface PedidoHecho extends BolsaPedido {
  orderedAt: number;
}

export interface ResultadoPedidos {
  pendientes: BolsaPedido[];
  hechos: PedidoHecho[];
  alertasStockMinimo: number; // artículos con stock mínimo > consumo (todo el universo) → Inventario
  huerfanos: string[]; // códigos en rotura sin entrada en refPedidos → avisar a Pablo
}

// Cantidad a pedir de un artículo (#2): subir hasta max(StMín, ceil(consumo)) − stock,
// nunca negativo. Sin ref de Ventas, el objetivo es solo el StMín. Si el artículo se
// pide por caja (caja > 1, p. ej. Lacer), se redondea al alza al múltiplo de caja: se
// piden cajas completas, dejando las existencias en o por encima del objetivo.
function cantidadAPedir(min: number, ref: RefArticulo | undefined, existencias: number, caja = 1): number {
  const objetivo = ref ? Math.max(min, Math.ceil(ref.consumoMensual)) : min;
  const bruto = Math.max(0, objetivo - existencias);
  return caja > 1 ? Math.ceil(bruto / caja) * caja : bruto;
}

// Lista de pedidos del universo de Ventas, ordenada. Alimenta el buscador del pedido
// manual (B5): María puede elegir cualquiera, tenga rotura o no. Entran los pedidos
// con al menos un artículo de Ventas.
export function listarPedidos(pedidosDeCodigo: PedidosDeCodigo, refPedidos: RefPedidos): string[] {
  const pedidos = new Set<string>();
  for (const codigo of Object.keys(refPedidos)) {
    for (const pedido of pedidosDeCodigo[codigo] ?? []) pedidos.add(pedido);
  }
  return [...pedidos].sort((a, b) => a.localeCompare(b, "es"));
}

// TODAS las líneas de un pedido, incluidas las de cantidad 0: es lo que baja al .xls,
// donde María quiere el catálogo entero del pedido (las que no se piden, con 0). El
// universo sigue siendo Ventas: un código del Excel del lab sin historial no está en
// `refPedidos` y por tanto no tiene línea.
export function lineasDePedido(
  pedido: string,
  stock: Stocks,
  refPedidos: RefPedidos,
  stMin: StMins,
  pedidosDeCodigo: PedidosDeCodigo,
): LineaPedido[] {
  const lineas: LineaPedido[] = [];
  for (const [codigo, ref] of Object.entries(refPedidos)) {
    if (!(pedidosDeCodigo[codigo] ?? []).includes(pedido)) continue;
    const existencias = stock[codigo] ?? 0;
    const cantidad = cantidadAPedir(stMin[codigo] ?? 0, ref, existencias, tamanoCaja(codigo, pedidosDeCodigo[codigo] ?? []));
    lineas.push({ codigo, denominacion: ref.denominacion, cantidad, existencias, consumo: ref.consumoMensual, min: stMin[codigo] ?? null });
  }
  lineas.sort((a, b) => a.denominacion.localeCompare(b.denominacion, "es"));
  return lineas;
}

// Bolsa de un pedido concreto saltándose la condición #1: para el pedido manual que
// María genera aunque nada haya roto stock. Mismas líneas (cantidad > 0) y orden que
// tendría en `pendientes`. Devuelve null si no hay nada que pedir en ese pedido.
export function bolsaDePedido(
  pedido: string,
  stock: Stocks,
  refPedidos: RefPedidos,
  stMin: StMins,
  pedidosDeCodigo: PedidosDeCodigo,
): BolsaPedido | null {
  const lineas = lineasDePedido(pedido, stock, refPedidos, stMin, pedidosDeCodigo).filter((l) => l.cantidad > 0);
  return lineas.length === 0 ? null : { pedido, lineas };
}

export function calcularPedidos(
  stock: Stocks,
  refPedidos: RefPedidos,
  stMin: StMins,
  pedidosDeCodigo: PedidosDeCodigo,
  hechos: Hechos,
  now: number,
): ResultadoPedidos {
  const porPedido = new Map<string, { lineas: LineaPedido[]; hayRotura: boolean }>();
  const huerfanos: string[] = [];
  let alertasStockMinimo = 0;

  // El universo es el de Ventas (ref): todo artículo con consumo es reponible, tenga
  // o no StMín. Se suman los códigos con StMín fuera de Ventas (sin historial al que
  // María puso mínimo) para detectarlos como huérfanos.
  const codigos = new Set([...Object.keys(refPedidos), ...Object.keys(stMin)]);
  for (const codigo of codigos) {
    const min = stMin[codigo] ?? 0; // sin StMín definido = 0 (el objetivo lo pone el consumo)
    const ref = refPedidos[codigo];

    // Stock mínimo > consumo (#3): cuenta sobre todo el universo, haya rotura o no.
    if (ref && min > ref.consumoMensual) alertasStockMinimo++;

    const existencias = stock[codigo] ?? 0; // ausente del inventario = 0 unidades

    const cantidad = cantidadAPedir(min, ref, existencias, tamanoCaja(codigo, pedidosDeCodigo[codigo] ?? []));
    if (cantidad <= 0) continue; // ya cubierto: no es línea para pedir

    if (!ref) {
      huerfanos.push(codigo); // hay que pedir pero no está en la referencia de Ventas
      continue;
    }

    // Sin pedido en la carpeta → se ignora (no es reponible por la herramienta).
    const pedidos = pedidosDeCodigo[codigo];
    if (!pedidos || pedidos.length === 0) continue;

    // Un código puede ir en varios pedidos (colisión): suma su línea a cada uno.
    for (const pedido of pedidos) {
      const grupo = porPedido.get(pedido) ?? { lineas: [], hayRotura: false };
      grupo.lineas.push({ codigo, denominacion: ref.denominacion, cantidad, existencias, consumo: ref.consumoMensual, min: stMin[codigo] ?? null });
      if (existencias < min) grupo.hayRotura = true; // rotura (#1a): solo dispara con StMín definido
      porPedido.set(pedido, grupo);
    }
  }

  const pendientes: BolsaPedido[] = [];
  const hechosOut: PedidoHecho[] = [];

  for (const [pedido, { lineas, hayRotura }] of porPedido) {
    lineas.sort((a, b) => a.denominacion.localeCompare(b.denominacion, "es"));
    const orderedAt = hechos[pedido];
    if (orderedAt && now - orderedAt < CINCO_DIAS_MS) {
      hechosOut.push({ pedido, orderedAt, lineas }); // descargado hace < 5 días (aunque no cumpla #1)
    } else if (hayRotura && lineas.length >= MIN_LINEAS_PEDIDO) {
      pendientes.push({ pedido, lineas }); // #1 y sin descargar (o descargado hace ≥ 5 días) → reabre
    }
  }

  pendientes.sort((a, b) => a.pedido.localeCompare(b.pedido, "es"));
  hechosOut.sort((a, b) => b.orderedAt - a.orderedAt); // más reciente primero
  return { pendientes, hechos: hechosOut, alertasStockMinimo, huerfanos };
}
