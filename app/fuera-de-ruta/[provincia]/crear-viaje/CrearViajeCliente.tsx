"use client";

import dynamic from "next/dynamic";
import type { DatosViajes } from "@/lib/fuera-de-ruta/tipos";
import type { MatrizViajes } from "@/lib/fuera-de-ruta/planificador/geo";
import { parsearEncargo } from "@/lib/fuera-de-ruta/planificador/encargo";
import { queryAFiltros } from "@/lib/fuera-de-ruta/url-filtros";

// El planificador, solo en el navegador: monta las propuestas en el primer render a
// partir de la URL. `ssr: false` no se puede pedir desde un Server Component, así que
// este envoltorio existe para eso y para leer la URL.
const CrearViaje = dynamic(() => import("../../CrearViaje"), { ssr: false });

export default function CrearViajeCliente({ datos, matriz, provincia }: {
  datos: DatosViajes;
  matriz: MatrizViajes;
  provincia: string;
}) {
  // Dos formas de llegar, ambas por la URL: `?plan=` es un enlace compartido (encargo
  // completo, arranca en las propuestas); si no, los filtros con los que se venía del
  // explorador. Un `?plan=` corrupto cae al formulario en vez de reventar.
  const params = new URLSearchParams(typeof window === "undefined" ? "" : window.location.search);
  const compartido = parsearEncargo(params.get("plan"));

  return (
    <CrearViaje
      datos={datos}
      matriz={matriz}
      provincia={provincia}
      filtros={compartido?.filtros ?? queryAFiltros(params)}
      inicial={compartido ?? undefined}
    />
  );
}
