// «Mis viajes» en localStorage. Se guarda perfil + selección, no el plan: al abrir se
// vuelve a planificar. Solo cliente.
import type { Respuestas } from "../cuestionario/preguntas";

const CLAVE = "fr:guardados";
const CLAVE_ABRIR = "fr:abrir"; // handoff «Mis viajes» → crear-viaje

export type ViajeGuardado = {
  id: string;
  provincia: string;    // slug de URL ("navarra")
  guardadoEn: string;   // ISO
  perfil: Respuestas;
  seleccion: string[];  // slugs
};

// Lo que no tenga esta forma se descarta, y el siguiente guardado limpia la lista.
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

// Guardar dos veces el mismo viaje lo refresca, no lo duplica.
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

// Reabrir es local, no un enlace compartible: se deja el viaje en una clave que
// crear-viaje recoge y borra al montar.
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

const huella = (perfil: Respuestas, seleccion: string[]) =>
  JSON.stringify(perfil) + "|" + [...seleccion].sort().join(",");

// Sin try/catch: el fallo al escribir lo gestiona quien llama.
const escribir = (lista: ViajeGuardado[]) => localStorage.setItem(CLAVE, JSON.stringify(lista));
