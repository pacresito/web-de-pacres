// Cálculo de pedidos a partir del snapshot de inventario y la referencia de Ventas.
// Lógica pura, testeable con `npx tsx lib/farma/pedidos.test.ts`. Fuera del build.
//
// Reglas (del plan, cambios jun-26 #1/#2/#3):
// - Línea para pedir: cantidad > 0, i.e. existencias < max(StMín, ceil(consumo)).
//   Incluye artículos sin rotura pero por debajo del consumo (no solo los rotos).
// - Cantidad (#2): max(0, max(StMín, ceil(consumo_mensual)) − stock). El objetivo
//   es el máximo entre stock mínimo y consumo (ya no solo el consumo).
// - Rotura: stock < StMín. Ya no decide por sí sola si hay línea; solo cuenta para
//   la condición #1a de que el pedido sea pendiente.
// - Pedido pendiente (#1): un pedido entra en la lista solo si cumple LAS DOS:
//   (a) ≥1 artículo en rotura  y  (b) ≥6 líneas para pedir (≥6 artículos con
//   cantidad > 0). El umbral de 6 evita disparar pedidos minúsculos.
// - Stock mínimo > consumo (#3): ya no es un error (con el objetivo = max, pides
//   hasta el StMín). Aviso informativo: se cuenta sobre TODO el universo de stock
//   mínimo, haya rotura o no (lo revisa María en la pantalla Inventario); aquí solo
//   va el total para la línea-resumen sutil.
// - Ciclo de vida por LABORATORIO (María hace check a nivel de lab); solo se
//   construyen los pedidos que cumplen #1:
//     · pendiente: cumple #1 y no está fichado, o lo está pero pasaron 5 días.
//     · ya hecho: fichado hace < 5 días.
//     · resuelto: si un inventario nuevo deja de cumplir #1 (se quita la rotura o
//       caen las líneas por debajo de 6), el lab no se construye (desaparece).

const CINCO_DIAS_MS = 5 * 24 * 60 * 60 * 1000;
const MIN_LINEAS_PEDIDO = 6; // #1b: un pedido con menos líneas no se considera pendiente

export interface RefArticulo {
  denominacion: string;
  lab: string;
  consumoMensual: number; // ceil(unidades_anuales / 12), de Ventas
}

export type RefPedidos = Record<string, RefArticulo>; // codigo → ref
export type Stocks = Record<string, number>; // codigo → stock (snapshot del último inventario)
export type StMins = Record<string, number>; // codigo → StMín (editable por María)
export type Hechos = Record<string, number>; // lab → orderedAt (epoch ms del check)

export interface LineaPedido {
  codigo: string;
  denominacion: string;
  cantidad: number;
}

export interface BolsaLab {
  lab: string;
  lineas: LineaPedido[];
}

export interface PedidoHecho extends BolsaLab {
  orderedAt: number;
}

export interface ResultadoPedidos {
  pendientes: BolsaLab[];
  hechos: PedidoHecho[];
  alertasStockMinimo: number; // artículos con stock mínimo > consumo (todo el universo) → Inventario
  huerfanos: string[]; // códigos en rotura sin entrada en refPedidos → avisar a Pablo
}

// Cantidad a pedir de un artículo (#2): subir hasta max(StMín, ceil(consumo)) − stock,
// nunca negativo. Sin ref de Ventas, el objetivo es solo el StMín.
function cantidadAPedir(min: number, ref: RefArticulo | undefined, existencias: number): number {
  const objetivo = ref ? Math.max(min, Math.ceil(ref.consumoMensual)) : min;
  return Math.max(0, objetivo - existencias);
}

// Lista de pedidos (labs) del universo gestionado, ordenada. Alimenta el buscador del
// pedido manual (B5): María puede elegir cualquiera, tenga rotura o no.
export function listarLabs(refPedidos: RefPedidos, stMin: StMins): string[] {
  const labs = new Set<string>();
  for (const codigo of Object.keys(stMin)) {
    const ref = refPedidos[codigo];
    if (ref) labs.add(ref.lab);
  }
  return [...labs].sort((a, b) => a.localeCompare(b, "es"));
}

// Bolsa de un pedido (lab) concreto saltándose la condición #1: para el pedido manual
// que María genera aunque nada haya roto stock. Mismas líneas (cantidad > 0) y orden
// que tendría en `pendientes`. Devuelve null si no hay nada que pedir en ese lab.
export function bolsaDeLab(
  lab: string,
  stock: Stocks,
  refPedidos: RefPedidos,
  stMin: StMins,
): BolsaLab | null {
  const lineas: LineaPedido[] = [];
  for (const [codigo, min] of Object.entries(stMin)) {
    const ref = refPedidos[codigo];
    if (!ref || ref.lab !== lab) continue;
    const cantidad = cantidadAPedir(min, ref, stock[codigo] ?? 0);
    if (cantidad > 0) lineas.push({ codigo, denominacion: ref.denominacion, cantidad });
  }
  if (lineas.length === 0) return null;
  lineas.sort((a, b) => a.denominacion.localeCompare(b.denominacion, "es"));
  return { lab, lineas };
}

export function calcularPedidos(
  stock: Stocks,
  refPedidos: RefPedidos,
  stMin: StMins,
  hechos: Hechos,
  now: number,
): ResultadoPedidos {
  const porLab = new Map<string, { lineas: LineaPedido[]; hayRotura: boolean }>();
  const huerfanos: string[] = [];
  let alertasStockMinimo = 0;

  // El universo gestionado es el de artículos con StMín definido.
  for (const [codigo, min] of Object.entries(stMin)) {
    const ref = refPedidos[codigo];

    // Stock mínimo > consumo (#3): cuenta sobre todo el universo, haya rotura o no.
    if (ref && min > ref.consumoMensual) alertasStockMinimo++;

    const existencias = stock[codigo] ?? 0; // ausente del inventario = 0 unidades

    const cantidad = cantidadAPedir(min, ref, existencias);
    if (cantidad <= 0) continue; // ya cubierto: no es línea para pedir

    if (!ref) {
      huerfanos.push(codigo); // hay que pedir pero no está en la referencia de Ventas
      continue;
    }

    const grupo = porLab.get(ref.lab) ?? { lineas: [], hayRotura: false };
    grupo.lineas.push({ codigo, denominacion: ref.denominacion, cantidad });
    if (existencias < min) grupo.hayRotura = true; // rotura (#1a)
    porLab.set(ref.lab, grupo);
  }

  const pendientes: BolsaLab[] = [];
  const hechosOut: PedidoHecho[] = [];

  for (const [lab, { lineas, hayRotura }] of porLab) {
    // #1: solo es pedido si tiene ≥1 rotura Y ≥6 líneas para pedir.
    if (!hayRotura || lineas.length < MIN_LINEAS_PEDIDO) continue;

    lineas.sort((a, b) => a.denominacion.localeCompare(b.denominacion, "es"));
    const orderedAt = hechos[lab];
    if (orderedAt && now - orderedAt < CINCO_DIAS_MS) {
      hechosOut.push({ lab, orderedAt, lineas });
    } else {
      pendientes.push({ lab, lineas }); // sin fichar, o fichado hace ≥5 días → reabre
    }
  }

  pendientes.sort((a, b) => a.lab.localeCompare(b.lab, "es"));
  hechosOut.sort((a, b) => b.orderedAt - a.orderedAt); // más reciente primero
  return { pendientes, hechos: hechosOut, alertasStockMinimo, huerfanos };
}
