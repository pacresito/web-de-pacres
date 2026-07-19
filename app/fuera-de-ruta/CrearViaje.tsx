"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { DatosViajes, Destino } from "@/lib/fuera-de-ruta/tipos";
import type { MatrizViajes } from "@/lib/fuera-de-ruta/planificador/geo";
import { filtrarDestinos, type Filtros } from "@/lib/fuera-de-ruta/filtrar";
import { filtrosAQuery } from "@/lib/fuera-de-ruta/url-filtros";
import { recomendar } from "@/lib/fuera-de-ruta/motor/motor";
import { resumenMiViaje, elegirEquilibrado } from "@/lib/fuera-de-ruta/viaje/mi-viaje";
import { auditar, type Hallazgo } from "@/lib/fuera-de-ruta/auditoria/auditoria";
import { comparar, type Comparativa } from "@/lib/fuera-de-ruta/comparador/comparador";
import { oportunidades, type Oportunidad } from "@/lib/fuera-de-ruta/oportunidades/oportunidades";
import { zonasAlojamiento, type ZonaAlojamiento } from "@/lib/fuera-de-ruta/alojamiento/alojamiento";
import { generarItinerario } from "@/lib/fuera-de-ruta/itinerario/itinerario";
import { duracion } from "@/lib/fuera-de-ruta/formato";
import Guia from "./Guia";
import {
  BLOQUES, camposDe, uno, varios,
  type Bloque, type Campo, type Pregunta, type Respuestas,
} from "@/lib/fuera-de-ruta/cuestionario/preguntas";
import { aPerfil, aViaje } from "@/lib/fuera-de-ruta/cuestionario/mapear";
import { resumen as resumenPerfil } from "@/lib/fuera-de-ruta/cuestionario/resumen";
import { serializarViaje } from "@/lib/fuera-de-ruta/cuestionario/viaje-url";
import { guardarViaje, tomarParaAbrir } from "@/lib/fuera-de-ruta/planificador/guardados";
import type { ResumenViaje } from "@/lib/fuera-de-ruta/viaje/mi-viaje";

// S5 «Crear mi viaje» (Fase C): el cuestionario de Cris sustituye al formulario plano.
// Tres pasos —el viajero, el viaje y el resumen editable— y al confirmar lanza el motor
// de dos fases. El viajero se guarda en localStorage (reutilizable); el viaje viaja en la
// URL. El motor es puro e instantáneo: aquí solo se pinta lo que decide.

const CLAVE_VIAJERO = "fr:viajero";
const CLAVE_VIAJE = "fr:viaje";
type Paso = "viajero" | "viaje" | "resumen" | "resultado";

const fechaFmt = new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long" });
const legibleFecha = (iso?: string) => (iso ? fechaFmt.format(new Date(`${iso}T00:00`)) : "Elegir fecha");

// --- Persistencia en localStorage, defensiva en ambos sentidos. El viajero (bloque 1) es
// reutilizable; el viaje (bloque 2) va sobre todo a la URL (compartible), pero se espeja
// aquí también para que sobreviva al entrar sin query —un enlace con viaje gana al espejo—.
function leerBloque(clave: string, id: Bloque["id"]): Respuestas {
  try {
    const obj = JSON.parse(localStorage.getItem(clave) ?? "{}") as Respuestas;
    return recortar(obj, camposDe(id));
  } catch {
    return {};
  }
}
function guardarBloque(clave: string, id: Bloque["id"], r: Respuestas) {
  try {
    localStorage.setItem(clave, JSON.stringify(recortar(r, camposDe(id))));
  } catch {
    /* navegador sin localStorage: no se recuerda, no pasa nada más */
  }
}
const recortar = (r: Respuestas, campos: Campo[]): Respuestas => {
  const out: Respuestas = {};
  for (const c of campos) if (r[c] !== undefined) out[c] = r[c];
  return out;
};

// Quita las respuestas de preguntas ocultas: si dejas de viajar en familia, el carrito
// que marcaste no debe seguir eliminando destinos. El orden de BLOQUES basta (una
// condicional siempre depende de una pregunta anterior).
function podar(r: Respuestas): Respuestas {
  const out = { ...r };
  for (const p of BLOQUES.flatMap((b) => b.preguntas)) {
    if (p.visible && !p.visible(out)) delete out[p.campo];
  }
  return out;
}

// Cambia un campo (o lo borra al deseleccionar) y vuelve a podar las condicionales.
function conCampo(r: Respuestas, campo: Campo, valor: string | string[] | undefined): Respuestas {
  const out = { ...r };
  if (valor === undefined || (Array.isArray(valor) && valor.length === 0)) delete out[campo];
  else out[campo] = valor;
  return podar(out);
}

export default function CrearViaje({ datos, matriz, provincia, filtros, viajeInicial }: {
  datos: DatosViajes;
  matriz: MatrizViajes;    // tiempos y km de coche precalculados, para el panel «Mi viaje»
  provincia: string;       // slug de URL, para los enlaces
  filtros: Filtros;        // filtros heredados del explorador (de aquí salen las zonas)
  viajeInicial?: Respuestas; // bloque viaje llegado por la URL (recarga o enlace)
}) {
  // Reabrir un viaje de «Mis viajes» (handoff por localStorage, de un solo uso): arranca
  // directo en el resultado con el perfil y la selección guardados.
  const [abrir] = useState(() => tomarParaAbrir(provincia));
  const [respuestas, setRespuestas] = useState<Respuestas>(() =>
    abrir
      ? podar(abrir.perfil)
      : podar({ ...leerBloque(CLAVE_VIAJERO, "viajero"), ...leerBloque(CLAVE_VIAJE, "viaje"), ...viajeInicial }));
  const [paso, setPaso] = useState<Paso>(abrir ? "resultado" : "viajero");
  const [seleccion, setSeleccion] = useState<Set<string>>(() => new Set(abrir?.seleccion ?? []));

  // El viajero se recuerda; el viaje se refleja en la URL (sobre los filtros heredados,
  // que no chocan de clave). replaceState, no router: no queremos re-render del servidor.
  // OJO (Next ≥14.1): replaceState **sincroniza con useSearchParams**, y como los filtros
  // llegan de ahí, escribir en cada render realimentaba render→escribe→render (cuelgue al
  // marcar una opción). Por eso solo se escribe si la URL cambia de verdad: idempotente.
  useEffect(() => {
    guardarBloque(CLAVE_VIAJERO, "viajero", respuestas);
    guardarBloque(CLAVE_VIAJE, "viaje", respuestas);
    const params = new URLSearchParams(filtrosAQuery(filtros));
    new URLSearchParams(serializarViaje(respuestas)).forEach((v, k) => params.append(k, v));
    const qs = params.toString();
    const url = `/fuera-de-ruta/${provincia}/crear-viaje${qs ? `?${qs}` : ""}`;
    if (url !== window.location.pathname + window.location.search) {
      window.history.replaceState(null, "", url);
    }
  }, [respuestas, filtros, provincia]);

  const cambiar = (campo: Campo, valor: string | string[] | undefined) =>
    setRespuestas((r) => conCampo(r, campo, valor));

  const hrefSitios = (() => {
    const qs = filtrosAQuery(filtros);
    return `/fuera-de-ruta/${provincia}/sitios${qs ? `?${qs}` : ""}`;
  })();

  const bloqueViajero = BLOQUES.find((b) => b.id === "viajero")!;
  const bloqueViaje = BLOQUES.find((b) => b.id === "viaje")!;

  if (paso === "viajero") {
    return (
      <PasoBloque
        bloque={bloqueViajero}
        numero={1}
        respuestas={respuestas}
        onCambiar={cambiar}
        atras={<Link href={hrefSitios} className="fr-s5-atras" aria-label="Volver a los resultados">‹</Link>}
        onSiguiente={() => setPaso("viaje")}
        textoSiguiente="Seguir →"
      />
    );
  }

  if (paso === "viaje") {
    return (
      <PasoBloque
        bloque={bloqueViaje}
        numero={2}
        respuestas={respuestas}
        onCambiar={cambiar}
        atras={<button className="fr-s5-atras" onClick={() => setPaso("viajero")} aria-label="Volver">‹</button>}
        onSiguiente={() => setPaso("resumen")}
        textoSiguiente="Ver resumen →"
      />
    );
  }

  if (paso === "resumen") {
    return (
      <Resumen
        respuestas={respuestas}
        onEditar={() => setPaso("viajero")}
        onEmpezar={() => setPaso("resultado")}
        onAtras={() => setPaso("viaje")}
      />
    );
  }

  return (
    <Resultado
      datos={datos}
      matriz={matriz}
      provincia={provincia}
      filtros={filtros}
      respuestas={respuestas}
      seleccion={seleccion}
      setSeleccion={setSeleccion}
      onEditar={() => setPaso("resumen")}
    />
  );
}

// ------------------------------------------------------------ Un paso = un bloque
function PasoBloque({ bloque, numero, respuestas, onCambiar, atras, onSiguiente, textoSiguiente }: {
  bloque: Bloque;
  numero: number;
  respuestas: Respuestas;
  onCambiar: (campo: Campo, valor: string | string[] | undefined) => void;
  atras: React.ReactNode;
  onSiguiente: () => void;
  textoSiguiente: string;
}) {
  const visibles = bloque.preguntas.filter((p) => !p.visible || p.visible(respuestas));
  return (
    <div className="fr-s5-form">
      <div className="fr-s5-form-head">
        {atras}
        <h1 className="fr-s5-titulo">{bloque.titulo}</h1>
        <span className="fr-mono">paso {numero} de 3</span>
      </div>

      <div className="fr-s5-form-card fr-tarjeta">
        <p className="fr-cq-intro">{bloque.intro}</p>
        {visibles.map((p) => (
          <PreguntaCampo key={p.campo} pregunta={p} respuestas={respuestas} onCambiar={onCambiar} />
        ))}
      </div>

      <div className="fr-s5-cta-barra">
        <button className="fr-btn fr-btn--primario fr-s5-montar" onClick={onSiguiente}>{textoSiguiente}</button>
      </div>
    </div>
  );
}

// Una pregunta: chips de opciones (única o multi con tope) o el selector de fecha.
function PreguntaCampo({ pregunta: p, respuestas: r, onCambiar }: {
  pregunta: Pregunta;
  respuestas: Respuestas;
  onCambiar: (campo: Campo, valor: string | string[] | undefined) => void;
}) {
  return (
    <div className="fr-s5-preg">
      <span className="fr-s5-preg-t">{p.titulo}</span>
      {p.ayuda && <span className="fr-s5-preg-nota">{p.ayuda}</span>}

      {p.control === "fecha" ? (
        <label className="fr-s5-fecha">
          <span>{legibleFecha(uno(r, "fecha"))}</span>
          <input type="date" value={uno(r, "fecha") ?? ""} onChange={(e) => onCambiar("fecha", e.target.value || undefined)} />
        </label>
      ) : (
        <ChipsOpciones pregunta={p} respuestas={r} onCambiar={onCambiar} />
      )}
    </div>
  );
}

function ChipsOpciones({ pregunta: p, respuestas: r, onCambiar }: {
  pregunta: Pregunta;
  respuestas: Respuestas;
  onCambiar: (campo: Campo, valor: string | string[] | undefined) => void;
}) {
  const seleccion = p.multi ? varios(r, p.campo) : ([uno(r, p.campo)].filter(Boolean) as string[]);
  const tope = !!(p.multi && p.max && seleccion.length >= p.max);

  const toggle = (valor: string) => {
    if (!p.multi) {
      onCambiar(p.campo, seleccion[0] === valor ? undefined : valor);
      return;
    }
    const activo = seleccion.includes(valor);
    if (!activo && tope) return;
    onCambiar(p.campo, activo ? seleccion.filter((v) => v !== valor) : [...seleccion, valor]);
  };

  return (
    <div className="fr-s5-chips">
      {p.opciones!.map((o) => {
        const on = seleccion.includes(o.valor);
        return (
          <button
            key={o.valor}
            className={`fr-chip${on ? " fr-chip--activo" : ""}`}
            disabled={!on && tope}
            aria-pressed={on}
            onClick={() => toggle(o.valor)}
          >
            {o.etiqueta}
          </button>
        );
      })}
    </div>
  );
}

// ------------------------------------------------------------ Resumen editable
function Resumen({ respuestas, onEditar, onEmpezar, onAtras }: {
  respuestas: Respuestas;
  onEditar: () => void;
  onEmpezar: () => void;
  onAtras: () => void;
}) {
  const lineas = resumenPerfil(respuestas);
  return (
    <div className="fr-s5-form">
      <div className="fr-s5-form-head">
        <button className="fr-s5-atras" onClick={onAtras} aria-label="Volver">‹</button>
        <h1 className="fr-s5-titulo">Así es tu viaje</h1>
        <span className="fr-mono">paso 3 de 3</span>
      </div>

      <div className="fr-s5-form-card fr-tarjeta">
        <p className="fr-cq-intro">
          Esto es lo que vamos a preparar. Repásalo y, si algo no encaja, edítalo antes de empezar.
        </p>
        {lineas.length > 0 ? (
          <ul className="fr-cq-resumen">
            {lineas.map((l) => <li key={l}>{l}</li>)}
          </ul>
        ) : (
          <p className="fr-cq-vacio">No has marcado preferencias: te propondremos lo mejor de la zona sin filtrar nada.</p>
        )}
        <button className="fr-s5-link" onClick={onEditar}>✏️ Quiero modificar alguna respuesta</button>
      </div>

      <div className="fr-s5-cta-barra">
        <button className="fr-btn fr-btn--primario fr-s5-montar" onClick={onEmpezar}>
          ✔ Empezar a preparar mi viaje
        </button>
      </div>
    </div>
  );
}

// ------------------------------------------------------------ Listado + panel «Mi viaje»
// Fase D (§4.9-4.13): el cuestionario alimenta al motor; sus candidatas se pintan como
// tarjetas puntuadas (listado reducido por días) y el usuario las añade a un panel que
// recalcula en vivo tiempo, km y reparto por días. El motor es instantáneo: la pantalla
// de transición cuenta —con números reales— lo que de verdad hizo.

// Tope de tarjetas según duración del viaje (§4.9: nunca cientos).
const topePorDias = (dias: number) => (dias <= 2 ? 20 : dias <= 5 ? 35 : 50);

function Resultado({ datos, matriz, provincia, filtros, respuestas, seleccion, setSeleccion, onEditar }: {
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
    () => (verItinerario ? generarItinerario(resumen.dias, datos, matriz, { ...opts, horaSalida }) : null),
    [verItinerario, resumen.dias, datos, matriz, opts, horaSalida],
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

      {fichaAbierta && porSlug.get(fichaAbierta) && (
        <FichaDrawer
          destino={porSlug.get(fichaAbierta)!}
          zona={zonaNombre.get(porSlug.get(fichaAbierta)!.zona) ?? porSlug.get(fichaAbierta)!.zona}
          provincia={provincia}
          elegida={seleccion.has(fichaAbierta)}
          onAlternar={() => alternar(fichaAbierta)}
          onCerrar={() => setFichaAbierta(null)}
        />
      )}
    </div>
  );
}

// Drawer superpuesto de «Ver más» (§4.10): una vista breve de la ficha sobre la propia
// pantalla, sin navegar. Muestra lo esencial —foto, qué es, datos, lo mejor y avisos— y
// deja añadir/quitar sin cerrar; el enlace a la ficha completa sí abre pestaña (acción
// deliberada de profundizar). Pinta solo lo que hay: todos los campos son opcionales.
function FichaDrawer({ destino: d, zona, provincia, elegida, onAlternar, onCerrar }: {
  destino: Destino;
  zona: string;
  provincia: string;
  elegida: boolean;
  onAlternar: () => void;
  onCerrar: () => void;
}) {
  useEffect(() => {
    const cerrarConEsc = (e: KeyboardEvent) => { if (e.key === "Escape") onCerrar(); };
    window.addEventListener("keydown", cerrarConEsc);
    return () => window.removeEventListener("keydown", cerrarConEsc);
  }, [onCerrar]);

  const datos: string[] = [];
  if (d.duracion) datos.push(`🕒 ${d.duracion}`);
  if (d.dificultad) datos.push(`🥾 ${d.dificultad}`);
  if (d.distanciaKm) datos.push(`📏 ${d.distanciaKm[0]}–${d.distanciaKm[1]} km`);
  if (d.desnivelM) datos.push(`⛰ ${d.desnivelM[0]}–${d.desnivelM[1]} m`);
  if (d.bano) datos.push("💧 baño");
  if (d.ninos === false) datos.push("👶 no apto");
  if (d.perros === false) datos.push("🐕 no apto");

  return (
    <div className="fr-fd-scrim" onClick={onCerrar}>
      <div className="fr-fd" role="dialog" aria-modal="true" aria-label={d.nombre} onClick={(e) => e.stopPropagation()}>
        <button className="fr-fd-cerrar" onClick={onCerrar} aria-label="Cerrar">×</button>

        <div className="fr-fd-scroll">
          <div className="fr-fd-foto">
            {d.imagen ? (
              <Image src={d.imagen} alt={d.nombre} fill sizes="(max-width: 720px) 100vw, 480px" />
            ) : (
              <div className="fr-d-card-fallback"><i className="fr-s3-foto-pronto">foto en camino</i></div>
            )}
            {d.favoritoDeCris && <span className="fr-d-card-fav">★ favorito de Cris</span>}
          </div>

          <div className="fr-fd-body">
            <span className="fr-d-card-meta">{zona} · {d.tipo}</span>
            <h2 className="fr-fd-nombre">{d.nombre}</h2>
            {d.queEs && <p className="fr-fd-lead">{d.queEs}</p>}

            {datos.length > 0 && (
              <div className="fr-fd-datos">
                {datos.map((t) => <span key={t} className="fr-d-dato">{t}</span>)}
              </div>
            )}
            {d.precio && <p className="fr-fd-precio">💶 {d.precio}</p>}

            {d.loMejor && d.loMejor.length > 0 && (
              <div className="fr-fd-lista">
                <span className="fr-fd-lista-t">Lo mejor</span>
                <ul>{d.loMejor.map((l) => <li key={l}>✅ {l}</li>)}</ul>
              </div>
            )}
            {d.antesDeIr && d.antesDeIr.length > 0 && (
              <div className="fr-fd-lista">
                <span className="fr-fd-lista-t">Antes de ir</span>
                <ul>{d.antesDeIr.map((l) => <li key={l}>⚠ {l}</li>)}</ul>
              </div>
            )}
          </div>
        </div>

        <div className="fr-fd-cta">
          <button
            className={`fr-btn fr-fd-anadir${elegida ? " fr-d-anadir--on" : " fr-btn--primario"}`}
            aria-pressed={elegida}
            onClick={onAlternar}
          >
            {elegida ? "✔ En tu viaje" : "+ Añadir a mi viaje"}
          </button>
          <Link href={`/fuera-de-ruta/${provincia}/${d.slug}`} target="_blank" rel="noopener" className="fr-s5-link fr-fd-completa">
            Ver ficha completa ↗
          </Link>
        </div>
      </div>
    </div>
  );
}

// Comparador Inteligente (§4.8): los campos de las actividades de «Mi viaje» lado a lado
// + frases condicionales del motor (nunca «esta es mejor»: la restricción vive en la
// plantilla, ver comparador.ts). Es la respuesta al aviso de tiempo de la auditoría y se
// abre también a mano. Reusa el overlay del drawer; cierra con Esc o el scrim.
function Comparador({ comparativa, destinos, provincia, onCerrar }: {
  comparativa: Comparativa;
  destinos: Destino[];
  provincia: string;
  onCerrar: () => void;
}) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onCerrar(); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onCerrar]);

  const { nombres, filas, frases } = comparativa;
  return (
    <div className="fr-fd-scrim" onClick={onCerrar}>
      <div className="fr-fd fr-fd--ancho" role="dialog" aria-modal="true" aria-label="Comparar actividades" onClick={(e) => e.stopPropagation()}>
        <button className="fr-fd-cerrar" onClick={onCerrar} aria-label="Cerrar">×</button>

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
      </div>
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

// ------------------------------------------------------------ Panel «Mi viaje»
// (§4.12-4.13): lo seleccionado, tiempo total, km y reparto por días, recalculado en
// vivo. Nunca descarta: si un día no cabe en el ritmo, lo marca y avisa. Guarda perfil +
// selección (el viaje se replanifica al abrir, no se congela).
// Rango de días de una zona de alojamiento: "Día 2" o "Días 1-3" (el tramo es contiguo).
const fmtDias = (dias: number[]) =>
  dias.length === 1 ? `Día ${dias[0]}` : `Días ${dias[0]}-${dias[dias.length - 1]}`;

const ICONO_AUD: Record<Hallazgo["nivel"], string> = { ok: "✅", aviso: "⚠️", idea: "💡" };

function PanelViaje({ resumen, auditoria, oportunidades, zonas, porSlug, provincia, respuestas, seleccion, onQuitar, onAnadir, onQueDecidaLaIA, onVerItinerario, onComparar }: {
  resumen: ResumenViaje;
  auditoria: Hallazgo[];
  oportunidades: Oportunidad[];
  zonas: ZonaAlojamiento[];
  porSlug: Map<string, Destino>;
  provincia: string;
  respuestas: Respuestas;
  seleccion: Set<string>;
  onQuitar: (slug: string) => void;
  onAnadir: (slug: string) => void;
  onQueDecidaLaIA: () => void;
  onVerItinerario: () => void;
  onComparar: () => void;
}) {
  const vacio = seleccion.size === 0;

  // «Guardado» se deriva, no se almacena: guardo la firma de la selección guardada y la
  // comparo con la actual. Así al cambiar la selección el botón se reactiva solo —cada
  // selección distinta es una entrada nueva en «Mis viajes»— sin un efecto que resetee.
  const [firmaGuardada, setFirmaGuardada] = useState<string | null>(null);
  const firma = [...seleccion].sort().join(",");
  const guardado = !vacio && firmaGuardada === firma;

  const guardar = () => {
    try {
      guardarViaje(provincia, respuestas, [...seleccion]);
      setFirmaGuardada(firma);
    } catch { /* navegador sin localStorage: no se guarda, no se rompe */ }
  };

  return (
    <aside className="fr-d-panel fr-tarjeta">
      <h2 className="fr-d-panel-t">Mi viaje</h2>

      {vacio ? (
        <p className="fr-d-panel-vacio">
          Aún no has añadido nada. Añade actividades desde las tarjetas, o deja que te propongamos un viaje equilibrado para empezar.
        </p>
      ) : (
        <>
          <div className="fr-d-totales">
            <span><b>{resumen.totalParadas}</b> {resumen.totalParadas === 1 ? "sitio" : "sitios"}</span>
            <span><b>{duracion(resumen.totalMin)}</b> en total</span>
            {resumen.totalKm > 0 && <span><b>{resumen.totalKm}</b> km en coche</span>}
          </div>

          {auditoria.length > 0 && (
            <ul className="fr-d-aud">
              {auditoria.map((h, i) => (
                <li key={i} className={h.nivel === "aviso" ? "fr-d-aviso" : "fr-d-aud-linea"}>
                  <span aria-hidden>{ICONO_AUD[h.nivel]}</span>
                  <span>{h.texto}</span>
                </li>
              ))}
            </ul>
          )}

          <ol className="fr-d-dias">
            {resumen.dias.map((d) => (
              <li key={d.numero} className={`fr-d-dia${d.apretado ? " fr-d-dia--apretado" : ""}`}>
                <div className="fr-d-dia-cab">
                  <span className="fr-d-dia-n">Día {d.numero}</span>
                  {d.slugs.length > 0
                    ? <span className="fr-mono">{duracion(d.min)}{d.km > 0 ? ` · ${d.km} km` : ""}</span>
                    : <span className="fr-mono fr-d-dia-libre">libre</span>}
                </div>
                {d.slugs.map((s) => (
                  <div key={s} className="fr-d-dia-parada">
                    <span>{porSlug.get(s)?.nombre ?? s}</span>
                    <button className="fr-d-quitar" aria-label="Quitar" onClick={() => onQuitar(s)}>×</button>
                  </div>
                ))}
              </li>
            ))}
          </ol>

          {oportunidades.length > 0 && (
            <div className="fr-d-oport">
              <h3 className="fr-d-oport-t">Ya que pasáis cerca…</h3>
              <ul className="fr-d-oport-lista">
                {oportunidades.map((o) => (
                  <li key={o.destino.slug} className="fr-d-oport-item">
                    <div className="fr-d-oport-info">
                      <span className="fr-d-oport-nombre">{o.destino.nombre}</span>
                      <span className="fr-d-oport-meta fr-mono">{o.destino.tipo} · +{o.desvioMin} min de coche</span>
                    </div>
                    <button
                      className="fr-btn fr-btn--primario fr-d-oport-add"
                      onClick={() => onAnadir(o.destino.slug)}
                    >
                      + Añadir
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {zonas.length > 0 && (
            <div className="fr-d-aloj">
              <h3 className="fr-d-aloj-t">🛏 Dónde dormir</h3>
              <ul className="fr-d-aloj-lista">
                {zonas.map((z) => (
                  <li key={z.pueblo + z.dias[0]} className="fr-d-aloj-item">
                    <div className="fr-d-aloj-cab">
                      <span className="fr-d-aloj-pueblo">{z.pueblo}</span>
                      <span className="fr-mono fr-d-aloj-dias">{fmtDias(z.dias)}</span>
                    </div>
                    <span className="fr-d-aloj-paradas">Cerca de {z.paradas.join(", ")}.</span>
                    {z.ahorroMin != null && (
                      <span className="fr-d-aloj-ahorro">Cambiar de base aquí ahorra ~{z.ahorroMin} min de coche.</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      <div className="fr-d-panel-cta">
        {!vacio && (
          <button className="fr-btn fr-btn--primario fr-d-itinerario" onClick={onVerItinerario}>
            🗓 Ver mi itinerario día a día
          </button>
        )}
        {seleccion.size >= 2 && (
          <button className="fr-btn fr-d-comparar" onClick={onComparar}>
            ⚖️ Comparar actividades
          </button>
        )}
        <button className="fr-btn fr-d-ia" onClick={onQueDecidaLaIA}>
          ✨ Que elija Cris por mí
        </button>
        {!vacio && (
          <button className="fr-btn fr-d-guardar" onClick={guardar} disabled={guardado}>
            {guardado ? "✔ Guardado en «Mis viajes»" : "Guardar mi viaje"}
          </button>
        )}
      </div>
      <span className="sr-only" aria-live="polite">{guardado ? "Viaje guardado" : ""}</span>
    </aside>
  );
}
