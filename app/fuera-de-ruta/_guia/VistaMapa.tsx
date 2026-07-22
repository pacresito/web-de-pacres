"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import type { DatosViajes, Destino } from "@/lib/fuera-de-ruta/tipos";
import { mapsHref } from "@/lib/fuera-de-ruta/formato";
import { fmtHora, type Itinerario } from "@/lib/fuera-de-ruta/itinerario/itinerario";
import type { PuntoViaje } from "../MapaViaje";

const MapaViaje = dynamic(() => import("../MapaViaje"), { ssr: false });

// ------------------------------------------------------------ Mapa del viaje
// §5.6: las paradas en el orden de la planificación, con el alojamiento y los restaurantes
// del plan, y Google Maps a un clic desde cada punto. La lista de al lado repite el orden
// para quien prefiera leerlo (y para que el mapa no sea la única forma de llegar al enlace).
export default function VistaMapa({ itinerario, datos, porSlug }: {
  itinerario: Itinerario;
  datos: DatosViajes;
  porSlug: Map<string, Destino>;
}) {
  const puntos = useMemo(() => {
    const restPorNombre = new Map(datos.restaurantes.filter((r) => r.gps).map((r) => [r.nombre, r]));
    const lista: PuntoViaje[] = [];
    let n = 0;
    for (const dia of itinerario.dias) {
      // Dentro del día, orden de reloj (el trazo del mapa es el recorrido real, comida
      // incluida); el alojamiento va delante porque es de donde se sale.
      const delDia: (PuntoViaje & { hora: number })[] = [];
      for (const p of dia.paradas) {
        const gps = porSlug.get(p.slug)?.gps;
        if (!gps) continue;
        n += 1;
        delDia.push({ slug: p.slug, nombre: p.nombre, gps, etiqueta: String(n), dia: dia.numero, detalle: `Día ${dia.numero} · ${fmtHora(p.horaInicio)}`, hora: p.horaInicio });
      }
      const rest = dia.comida?.restaurante ? restPorNombre.get(dia.comida.restaurante) : undefined;
      if (rest?.gps) {
        delDia.push({ slug: rest.nombre, nombre: rest.nombre, gps: rest.gps, etiqueta: "🍴", dia: dia.numero, detalle: `Día ${dia.numero} · ${fmtHora(dia.comida!.horaInicio)}`, hora: dia.comida!.horaInicio });
      }
      // La base de la que se sale abre el día; si esa noche se duerme en otra, la nueva lo
      // cierra —y abre el siguiente—, que es lo que une el mapa de punta a punta.
      const salida = dia.salidaDesde ?? dia.alojamiento;
      const alojSalida = salida ? porSlug.get(salida.slug) : undefined;
      if (alojSalida?.gps) lista.push({ slug: alojSalida.slug, nombre: alojSalida.nombre, gps: alojSalida.gps, etiqueta: "🏨", dia: dia.numero, base: true, detalle: `Día ${dia.numero} · ${dia.salidaDesde ? "salida con el equipaje" : "salida y regreso"}` });
      lista.push(...delDia.sort((a, b) => a.hora - b.hora));
      const alojNoche = dia.salidaDesde && dia.alojamiento ? porSlug.get(dia.alojamiento.slug) : undefined;
      if (alojNoche?.gps) lista.push({ slug: alojNoche.slug, nombre: alojNoche.nombre, gps: alojNoche.gps, etiqueta: "🏨", dia: dia.numero, base: true, detalle: `Día ${dia.numero} · noche en ${dia.alojamiento!.pueblo}` });
    }
    return lista;
  }, [itinerario, datos.restaurantes, porSlug]);

  if (puntos.length === 0) return <p className="fr-d-sub">Las paradas de tu viaje no tienen coordenadas todavía.</p>;

  return (
    <div className="fr-g-mapa-cols">
      <MapaViaje puntos={puntos} />
      <ol className="fr-g-puntos">
        {puntos.map((p, i) => (
          <li key={`${p.slug}-${i}`}>
            <span className="fr-g-punto-n">{p.etiqueta}</span>
            <span>
              <b>{p.nombre}</b>
              <span className="fr-it-detalle">{p.detalle}</span>
            </span>
            <a className="fr-s5-link" href={mapsHref(p.gps)} target="_blank" rel="noopener">📍 Maps</a>
          </li>
        ))}
      </ol>
    </div>
  );
}
