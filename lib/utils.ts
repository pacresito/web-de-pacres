// Utilidades compartidas de front.

/** Edad en años cumplidos a partir de la fecha de nacimiento. */
export function calcularEdad(nacimiento: Date): number {
  const hoy = new Date();
  const cumple = new Date(hoy.getFullYear(), nacimiento.getMonth(), nacimiento.getDate());
  return hoy.getFullYear() - nacimiento.getFullYear() - (hoy < cumple ? 1 : 0);
}
