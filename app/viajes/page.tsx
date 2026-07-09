import type { DatosViajes } from "@/lib/viajes/tipos";
import datosNavarra from "@/data/viajes/navarra.json";
import Explorador from "./Explorador";

// Índice de /viajes (Server Component): carga el JSON de datos y lo entrega al
// explorador cliente (filtros + grid + mapa). Marca provisional "Fuera de Ruta".
const datos = datosNavarra as DatosViajes;

export default function ViajesPage() {
  return (
    <>
      <header className="v-header">
        <div className="v-header-inner">
          <div className="v-marca">Fuera de Ruta</div>
          <p className="v-lema">
            Sitios chulos y poco conocidos de {datos.comunidad}. Filtra por lo que te apetezca hoy.
          </p>
        </div>
      </header>
      <Explorador datos={datos} />
    </>
  );
}
