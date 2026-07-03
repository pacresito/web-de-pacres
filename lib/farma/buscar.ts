// Búsqueda de los buscadores de /farma: normaliza acentos/mayúsculas y tolera pequeños
// typos. Lógica pura compartida por Buscador, Inventario y Descuentos (test: buscar.test.ts).

// \u0300-\u036f: los diacríticos combinantes que NFD separa (tildes, diéresis).
export const sinAcentos = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

// Ediciones permitidas según la longitud de la consulta: nada por debajo de 4 (una letra
// mal en algo tan corto encaja con demasiadas cosas), 1 hasta 7, 2 de 8 en adelante.
const umbral = (len: number) => (len < 4 ? 0 : len < 8 ? 1 : 2);

// Distancia de edición mínima entre la consulta q y CUALQUIER prefijo de la palabra w
// (Damerau-OSA: una transposición de letras contiguas cuesta 1). Comparar contra prefijos
// —no solo la palabra entera— tolera un typo aunque q sea el nombre a medio teclear
// ("anlodipi" case con "amlodipino": las letras que aún no se han escrito no penalizan).
// Con corte: si supera max, devuelve max+1.
function distanciaPrefijo(q: string, w: string, max: number): number {
  if (w.length < q.length - max) return max + 1; // w demasiado corta para contener a q
  let prev2: number[] = [];
  let prev = Array.from({ length: w.length + 1 }, (_, j) => j); // fila 0: j borrados
  for (let i = 1; i <= q.length; i++) {
    const fila = [i];
    for (let j = 1; j <= w.length; j++) {
      const coste = q[i - 1] === w[j - 1] ? 0 : 1;
      let v = Math.min(prev[j] + 1, fila[j - 1] + 1, prev[j - 1] + coste);
      if (i > 1 && j > 1 && q[i - 1] === w[j - 2] && q[i - 2] === w[j - 1]) {
        v = Math.min(v, prev2[j - 2] + 1); // transposición adyacente
      }
      fila[j] = v;
    }
    prev2 = prev;
    prev = fila;
  }
  return Math.min(...prev); // mejor prefijo de w = mínimo de la última fila
}

const palabras = (consulta: string) => consulta.split(/\s+/).filter(Boolean);

// Estricta: cada palabra de la consulta aparece como substring del texto (orden
// indiferente, sin tolerancia a typos). La consulta debe venir normalizada (sinAcentos).
export function contiene(texto: string, consulta: string): boolean {
  const t = sinAcentos(texto);
  return palabras(consulta).every((q) => t.includes(q));
}

// Tolerante: cada palabra de la consulta aparece como substring o, si no, está a pocas
// ediciones de alguna palabra del texto (typos). Es la red de la búsqueda estricta, no su
// sustituta: se usa solo vía filtrarFallback, cuando la estricta no da resultados.
export function coincide(texto: string, consulta: string): boolean {
  const t = sinAcentos(texto);
  const palabrasTexto = t.split(/\s+/);
  return palabras(consulta).every((q) => {
    if (t.includes(q)) return true;
    const max = umbral(q.length);
    return max > 0 && palabrasTexto.some((w) => distanciaPrefijo(q, w, max) <= max);
  });
}

// Filtra con la estricta y, solo si no encuentra nada, reabre con la tolerante. Así los
// typos rescatan la búsqueda cuando iba a quedarse vacía, sin ensuciar los aciertos exactos
// (buscar "amlo" no debe colar "almotriptan" por una transposición).
export function filtrarFallback<T>(
  items: T[],
  estricta: (x: T) => boolean,
  tolerante: (x: T) => boolean,
): T[] {
  const exactos = items.filter(estricta);
  return exactos.length ? exactos : items.filter(tolerante);
}
