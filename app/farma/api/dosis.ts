// Lectura de la `dosis` que llega en el body de las rutas de descuento: campo libre y
// opcional, la excepción de los principios cuyo descuento cambia con la presentación.
// Se normaliza a MAYÚSCULAS porque se concatena con el resto de la denominación, que
// viene en mayúsculas del pipeline. Devuelve Error para que la ruta responda 400.
const MAX = 20;

export function leerDosis(raw: unknown): string | undefined | Error {
  if (raw === undefined || raw === null || raw === "") return undefined;
  if (typeof raw !== "string") return new Error("Dosis inválida");
  const dosis = raw.trim().toUpperCase();
  if (dosis.length > MAX) return new Error(`Dosis de ${MAX} caracteres como mucho`);
  return dosis || undefined;
}
