import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { datosDe, matrizDe, PROVINCIAS_CON_DATOS } from "@/lib/fuera-de-ruta/datos";
import { provinciaDeSlug } from "@/lib/fuera-de-ruta/provincias";
import CrearViajeCliente from "./CrearViajeCliente";

// «Crear mi viaje» de una provincia. Es también el destino de los enlaces Compartir
// (`?plan=`), por eso tiene ruta propia: la provincia va en la URL y el encargo no
// necesita llevarla.
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

  return <CrearViajeCliente datos={datos} matriz={matriz} provincia={provincia} />;
}
