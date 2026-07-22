"use client";

import type { Destino } from "@/lib/fuera-de-ruta/tipos";
import { filtrarDestinos, type Filtros } from "@/lib/fuera-de-ruta/filtrar";
import type { FiltroActivo } from "@/lib/fuera-de-ruta/resumen";

// Estado 0 (compartido escritorio/móvil): explica el porqué en lenguaje natural y
// ofrece un chip por filtro con cuántos resultados devuelve al quitarlo (en vivo).
export default function EstadoVacio({ resumen, hayTipo, activos, todos, onFiltros }: {
  resumen: string;
  hayTipo: boolean;
  activos: FiltroActivo[];
  todos: Destino[];
  onFiltros: (f: Filtros) => void;
}) {
  return (
    <div className="fr-s3-vacio">
      <span className="fr-s3-cero">0</span>
      <h2 className="fr-s3-vacio-titulo">Ni Cris conoce un sitio con todo eso</h2>
      <p className="fr-s3-vacio-p">No hay {hayTipo ? "" : "sitios "}{resumen}. Suelta uno de estos y seguro que aparece algo:</p>
      <div className="fr-s3-rescates">
        {activos.map((a) => (
          <button key={a.etiqueta} className="fr-s3-rescate" onClick={() => onFiltros(a.sin)}>
            {a.etiqueta} × <b>→ +{filtrarDestinos(todos, a.sin).length}</b>
          </button>
        ))}
      </div>
      <button className="fr-s3-vacio-btn" onClick={() => onFiltros({})}>
        Limpiar {activos.length === 1 ? "el filtro" : `los ${activos.length} filtros`}
      </button>
      <span className="fr-s3-vacio-nota">El mapa se queda quieto — no borra tu encuadre.</span>
    </div>
  );
}
