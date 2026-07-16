import type { Metadata } from "next";
import GuardadosCliente from "./GuardadosCliente";

// «Mis viajes»: los planes que el botón Guardar de Crear mi viaje dejó en este
// navegador. Es una ruta de la raíz, no de una provincia, porque la lista las cruza
// todas — cada guardado lleva la suya (`guardados.ts`).
export const metadata: Metadata = { title: "Mis viajes · Fuera de Ruta" };

export default function GuardadosPage() {
  return <GuardadosCliente />;
}
