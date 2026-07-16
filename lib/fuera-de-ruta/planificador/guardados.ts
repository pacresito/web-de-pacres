// Los viajes que el botón «Guardar» de Crear mi viaje deja en este navegador, y que
// lee la pantalla `/fuera-de-ruta/guardados`. Solo se llama desde el cliente.
//
// El guardado *envuelve* al encargo en vez de ampliarlo: el `Encargo` es lo que viaja
// por la URL, donde la provincia ya va en la ruta y llevarla dentro además la podría
// contradecir. Aquí sí hace falta (la lista es de todas las provincias), junto con lo
// que solo importa a este navegador: cuándo se guardó, y un id para poder borrarlo.
import { serializarEncargo, validarEncargo, type Encargo } from "./encargo";

const CLAVE = "fr:guardados";

export type ViajeGuardado = {
  id: string;
  provincia: string;   // slug de URL ("navarra")
  guardadoEn: string;  // ISO; ordena la lista
  encargo: Encargo;
};

// Lo guardado antes de existir esta pantalla eran encargos pelados: la validación los
// descarta, y el primer `guardarViaje` reescribe la lista ya limpia.
const esGuardado = (v: unknown): v is ViajeGuardado => {
  const g = v as Partial<ViajeGuardado> | null;
  return !!g && typeof g === "object"
    && typeof g.id === "string"
    && typeof g.provincia === "string"
    && typeof g.guardadoEn === "string"
    && validarEncargo(g.encargo) !== null;
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

// Guardar el mismo viaje dos veces lo refresca, no lo duplica. Compara por el
// serializado, que es lo que distingue un encargo de otro de cara al usuario: los
// construye siempre el mismo código, así que el orden de claves no baila.
export function guardarViaje(provincia: string, encargo: Encargo): ViajeGuardado {
  const serializado = serializarEncargo(encargo);
  const nuevo: ViajeGuardado = {
    id: crypto.randomUUID(),
    provincia,
    guardadoEn: new Date().toISOString(),
    encargo,
  };
  const otros = leerGuardados().filter(
    (g) => !(g.provincia === provincia && serializarEncargo(g.encargo) === serializado),
  );
  escribir([nuevo, ...otros]);
  return nuevo;
}

export function borrarGuardado(id: string): void {
  escribir(leerGuardados().filter((g) => g.id !== id));
}

// Sin try/catch a propósito: si el navegador no deja escribir (cuota, modo privado),
// quien llama necesita enterarse para decírselo al usuario.
const escribir = (lista: ViajeGuardado[]) => localStorage.setItem(CLAVE, JSON.stringify(lista));
