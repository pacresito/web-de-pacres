import type { Metadata } from "next";
import Manifesto from "./home/manifesto/page";

// La raíz es la única ruta indexable: sobrescribe el noindex global del layout.
export const metadata: Metadata = {
  title: "La web de Pacres",
  description:
    "La web de Pablo Crespo Velasco. Ingeniero industrial: operaciones, producto, personas. Currículum y poco más. O eso parece._",
  robots: { index: true, follow: true },
  alternates: { canonical: "https://pacr.es" },
};

export default function Page() {
  return <Manifesto />;
}
