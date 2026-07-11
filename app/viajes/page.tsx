import type { DatosViajes } from "@/lib/viajes/tipos";
import datosNavarra from "@/data/viajes/navarra.json";
import Viajes from "./Viajes";

// Índice de /viajes (Server Component): carga el JSON de datos y lo entrega al
// asistente cliente (entrada por mapa de zonas → resultados). La cabecera común
// ("Fuera de Ruta") la pone el layout.
const datos = datosNavarra as DatosViajes;

export default function ViajesPage() {
  return <Viajes datos={datos} />;
}
