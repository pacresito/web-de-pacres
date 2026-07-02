import { requireAdmin } from "../../auth";
import Inventario, { type ArticuloMin } from "../../Inventario";
import redis from "@/lib/redis";
import { KEYS } from "@/lib/farma/keys";
import type { RefPedidos } from "@/lib/farma/pedidos";

// Inventario (admin): ajustar el stock mínimo de cada artículo (hash mutable
// farma:stmin) junto a su consumo mensual (de la referencia de Ventas, solo
// lectura). El universo es el de artículos con stock mínimo definido; los que no
// están en la referencia se omiten (sin denominación ni consumo que mostrar).
// Los artículos en stock pero fuera del universo aparecen como "sin historial"
// (visible solo con el filtro correspondiente).
export default async function InventarioPage() {
  await requireAdmin();

  const [refRaw, stmin, stock, pvpRaw] = await Promise.all([
    redis.get(KEYS.refPedidos()),
    redis.hgetall(KEYS.stmin()),
    redis.hgetall(KEYS.stock()),
    redis.hgetall(KEYS.pvp()),
  ]);
  const ref: RefPedidos = refRaw ? JSON.parse(refRaw) : {};

  // StMín de un artículo: el hash farma:stmin solo guarda los > 0 (lo demás aún no
  // tiene mínimo). Ausente = null, que se muestra como "—" y es editable igual.
  const stMinDe = (codigo: string): number | null => (codigo in stmin ? Number(stmin[codigo]) : null);

  // Universo normal: TODO el de Ventas (ref). Tenga o no StMín, tiene consumo.
  const articulosNormales: ArticuloMin[] = Object.entries(ref).map(([codigo, r]) => ({
    codigo,
    denominacion: r.denominacion,
    stMin: stMinDe(codigo),
    consumoMensual: r.consumoMensual,
    existencias: Number(stock[codigo] ?? 0),
  }));

  // Sin historial: en stock pero fuera de Ventas → no sabemos su consumo.
  const refCodigos = new Set(Object.keys(ref));
  const articulosSinHistorial: ArticuloMin[] = Object.entries(stock)
    .filter(([codigo]) => !refCodigos.has(codigo))
    .map(([codigo, existencias]) => {
      const pvp = pvpRaw[codigo] ? JSON.parse(pvpRaw[codigo]) : null;
      return {
        codigo,
        denominacion: pvp?.denominacion ?? codigo,
        stMin: stMinDe(codigo),
        consumoMensual: 0,
        existencias: Number(existencias),
        sinHistorial: true,
      };
    });

  const articulos = [...articulosNormales, ...articulosSinHistorial];

  return (
    <main className="p-[16px]">
      <Inventario articulos={articulos} />
    </main>
  );
}
