import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { datosDe, PROVINCIAS_CON_DATOS } from "@/lib/fuera-de-ruta/datos";
import { provinciaDeSlug } from "@/lib/fuera-de-ruta/provincias";
import ExploradorCliente from "./ExploradorCliente";

// Explorador de una provincia: la lista filtrable con su mapa. Solo existe donde hay
// destinos; una provincia de escaparate se queda en su paso de zonas (su CTA está
// desactivado, así que aquí no se llega desde la UI).
//
// Se monta sin SSR (ver ExploradorCliente): elige árbol móvil/escritorio por el ancho
// de ventana y lee sus filtros de la URL — las dos cosas solo tienen respuesta en el
// navegador, y pre-renderizarlas daría un árbol que no coincide al hidratar. No se
// pierde nada indexable: el contenido son las fichas, que sí son Server Components.
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
