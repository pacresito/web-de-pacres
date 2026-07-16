"use client";

import dynamic from "next/dynamic";
import type { DatosViajes } from "@/lib/fuera-de-ruta/tipos";

// El Explorador, solo en el navegador. `ssr: false` no se puede pedir desde un Server
// Component, así que el envoltorio cliente existe para eso y nada más.
const Explorador = dynamic(() => import("../../Explorador"), { ssr: false });

export default function ExploradorCliente(props: { datos: DatosViajes; provincia: string }) {
  return <Explorador {...props} />;
}
