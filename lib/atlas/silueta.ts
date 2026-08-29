// El marco de tinta de una silueta: por dónde empieza y por dónde acaba el dibujo dentro del
// lienzo de 1000×1000 en el que viene normalizado.
//
// La normalización es al lado mayor, así que un país estrecho —Chile, Portugal, Noruega— queda
// centrado con el lienzo medio vacío a los lados. En la ficha ese vacío no se distingue del hueco
// entre columnas: separa el texto del mapa sin decir nada, y encima una cantidad distinta en cada
// país.
//
// Lógica pura: se verifica con `npx tsx lib/atlas/silueta.test.ts`.

/**
 * El viewBox que ciñe el dibujo a lo ancho conservando el alto. **En vertical no se recorta**: la
 * escala la manda el lado largo del lienzo, así que ceñir también arriba y abajo agrandaría las
 * siluetas estrechas y dejarían de medir lo mismo que la de al lado.
 */
export function marcoDeTinta(d: string): string {
  const n = d.match(/-?\d+(?:\.\d+)?/g);
  let min = Infinity;
  let max = -Infinity;
  // `M x,y L x,y … Z`: no hay más comandos que esos, así que las x son las posiciones pares.
  for (let i = 0; n && i < n.length; i += 2) {
    const x = +n[i];
    if (x < min) min = x;
    if (x > max) max = x;
  }
  return min > max ? "0 0 1000 1000" : `${min.toFixed(1)} 0 ${(max - min).toFixed(1)} 1000`;
}
