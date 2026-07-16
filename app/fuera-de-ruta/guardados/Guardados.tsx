"use client";

import { useState } from "react";
import Link from "next/link";
import { datosDe } from "@/lib/fuera-de-ruta/datos";
import { provinciaDeSlug } from "@/lib/fuera-de-ruta/provincias";
import { COMIDA_TEXTO, PROPUESTA_TEXTO, RITMO_TEXTO } from "@/lib/fuera-de-ruta/formato";
import { resumenFiltros } from "@/lib/fuera-de-ruta/resumen";
import { serializarEncargo } from "@/lib/fuera-de-ruta/planificador/encargo";
import { borrarGuardado, leerGuardados, type ViajeGuardado } from "@/lib/fuera-de-ruta/planificador/guardados";

// «Mis viajes»: lo que dejó el botón Guardar del planificador, en este navegador.
// Lo monta GuardadosCliente sin SSR, así que la lista se lee ya en el primer render.

const fechaFmt = new Intl.DateTimeFormat("es-ES", { weekday: "short", day: "numeric", month: "short" });
const guardadoFmt = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short" });

export default function Guardados() {
  const [viajes, setViajes] = useState<ViajeGuardado[]>(leerGuardados);

  const borrar = (id: string) => {
    borrarGuardado(id);
    setViajes(leerGuardados());
  };

  return (
    <main className="fr-guardados">
      <h1 className="fr-guardados-titulo">Mis viajes</h1>
      <p className="fr-guardados-intro">
        Los viajes que has guardado, en este navegador y solo en este. Guardamos lo que pediste,
        no el plan: al abrir uno se vuelve a montar con los sitios de ahora.
      </p>

      {viajes.length === 0 ? (
        <div className="fr-tarjeta fr-guardados-vacio">
          <p>Aún no has guardado ningún viaje.</p>
          <Link href="/fuera-de-ruta" className="fr-btn fr-btn--primario">Elegir un sitio</Link>
        </div>
      ) : (
        <ul className="fr-guardados-lista">
          {viajes.map((v) => (
            <Tarjeta key={v.id} viaje={v} onBorrar={() => borrar(v.id)} />
          ))}
        </ul>
      )}
    </main>
  );
}

function Tarjeta({ viaje, onBorrar }: { viaje: ViajeGuardado; onBorrar: () => void }) {
  const { provincia, encargo } = viaje;
  const datos = datosDe(provincia);
  const zonaNombre = new Map((datos?.zonas ?? []).map((z) => [z.id, z.nombre]));
  const resumen = resumenFiltros(encargo.filtros, (id) => zonaNombre.get(id) ?? id);

  return (
    <li className="fr-tarjeta fr-guardados-item">
      <div className="fr-guardados-item-head">
        <span className="fr-guardados-provincia">{provinciaDeSlug(provincia) ?? provincia}</span>
        {encargo.propuesta && (
          <span className="fr-guardados-propuesta">{PROPUESTA_TEXTO[encargo.propuesta]}</span>
        )}
        <button type="button" className="fr-btn--terciario fr-guardados-borrar" onClick={onBorrar}>
          Borrar
        </button>
      </div>

      <h2 className="fr-guardados-item-titulo">
        {encargo.dias} {encargo.dias === 1 ? "día" : "días"} · sale el {fechaFmt.format(new Date(`${encargo.fecha}T00:00`))}
      </h2>

      {resumen && <p className="fr-guardados-item-resumen">{resumen}</p>}
      <p className="fr-guardados-item-meta">
        ritmo {RITMO_TEXTO[encargo.ritmo]} · comida {COMIDA_TEXTO[encargo.comida]}
      </p>

      <div className="fr-guardados-item-pie">
        <Link
          href={`/fuera-de-ruta/${provincia}/crear-viaje?${serializarEncargo(encargo)}`}
          className="fr-btn fr-btn--primario"
        >
          Abrir viaje
        </Link>
        <span className="fr-guardados-fecha">guardado el {guardadoFmt.format(new Date(viaje.guardadoEn))}</span>
      </div>
    </li>
  );
}
