import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { datosDe, matrizDe, PROVINCIAS_CON_DATOS } from "@/lib/fuera-de-ruta/datos";
import { provinciaDeSlug } from "@/lib/fuera-de-ruta/provincias";
import CrearViajeCliente from "./CrearViajeCliente";

// «Crear mi viaje» de una provincia. Tiene ruta propia porque la provincia va en la URL
// (el viaje serializado en la query no la lleva) y es el destino de los enlaces que la
// comparten.
type Props = { params: Promise<{ provincia: string }> };

export function generateStaticParams() {
  return PROVINCIAS_CON_DATOS.map((provincia) => ({ provincia }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { provincia } = await params;
  const nombre = provinciaDeSlug(provincia);
  return { title: nombre ? `Crear mi viaje por ${nombre} · Fuera de Ruta` : "Fuera de Ruta" };
}

export default async function CrearViajePage({ params }: Props) {
  const { provincia } = await params;
  const datos = datosDe(provincia);
  const matriz = matrizDe(provincia);
  if (!datos || !matriz) notFound();

  // El Suspense lo pide `useSearchParams` en una página prerenderizada; no se ve, el
  // cuestionario ya se monta sin SSR.
  return (
    <Suspense>
      <CrearViajeCliente datos={datos} matriz={matriz} provincia={provincia} />
    </Suspense>
  );
}
