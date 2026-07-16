"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
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
  // Dos formas de llegar, y las dos son la misma query: si trae un encargo entero es un
  // enlace compartido o guardado (arranca en las propuestas); si no, son los filtros con
  // los que se venía del explorador y arranca en el formulario. Una query a medias o
  // corrupta cae al formulario en vez de reventar.
  //
  // Se lee con `useSearchParams`, no de `window.location`: al llegar por un `<Link>`
  // (Mis viajes) este envoltorio renderiza **antes** de que el navegador actualice la
  // URL, así que `location.search` iba vacío y el plan se perdía.
  const params = useSearchParams();

  return (
    <CrearViaje
      datos={datos}
      matriz={matriz}
      provincia={provincia}
      filtros={queryAFiltros(params)}
      inicial={parsearEncargo(params) ?? undefined}
    />
  );
}
