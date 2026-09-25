import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { datosDe, PROVINCIAS_CON_DATOS } from "@/lib/fuera-de-ruta/datos";
import { provinciaDeSlug } from "@/lib/fuera-de-ruta/provincias";
import ExploradorCliente from "./ExploradorCliente";

// Sin SSR: el árbol depende del ancho de ventana y los filtros de la URL, que solo existen
// en el navegador. Lo indexable son las fichas.
type Props = { params: Promise<{ provincia: string }> };

export function generateStaticParams() {
  return PROVINCIAS_CON_DATOS.map((provincia) => ({ provincia }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { provincia } = await params;
  const nombre = provinciaDeSlug(provincia);
  return { title: nombre ? `Sitios de ${nombre} · Fuera de Ruta` : "Fuera de Ruta" };
}

export default async function SitiosPage({ params }: Props) {
  const { provincia } = await params;
  const datos = datosDe(provincia);
  if (!datos) notFound();

  return <ExploradorCliente datos={datos} provincia={provincia} />;
}
