"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import type { DatosViajes, Destino } from "@/lib/fuera-de-ruta/tipos";
import type { MatrizViajes } from "@/lib/fuera-de-ruta/geo";
import type { Respuestas } from "@/lib/fuera-de-ruta/cuestionario/preguntas";
import { filtrarDestinos, type Filtros } from "@/lib/fuera-de-ruta/filtrar";
import { recomendar } from "@/lib/fuera-de-ruta/motor/motor";
import { resumenMiViaje, elegirEquilibrado } from "@/lib/fuera-de-ruta/viaje/mi-viaje";
import { auditar } from "@/lib/fuera-de-ruta/auditoria/auditoria";
import { comparar } from "@/lib/fuera-de-ruta/comparador/comparador";
import { oportunidades } from "@/lib/fuera-de-ruta/oportunidades/oportunidades";
import { zonasAlojamiento } from "@/lib/fuera-de-ruta/alojamiento/alojamiento";
import { generarItinerario } from "@/lib/fuera-de-ruta/itinerario/itinerario";
import { aPerfil, aViaje } from "@/lib/fuera-de-ruta/cuestionario/mapear";
import Guia from "../Guia";
import PanelViaje from "./PanelViaje";
import FichaDrawer from "./FichaDrawer";
import Comparador from "./Comparador";

// Las candidatas del motor como tarjetas, y el panel «Mi viaje» con lo elegido.

const topePorDias = (dias: number) => (dias <= 2 ? 20 : dias <= 5 ? 35 : 50);

export default function Resultado({ datos, matriz, provincia, filtros, respuestas, seleccion, setSeleccion, onEditar }: {
  datos: DatosViajes;
  matriz: MatrizViajes;
  provincia: string;
  filtros: Filtros;
  respuestas: Respuestas;
  seleccion: Set<string>;
  setSeleccion: React.Dispatch<React.SetStateAction<Set<string>>>;
  onEditar: () => void;
}) {
  const viaje = useMemo(() => aViaje(respuestas), [respuestas]);
  const opts = useMemo(() => ({ ...viaje, fecha: new Date(`${viaje.fecha}T00:00`) }), [viaje]);

  const { candidatas, eliminadas } = useMemo(() => {
    const visitables = filtrarDestinos(datos.destinos, filtros).filter((d) => d.tipo !== "alojamiento");
    return recomendar(visitables, aPerfil(respuestas, filtros.zona));
  }, [datos.destinos, filtros, respuestas]);

  const listado = useMemo(() => candidatas.slice(0, topePorDias(viaje.dias)), [candidatas, viaje.dias]);
  const porSlug = useMemo(() => new Map(datos.destinos.map((d) => [d.slug, d])), [datos.destinos]);
  const zonaNombre = useMemo(
    () => new Map(datos.zonas.map((z) => [z.id, z.nombre])), [datos.zonas],
  );

  const [listo, setListo] = useState(false);
  const [verItinerario, setVerItinerario] = useState(false);
  const [comparando, setComparando] = useState(false);
  const [fichaAbierta, setFichaAbierta] = useState<string | null>(null); // slug
  const [horaSalida, setHoraSalida] = useState<Record<number, number>>({});

  const alternar = (slug: string) =>
    setSeleccion((s) => {
      const n = new Set(s);
      if (n.has(slug)) n.delete(slug); else n.add(slug);
      return n;
    });

  const queElijaCris = () =>
    setSeleccion(new Set(elegirEquilibrado(listado.map((c) => c.destino), matriz, opts)));

  const destinosSel = useMemo(
    () => [...seleccion].flatMap((s) => porSlug.get(s) ?? []),
    [seleccion, porSlug],
  );
  const resumen = useMemo(() => resumenMiViaje(destinosSel, matriz, opts), [destinosSel, matriz, opts]);
  const zonasViaje = useMemo(() => zonasAlojamiento(resumen, porSlug, matriz), [resumen, porSlug, matriz]);
  const auditoria = useMemo(() => auditar(resumen, destinosSel, zonasViaje), [resumen, destinosSel, zonasViaje]);
  const comparativa = useMemo(() => comparar(destinosSel), [destinosSel]);
  const oportunidadesViaje = useMemo(
    () => oportunidades(destinosSel, candidatas.map((c) => c.destino), matriz),
    [destinosSel, candidatas, matriz],
  );

  // Solo al abrirlo: generarlo en cada cambio de la selección puede tumbar el render en móvil.
  const itinerario = useMemo(
    () => (verItinerario ? generarItinerario(resumen.dias, datos, matriz, { ...opts, horaSalida }, zonasViaje) : null),
    [verItinerario, resumen.dias, datos, matriz, opts, horaSalida, zonasViaje],
  );

  if (!listo) {
    return <Transicion candidatas={candidatas.length} eliminadas={eliminadas.length} onListo={() => setListo(true)} />;
  }

  if (verItinerario && itinerario) {
    return (
      <Guia
        itinerario={itinerario}
        datos={datos}
        porSlug={porSlug}
        matriz={matriz}
        ritmo={viaje.ritmo}
        provincia={provincia}
        onAtras={() => { setVerItinerario(false); window.scrollTo(0, 0); }}
        onHoraSalida={(dia, min) => setHoraSalida((h) => ({ ...h, [dia]: min }))}
      />
    );
  }

  const destinoAbierto = fichaAbierta ? porSlug.get(fichaAbierta) : undefined;

  return (
    <div className="fr-d-wrap">
      <div className="fr-d-head">
        <button className="fr-s5-atras" onClick={onEditar} aria-label="Volver al resumen">‹</button>
        <div>
          <h1 className="fr-s5-titulo">Elige tu viaje</h1>
          <p className="fr-d-sub">
            {listado.length} sitios encajan con tu perfil{eliminadas.length > 0 ? `, ${eliminadas.length} descartados` : ""}.
            Añade los que te apetezcan y ve montando tu viaje.
          </p>
        </div>
      </div>

      <div className="fr-d-cols">
        <ul className="fr-d-grid">
          {listado.map((c) => (
            <li key={c.destino.slug}>
              <TarjetaActividad
                destino={c.destino}
                zona={zonaNombre.get(c.destino.zona) ?? c.destino.zona}
                elegida={seleccion.has(c.destino.slug)}
                onAlternar={() => alternar(c.destino.slug)}
                onVerMas={() => setFichaAbierta(c.destino.slug)}
              />
            </li>
          ))}
        </ul>

        <PanelViaje
          resumen={resumen}
          auditoria={auditoria}
          oportunidades={oportunidadesViaje}
          zonas={zonasViaje}
          porSlug={porSlug}
          provincia={provincia}
          respuestas={respuestas}
          seleccion={seleccion}
          onQuitar={alternar}
          onAnadir={alternar}
          onQueElijaCris={queElijaCris}
          onVerItinerario={() => setVerItinerario(true)}
          onComparar={() => setComparando(true)}
        />
      </div>

      {comparando && (
        <Comparador
          comparativa={comparativa}
          destinos={destinosSel}
          provincia={provincia}
          onCerrar={() => setComparando(false)}
        />
      )}

      {destinoAbierto && (
        <FichaDrawer
          destino={destinoAbierto}
          zona={zonaNombre.get(destinoAbierto.zona) ?? destinoAbierto.zona}
          provincia={provincia}
          elegida={seleccion.has(destinoAbierto.slug)}
          onAlternar={() => alternar(destinoAbierto.slug)}
          onCerrar={() => setFichaAbierta(null)}
        />
      )}
    </div>
  );
}

// El motor ya corrió: la transición cuenta sus números reales.
function Transicion({ candidatas, eliminadas, onListo }: {
  candidatas: number;
  eliminadas: number;
  onListo: () => void;
}) {
  const pasos = [
    "Analizando vuestro perfil de viaje…",
    `Buscando actividades compatibles… ${candidatas} encajan`,
    eliminadas > 0 ? `Descartando incompatibilidades… ${eliminadas} fuera` : "Sin incompatibilidades que descartar",
    "Calculando tiempos y distancias reales…",
    "Ordenando por afinidad con vuestro perfil…",
    "Preparando vuestra propuesta…",
  ];
  const [n, setN] = useState(0);

  useEffect(() => {
    if (n >= pasos.length) {
      const t = setTimeout(onListo, 350);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setN((x) => x + 1), 240);
    return () => clearTimeout(t);
  }, [n, pasos.length, onListo]);

  return (
    <div className="fr-d-transicion">
      <h1 className="fr-s5-titulo">Estamos preparando vuestro viaje…</h1>
      <ul className="fr-d-pasos">
        {pasos.slice(0, n).map((p, i) => (
          <li key={i} className="fr-d-paso">✔ {p}</li>
        ))}
      </ul>
    </div>
  );
}

// «Ver más» abre un drawer en vez de navegar: la selección vive en el estado y se perdería.
function TarjetaActividad({ destino: d, zona, elegida, onAlternar, onVerMas }: {
  destino: Destino;
  zona: string;
  elegida: boolean;
  onAlternar: () => void;
  onVerMas: () => void;
}) {
  const iconos: string[] = [];
  if (d.bano) iconos.push("💧 baño");
  if (d.ninos === false) iconos.push("👶 no");
  if (d.perros === false) iconos.push("🐕 no");

  return (
    <div className={`fr-d-card fr-tarjeta${elegida ? " fr-d-card--on" : ""}`}>
      <div className="fr-d-card-foto">
        {d.imagen ? (
          <Image src={d.imagen} alt={d.nombre} fill sizes="(max-width: 720px) 100vw, 300px" />
        ) : (
          <div className="fr-d-card-fallback"><i className="fr-s3-foto-pronto">foto en camino</i></div>
        )}
        {d.favoritoDeCris && <span className="fr-d-card-fav">★ favorito de Cris</span>}
      </div>
      <div className="fr-d-card-body">
        <span className="fr-d-card-meta">{zona} · {d.tipo}</span>
        <span className="fr-d-card-nombre">{d.nombre}</span>
        <span className="fr-d-card-datos">
          {d.duracion && <span className="fr-d-dato">🕒 {d.duracion}</span>}
          {d.dificultad && <span className="fr-d-dato">🥾 {d.dificultad}</span>}
          {iconos.map((t) => <span key={t} className="fr-d-dato">{t}</span>)}
        </span>
        <div className="fr-d-card-cta">
          <button type="button" className="fr-s5-link" onClick={onVerMas}>
            Ver más
          </button>
          <button
            className={`fr-btn fr-d-anadir${elegida ? " fr-d-anadir--on" : " fr-btn--primario"}`}
            aria-pressed={elegida}
            onClick={onAlternar}
          >
            {elegida ? "✔ En tu viaje" : "+ Añadir"}
          </button>
        </div>
      </div>
    </div>
  );
}
