"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import type { DatosViajes } from "@/lib/fuera-de-ruta/tipos";
import type { MatrizViajes } from "@/lib/fuera-de-ruta/geo";
import { queryAFiltros } from "@/lib/fuera-de-ruta/url-filtros";
import { parsearViaje } from "@/lib/fuera-de-ruta/cuestionario/viaje-url";

// `ssr: false` no se puede pedir desde un Server Component: este envoltorio existe para
// eso y para leer la URL. Sin SSR, el estado puede inicializarse desde localStorage.
const CrearViaje = dynamic(() => import("../../CrearViaje"), { ssr: false });

export default function CrearViajeCliente({ datos, matriz, provincia }: {
  datos: DatosViajes;
  matriz: MatrizViajes;
  provincia: string;
}) {
  // Filtros y viaje comparten query con claves disjuntas. `useSearchParams` y no
  // `window.location`: tras un `<Link>`, esto renderiza antes de que cambie la URL.
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
