import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { datosDe, matrizDe, PROVINCIAS_CON_DATOS } from "@/lib/fuera-de-ruta/datos";
import { provinciaDeSlug } from "@/lib/fuera-de-ruta/provincias";
import CrearViajeCliente from "./CrearViajeCliente";

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

  // Lo exige `useSearchParams` en una página prerenderizada.
  return (
    <Suspense>
      <CrearViajeCliente datos={datos} matriz={matriz} provincia={provincia} />
    </Suspense>
  );
}
