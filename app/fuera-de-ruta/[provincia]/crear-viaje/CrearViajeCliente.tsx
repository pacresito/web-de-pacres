"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import type { DatosViajes } from "@/lib/fuera-de-ruta/tipos";
import type { MatrizViajes } from "@/lib/fuera-de-ruta/geo";
import { queryAFiltros } from "@/lib/fuera-de-ruta/url-filtros";
import { parsearViaje } from "@/lib/fuera-de-ruta/cuestionario/viaje-url";

// El cuestionario, solo en el navegador: `ssr: false` no se puede pedir desde un Server
// Component, así que este envoltorio existe para eso y para leer la URL (que además deja
// leer localStorage en el inicializador del estado, ver PROJECT.md).
const CrearViaje = dynamic(() => import("../../CrearViaje"), { ssr: false });

export default function CrearViajeCliente({ datos, matriz, provincia }: {
  datos: DatosViajes;
  matriz: MatrizViajes;
  provincia: string;
}) {
  // Una sola query, dos lecturas de claves disjuntas: los filtros del explorador (de
  // donde salen las zonas) y el viaje concreto (días, ritmo…). Se lee con
  // `useSearchParams`, no de `window.location`: al llegar por un `<Link>` el envoltorio
  // renderiza antes de que el navegador actualice la URL.
  const params = useSearchParams();

  return (
    <CrearViaje
      datos={datos}
      matriz={matriz}
      provincia={provincia}
      filtros={queryAFiltros(params)}
      viajeInicial={parsearViaje(params)}
    />
  );
}
