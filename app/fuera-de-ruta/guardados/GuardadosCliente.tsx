"use client";

import dynamic from "next/dynamic";

// La lista vive en localStorage: sin SSR se lee en el primer render. `ssr: false` no se
// puede pedir desde un Server Component, así que este envoltorio existe para eso.
const Guardados = dynamic(() => import("./Guardados"), { ssr: false });

export default function GuardadosCliente() {
  return <Guardados />;
}
