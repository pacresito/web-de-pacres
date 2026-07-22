// Los dos mapas de Fuera de Ruta son Leaflet a pelo, y Leaflet interpola HTML crudo en
// los `divIcon`, `bindTooltip` y `bindPopup`: un nombre con `<` inyectaría marcado. Hoy el
// JSON es de solo lectura y curado por nosotros, pero escapar cuesta tres líneas y quita
// el pie de que un dato futuro —u otra provincia— traiga uno.
export const escapar = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
