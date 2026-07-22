"use client";

import Link from "next/link";
import type { Destino } from "@/lib/fuera-de-ruta/tipos";
import type { Comparativa } from "@/lib/fuera-de-ruta/comparador/comparador";
import Overlay from "./Overlay";

// Comparador Inteligente (§4.8): los campos de las actividades de «Mi viaje» lado a lado
// + frases condicionales del motor (nunca «esta es mejor»: la restricción vive en la
// plantilla, ver comparador.ts). Es la respuesta al aviso de tiempo de la auditoría y se
// abre también a mano.
export default function Comparador({ comparativa, destinos, provincia, onCerrar }: {
  comparativa: Comparativa;
  destinos: Destino[];
  provincia: string;
  onCerrar: () => void;
}) {
  const { nombres, filas, frases } = comparativa;

  return (
    <Overlay etiqueta="Comparar actividades" ancho onCerrar={onCerrar}>
      <div className="fr-fd-scroll fr-cmp">
        <h2 className="fr-fd-nombre fr-cmp-t">Comparar actividades</h2>

        <div className="fr-cmp-tabla-wrap">
          <table className="fr-cmp-tabla">
            <thead>
              <tr><th aria-hidden />{nombres.map((n, i) => <th key={i}>{n}</th>)}</tr>
            </thead>
            <tbody>
              {filas.map((f) => (
                <tr key={f.etiqueta}>
                  <th scope="row">{f.etiqueta}</th>
                  {f.valores.map((v, i) => <td key={i}>{v ?? "—"}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {frases.length > 0 && (
          <ul className="fr-cmp-frases">
            {frases.map((f, i) => <li key={i}>💡 {f}</li>)}
          </ul>
        )}

        <div className="fr-cmp-fichas">
          {destinos.map((d) => (
            <Link key={d.slug} href={`/fuera-de-ruta/${provincia}/${d.slug}`} target="_blank" rel="noopener" className="fr-s5-link">
              Ficha de {d.nombre} ↗
            </Link>
          ))}
        </div>
      </div>
    </Overlay>
  );
}
