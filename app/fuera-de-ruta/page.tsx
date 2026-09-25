import { PROVINCIAS } from "@/lib/fuera-de-ruta/provincias";
import MapaEspana from "./MapaEspana";

// Todas las provincias del mapa se eligen igual; cuál tiene datos se ve una pantalla después.
export default function FueraDeRutaPage() {
  return <MapaEspana disponibles={PROVINCIAS} />;
}
