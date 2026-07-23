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

// Listado + panel «Mi viaje» (Fase D, §4.9-4.13): el cuestionario alimenta al motor; sus
// candidatas se pintan como tarjetas puntuadas (listado reducido por días) y el usuario las
// añade a un panel que recalcula en vivo tiempo, km y reparto por días. El motor es
// instantáneo: la pantalla de transición cuenta —con números reales— lo que de verdad hizo.

// Tope de tarjetas según duración del viaje (§4.9: nunca cientos).
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
  const opts = useMemo(
    () => ({ dias: viaje.dias, ritmo: viaje.ritmo, comida: viaje.comida, fecha: new Date(`${viaje.fecha}T00:00`) }),
    [viaje],
  );

  const { candidatas, eliminadas } = useMemo(() => {
    const visitables = filtrarDestinos(datos.destinos, filtros).filter((d) => d.tipo !== "alojamiento");
    return recomendar(visitables, aPerfil(respuestas, filtros.zona));
  }, [datos.destinos, filtros, respuestas]);

  // Listado reducido: las mejor puntuadas hasta el tope según los días.
  const listado = useMemo(() => candidatas.slice(0, topePorDias(viaje.dias)), [candidatas, viaje.dias]);
  const porSlug = useMemo(() => new Map(datos.destinos.map((d) => [d.slug, d])), [datos.destinos]);
  const zonaNombre = useMemo(
    () => new Map(datos.zonas.map((z) => [z.id, z.nombre])), [datos.zonas],
  );

  const [listo, setListo] = useState(false);
  const [verItinerario, setVerItinerario] = useState(false);
  const [comparando, setComparando] = useState(false); // modal comparador abierto (§4.8)
  const [fichaAbierta, setFichaAbierta] = useState<string | null>(null); // slug del destino en el drawer
  // Hora de salida por día (Fase E), configurable; sin valor, el generador usa la del ritmo.
  const [horaSalida, setHoraSalida] = useState<Record<number, number>>({});

  const alternar = (slug: string) =>
    setSeleccion((s) => {
      const n = new Set(s);
      if (n.has(slug)) n.delete(slug); else n.add(slug);
      return n;
    });

  // «Prefiero que la IA decida»: vuelca al panel un conjunto equilibrado, editable.
  const queDecidaLaIA = () =>
    setSeleccion(new Set(elegirEquilibrado(listado.map((c) => c.destino), matriz, opts)));

  const destinosSel = useMemo(
    () => [...seleccion].map((s) => porSlug.get(s)!).filter(Boolean),
    [seleccion, porSlug],
  );
  const resumen = useMemo(() => resumenMiViaje(destinosSel, matriz, opts), [destinosSel, matriz, opts]);
  // Zonas de alojamiento (Fase F4, §4.15): dónde dormir, sobre el reparto en días.
  const zonasViaje = useMemo(() => zonasAlojamiento(resumen, porSlug, matriz), [resumen, porSlug, matriz]);
  // Auditoría (Fase F, §4.16): revisión viva del viaje sobre el reparto ya calculado.
  const auditoria = useMemo(() => auditar(resumen, destinosSel, zonasViaje), [resumen, destinosSel, zonasViaje]);
  // Comparador (Fase F, §4.8): compara las actividades ya en «Mi viaje».
  const comparativa = useMemo(() => comparar(destinosSel), [destinosSel]);
  // Oportunidades (Fase F3, §4.6): compatibles no elegidas que pasan cerca de la ruta y
  // aportan algo distinto. Sugerencia, nunca cambio automático del plan.
  const oportunidadesViaje = useMemo(
    () => oportunidades(destinosSel, candidatas.map((c) => c.destino), matriz),
    [destinosSel, candidatas, matriz],
  );

  // Itinerario cronológico (Fase E): sobre el mismo reparto del panel, para no contradecirlo.
  // Perezoso: solo se calcula al abrirlo, no en cada añadido de la selección (el panel ya
  // recalcula su reparto en vivo; generar el itinerario cronológico entero cada vez era
  // trabajo tirado y en móvil, con muchos destinos, podía tumbar el render).
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
        onAtras={() => setVerItinerario(false)}
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
          onQueDecidaLaIA={queDecidaLaIA}
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

// Pantalla de transición (§4.3): honesta —el motor ya corrió— con los números reales
// del análisis. Los pasos aparecen encadenados y al terminar revela el listado.
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

// Tarjeta de actividad (§4.10): foto, nombre, tipo, duración, dificultad, iconos que
// distinguen (baño, y los "no" de niños/perros), «Ver más» y «Añadir a mi viaje».
// «Ver más» abre un drawer superpuesto en vez de navegar: preserva la selección en curso
// (que vive en estado de React y se perdería al salir de la página) y no confunde con una
// pestaña nueva en móvil.
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
