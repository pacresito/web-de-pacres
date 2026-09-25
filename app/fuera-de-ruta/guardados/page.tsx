import type { Metadata } from "next";
import GuardadosCliente from "./GuardadosCliente";

// En la raíz y no en una provincia: la lista las cruza todas.
export const metadata: Metadata = { title: "Mis viajes · Fuera de Ruta" };

export default function GuardadosPage() {
  return <GuardadosCliente />;
}
