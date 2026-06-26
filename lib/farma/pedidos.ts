// Cálculo de pedidos a partir del snapshot de inventario y la referencia de Ventas.
// Lógica pura, testeable con `npx tsx lib/farma/pedidos.test.ts`. Fuera del build.
//
// Reglas (del plan):
// - Rotura: stock < StMín ⟹ el artículo entra en pedido.
// - Cantidad: ceil(consumo_mensual) − stock, nunca negativa. El objetivo es solo
//   el consumo, nunca el StMín. Si sale ≤ 0 (ya cubres el mes pese a la rotura) la
//   línea va con cantidad 0: María decide, y Unycop no deja pedir 0 → avisa sola.
// - Stock mínimo > consumo: señal de stock mínimo mal puesto (heredado/desubicado).
//   Se cuenta sobre TODO el universo de stock mínimo, haya rotura o no (lo revisa
//   María en la pantalla Mínimos); aquí solo va el total para la línea-resumen.
// - Ciclo de vida por LABORATORIO (María hace check a nivel de lab):
//     · pendiente: el lab tiene ≥1 artículo en rotura y no está fichado, o lo está
//       pero ya pasaron 5 días y sigue la rotura (se reabre).
//     · ya hecho: fichado hace < 5 días.
//     · resuelto: si un inventario nuevo quita la rotura, el lab no se construye
//       (desaparece de ambas listas).

const CINCO_DIAS_MS = 5 * 24 * 60 * 60 * 1000;

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
  alertasStockMinimo: number; // artículos con stock mínimo > consumo (todo el universo) → Mínimos
  huerfanos: string[]; // códigos en rotura sin entrada en refPedidos → avisar a Pablo
}

export function calcularPedidos(
  stock: Stocks,
  refPedidos: RefPedidos,
  stMin: StMins,
  hechos: Hechos,
  now: number,
): ResultadoPedidos {
  const porLab = new Map<string, LineaPedido[]>();
  const huerfanos: string[] = [];
  let alertasStockMinimo = 0;

  // El universo gestionado es el de artículos con StMín definido.
  for (const [codigo, min] of Object.entries(stMin)) {
    const ref = refPedidos[codigo];

    // Stock mínimo > consumo: cuenta sobre todo el universo, haya rotura o no.
    if (ref && min > ref.consumoMensual) alertasStockMinimo++;

    const existencias = stock[codigo] ?? 0; // ausente del inventario = 0 unidades
    if (existencias >= min) continue; // sin rotura

    if (!ref) {
      huerfanos.push(codigo); // en rotura pero sin datos de Ventas
      continue;
    }

    const cantidad = Math.max(0, Math.ceil(ref.consumoMensual) - existencias);
    if (!porLab.has(ref.lab)) porLab.set(ref.lab, []);
    porLab.get(ref.lab)!.push({ codigo, denominacion: ref.denominacion, cantidad });
  }

  const pendientes: BolsaLab[] = [];
  const hechosOut: PedidoHecho[] = [];

  for (const [lab, lineas] of porLab) {
    lineas.sort((a, b) => a.denominacion.localeCompare(b.denominacion, "es"));
    const orderedAt = hechos[lab];
    if (orderedAt && now - orderedAt < CINCO_DIAS_MS) {
      hechosOut.push({ lab, orderedAt, lineas });
    } else {
      pendientes.push({ lab, lineas }); // sin fichar, o fichado hace ≥5 días con rotura → reabre
    }
  }

  pendientes.sort((a, b) => a.lab.localeCompare(b.lab, "es"));
  hechosOut.sort((a, b) => b.orderedAt - a.orderedAt); // más reciente primero
  return { pendientes, hechos: hechosOut, alertasStockMinimo, huerfanos };
}
