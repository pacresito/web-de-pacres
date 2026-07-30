// Lectura de la `dosis` que llega en el body de las rutas de descuento: campo libre y
// opcional, la excepción de los principios cuyo descuento cambia con la presentación.
// Se normaliza a MAYÚSCULAS porque se concatena con el resto de la denominación, que
// viene en mayúsculas del pipeline. Devuelve Error para que la ruta responda 400.
// El tope lo comparten los campos de Descuentos (`maxLength`) y esta validación: el campo
// no deja teclear de más, y esto lo comprueba igual porque el cliente no es la puerta.
export const MAX_DOSIS = 20;

export function leerDosis(raw: unknown): string | undefined | Error {
  if (raw === undefined || raw === null || raw === "") return undefined;
  if (typeof raw !== "string") return new Error("Dosis inválida");
  const dosis = raw.trim().toUpperCase();
  if (dosis.length > MAX_DOSIS) return new Error(`Dosis de ${MAX_DOSIS} caracteres como mucho`);
  return dosis || undefined;
}
