"use client";

import dynamic from "next/dynamic";
import type { DatosViajes } from "@/lib/fuera-de-ruta/tipos";

// `ssr: false` no se puede pedir desde un Server Component: este envoltorio existe para eso.
const Explorador = dynamic(() => import("../../Explorador"), { ssr: false });

export default function ExploradorCliente(props: { datos: DatosViajes; provincia: string }) {
  return <Explorador {...props} />;
}
