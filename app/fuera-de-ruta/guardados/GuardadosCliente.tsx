"use client";

import dynamic from "next/dynamic";

// La lista vive en el localStorage, que no existe en el servidor: sin SSR, el
// componente la lee ya en el primer render. `ssr: false` no se puede pedir desde un
// Server Component, así que este envoltorio existe para eso (como en /sitios).
const Guardados = dynamic(() => import("./Guardados"), { ssr: false });

export default function GuardadosCliente() {
  return <Guardados />;
}
