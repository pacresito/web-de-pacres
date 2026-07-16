import { PROVINCIAS } from "@/lib/fuera-de-ruta/provincias";
import MapaEspana from "./MapaEspana";

// Portada de Fuera de Ruta: el mapa de España. Las 4 provincias del mapa se eligen
// con el mismo peso; cuál tiene destinos se decide una pantalla más adentro. La
// cabecera común ("Fuera de Ruta") la pone el layout.
export default function FueraDeRutaPage() {
  return <MapaEspana disponibles={PROVINCIAS} />;
}
