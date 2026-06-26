// "hace X" en español, redondeado a la unidad mayor (min / h / días). Lo comparten
// el panel de María y la lista de Pedidos para fechar cargas y pedidos.
export function haceX(epoch: number, ahora: number): string {
  const s = Math.max(0, ahora - epoch) / 1000;
  if (s < 60) return "hace un momento";
  const m = Math.floor(s / 60);
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return `hace ${d} ${d === 1 ? "día" : "días"}`;
}
