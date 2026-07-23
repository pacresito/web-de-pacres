"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { provinciaDeSlug } from "@/lib/fuera-de-ruta/provincias";
import { aViaje } from "@/lib/fuera-de-ruta/cuestionario/mapear";
import { resumen as resumenPerfil } from "@/lib/fuera-de-ruta/cuestionario/resumen";
import { borrarGuardado, leerGuardados, marcarParaAbrir, type ViajeGuardado } from "@/lib/fuera-de-ruta/viaje/guardados";

// «Mis viajes»: lo que dejó el botón Guardar del panel «Mi viaje», en este navegador.
// Lo monta GuardadosCliente sin SSR, así que la lista se lee ya en el primer render.
// Guardamos el perfil + la selección, no el plan: al abrir uno se vuelve a montar.

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
        Los viajes que has guardado, en este navegador y solo en este. Guardamos lo que elegiste,
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
  const router = useRouter();
  const { provincia, perfil, seleccion } = viaje;
  const viajeDatos = aViaje(perfil);
  const lineas = resumenPerfil(perfil).slice(0, 3);

  const abrir = () => {
    marcarParaAbrir(viaje);
    router.push(`/fuera-de-ruta/${provincia}/crear-viaje`);
  };

  return (
    <li className="fr-tarjeta fr-guardados-item">
      <div className="fr-guardados-item-head">
        <span className="fr-guardados-provincia">{provinciaDeSlug(provincia) ?? provincia}</span>
        <span className="fr-guardados-propuesta">{seleccion.length} {seleccion.length === 1 ? "sitio" : "sitios"}</span>
        <button type="button" className="fr-btn--terciario fr-guardados-borrar" onClick={onBorrar}>
          Borrar
        </button>
      </div>

      <h2 className="fr-guardados-item-titulo">
        {viajeDatos.dias} {viajeDatos.dias === 1 ? "día" : "días"} por {provinciaDeSlug(provincia) ?? provincia}
      </h2>

      {lineas.length > 0 && <p className="fr-guardados-item-resumen">{lineas.join(" ")}</p>}

      <div className="fr-guardados-item-pie">
        <button type="button" onClick={abrir} className="fr-btn fr-btn--primario">
          Abrir viaje
        </button>
        <span className="fr-guardados-fecha">guardado el {guardadoFmt.format(new Date(viaje.guardadoEn))}</span>
      </div>
    </li>
  );
}
