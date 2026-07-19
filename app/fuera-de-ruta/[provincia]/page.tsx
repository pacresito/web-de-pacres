import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ZONAS_MAPA } from "@/data/fuera-de-ruta/zonas-mapa";
import { datosDe, PROVINCIAS_CON_DATOS } from "@/lib/fuera-de-ruta/datos";
import { PROVINCIAS, provinciaDeSlug, slugProvincia } from "@/lib/fuera-de-ruta/provincias";
import PasoZonas from "./PasoZonas";

// Paso de zonas de una provincia (Server Component). Existe para las 4 del mapa;
// las que aún no tienen destinos son escaparate (mismo mapa, sin recuentos).
type Props = { params: Promise<{ provincia: string }> };

export function generateStaticParams() {
  return PROVINCIAS.map((nombre) => ({ provincia: slugProvincia(nombre) }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { provincia } = await params;
  const nombre = provinciaDeSlug(provincia);
  return { title: nombre ? `${nombre} · Fuera de Ruta` : "Fuera de Ruta" };
}

export default async function ProvinciaPage({ params }: Props) {
  const { provincia } = await params;
  const nombre = provinciaDeSlug(provincia);
  if (!nombre) notFound();

  // Otras provincias que sí tienen datos, para redirigir desde una de escaparate.
  const otrasConDatos = PROVINCIAS_CON_DATOS
    .filter((slug) => slug !== provincia)
    .map((slug) => ({ slug, nombre: provinciaDeSlug(slug)! }));

  return (
    <PasoZonas
      provincia={provincia}
      nombre={nombre}
      mapa={ZONAS_MAPA[nombre]}
      destinos={datosDe(provincia)?.destinos ?? null}
      otrasConDatos={otrasConDatos}
    />
  );
}
