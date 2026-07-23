// Los viajes que el botón «Guardar» del panel «Mi viaje» deja en este navegador, y que
// lee la pantalla `/fuera-de-ruta/guardados`. Solo se llama desde el cliente.
//
// Un viaje guardado es el **perfil** (las respuestas del cuestionario) + la **selección**
// de actividades; no el plan calculado, que se vuelve a montar al abrir (la pantalla lo
// dice). La provincia va aparte: la lista es de todas las provincias, y el perfil no la
// lleva (viaja en la ruta). `id` y `guardadoEn` son para borrar y ordenar.
import type { Respuestas } from "../cuestionario/preguntas";

const CLAVE = "fr:guardados";
const CLAVE_ABRIR = "fr:abrir"; // handoff «Mis viajes» → crear-viaje al reabrir un viaje

export type ViajeGuardado = {
  id: string;
  provincia: string;    // slug de URL ("navarra")
  guardadoEn: string;   // ISO; ordena la lista
  perfil: Respuestas;   // respuestas del cuestionario (bloques viajero + viaje)
  seleccion: string[];  // slugs de las actividades añadidas al viaje
};

// Lo guardado con el modelo viejo (encargo del planificador) no tiene esta forma: la
// validación lo descarta y el primer `guardarViaje` reescribe la lista ya limpia.
const esGuardado = (v: unknown): v is ViajeGuardado => {
  const g = v as Partial<ViajeGuardado> | null;
  return !!g && typeof g === "object"
    && typeof g.id === "string"
    && typeof g.provincia === "string"
    && typeof g.guardadoEn === "string"
    && !!g.perfil && typeof g.perfil === "object" && !Array.isArray(g.perfil)
    && Array.isArray(g.seleccion) && g.seleccion.every((s) => typeof s === "string");
};

export function leerGuardados(): ViajeGuardado[] {
  try {
    const crudo: unknown = JSON.parse(localStorage.getItem(CLAVE) || "[]");
    if (!Array.isArray(crudo)) return [];
    return crudo.filter(esGuardado).sort((a, b) => b.guardadoEn.localeCompare(a.guardadoEn));
  } catch {
    return [];
  }
}

// Guardar el mismo viaje (mismo perfil y misma selección) dos veces lo refresca, no lo
// duplica. Compara por el par serializado; lo construye siempre el mismo código.
export function guardarViaje(provincia: string, perfil: Respuestas, seleccion: string[]): ViajeGuardado {
  const clave = huella(perfil, seleccion);
  const nuevo: ViajeGuardado = {
    id: crypto.randomUUID(),
    provincia,
    guardadoEn: new Date().toISOString(),
    perfil,
    seleccion,
  };
  const otros = leerGuardados().filter(
    (g) => !(g.provincia === provincia && huella(g.perfil, g.seleccion) === clave),
  );
  escribir([nuevo, ...otros]);
  return nuevo;
}

export function borrarGuardado(id: string): void {
  escribir(leerGuardados().filter((g) => g.id !== id));
}

// --- Reabrir un viaje: handoff por localStorage (no por URL) ---
// «Mis viajes» es local; reabrir es una acción local, no un enlace compartible. Dejamos
// el perfil + selección en una clave y crear-viaje los recoge (y borra) al montar.
export function marcarParaAbrir(v: ViajeGuardado): void {
  localStorage.setItem(CLAVE_ABRIR, JSON.stringify({ provincia: v.provincia, perfil: v.perfil, seleccion: v.seleccion }));
}

export function tomarParaAbrir(provincia: string): { perfil: Respuestas; seleccion: string[] } | null {
  try {
    const raw = localStorage.getItem(CLAVE_ABRIR);
    if (!raw) return null;
    localStorage.removeItem(CLAVE_ABRIR); // de un solo uso
    const o = JSON.parse(raw) as { provincia?: string; perfil?: Respuestas; seleccion?: string[] };
    if (o?.provincia !== provincia) return null;
    return { perfil: o.perfil ?? {}, seleccion: Array.isArray(o.seleccion) ? o.seleccion : [] };
  } catch {
    return null;
  }
}

// Huella estable de un viaje (perfil + selección ordenada) para deduplicar.
const huella = (perfil: Respuestas, seleccion: string[]) =>
  JSON.stringify(perfil) + "|" + [...seleccion].sort().join(",");

// Sin try/catch a propósito: si el navegador no deja escribir (cuota, modo privado),
// quien llama necesita enterarse para decírselo al usuario.
const escribir = (lista: ViajeGuardado[]) => localStorage.setItem(CLAVE, JSON.stringify(lista));
