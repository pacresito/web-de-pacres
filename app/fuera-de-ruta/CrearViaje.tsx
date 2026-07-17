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
type Paso = "viajero" | "viaje" | "resumen" | "resultado";

const fechaFmt = new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long" });
const legibleFecha = (iso?: string) => (iso ? fechaFmt.format(new Date(`${iso}T00:00`)) : "Elegir fecha");

// --- Persistencia del viajero (bloque 1) en localStorage, defensiva en ambos sentidos ---
function leerViajero(): Respuestas {
  try {
    const obj = JSON.parse(localStorage.getItem(CLAVE_VIAJERO) ?? "{}") as Respuestas;
    return recortar(obj, camposDe("viajero"));
  } catch {
    return {};
  }
}
function guardarViajero(r: Respuestas) {
  try {
    localStorage.setItem(CLAVE_VIAJERO, JSON.stringify(recortar(r, camposDe("viajero"))));
  } catch {
    /* navegador sin localStorage: el viajero no se recuerda, no pasa nada más */
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
    abrir ? podar(abrir.perfil) : podar({ ...leerViajero(), ...viajeInicial }));
  const [paso, setPaso] = useState<Paso>(abrir ? "resultado" : "viajero");
  const [seleccion, setSeleccion] = useState<Set<string>>(() => new Set(abrir?.seleccion ?? []));

  // El viajero se recuerda; el viaje se refleja en la URL (sobre los filtros heredados,
  // que no chocan de clave). replaceState, no router: no queremos re-render del servidor.
  // OJO (Next ≥14.1): replaceState **sincroniza con useSearchParams**, y como los filtros
  // llegan de ahí, escribir en cada render realimentaba render→escribe→render (cuelgue al
  // marcar una opción). Por eso solo se escribe si la URL cambia de verdad: idempotente.
  useEffect(() => {
    guardarViajero(respuestas);
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

  if (!listo) {
    return <Transicion candidatas={candidatas.length} eliminadas={eliminadas.length} onListo={() => setListo(true)} />;
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
                provincia={provincia}
                elegida={seleccion.has(c.destino.slug)}
                onAlternar={() => alternar(c.destino.slug)}
              />
            </li>
          ))}
        </ul>

        <PanelViaje
          resumen={resumen}
          porSlug={porSlug}
          provincia={provincia}
          respuestas={respuestas}
          seleccion={seleccion}
          onQuitar={alternar}
          onQueDecidaLaIA={queDecidaLaIA}
        />
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
function TarjetaActividad({ destino: d, zona, provincia, elegida, onAlternar }: {
  destino: Destino;
  zona: string;
  provincia: string;
  elegida: boolean;
  onAlternar: () => void;
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
          <Link href={`/fuera-de-ruta/${provincia}/${d.slug}`} target="_blank" rel="noopener" className="fr-s5-link">
            Ver más
          </Link>
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
const fmtDur = (min: number) => {
  const h = Math.floor(min / 60), m = Math.round(min % 60);
  return h ? (m ? `${h} h ${m} min` : `${h} h`) : `${m} min`;
};

function PanelViaje({ resumen, porSlug, provincia, respuestas, seleccion, onQuitar, onQueDecidaLaIA }: {
  resumen: ResumenViaje;
  porSlug: Map<string, Destino>;
  provincia: string;
  respuestas: Respuestas;
  seleccion: Set<string>;
  onQuitar: (slug: string) => void;
  onQueDecidaLaIA: () => void;
}) {
  const vacio = seleccion.size === 0;
  const apretados = resumen.dias.filter((d) => d.apretado).length;

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
            <span><b>{fmtDur(resumen.totalMin)}</b> en total</span>
            {resumen.totalKm > 0 && <span><b>{resumen.totalKm}</b> km en coche</span>}
          </div>

          {apretados > 0 && (
            <p className="fr-d-aviso">
              Con esta selección, {apretados === 1 ? "un día va muy justo" : `${apretados} días van muy justos`} para el ritmo que elegiste.
              Puedes quitar algo o dejarlo así: nunca eliminamos nada por ti.
            </p>
          )}

          <ol className="fr-d-dias">
            {resumen.dias.map((d) => (
              <li key={d.numero} className={`fr-d-dia${d.apretado ? " fr-d-dia--apretado" : ""}`}>
                <div className="fr-d-dia-cab">
                  <span className="fr-d-dia-n">Día {d.numero}</span>
                  {d.slugs.length > 0
                    ? <span className="fr-mono">{fmtDur(d.min)}{d.km > 0 ? ` · ${d.km} km` : ""}</span>
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
        </>
      )}

      <div className="fr-d-panel-cta">
        <button className="fr-btn fr-d-ia" onClick={onQueDecidaLaIA}>
          ✨ Que elija Cris por mí
        </button>
        {!vacio && (
          <button className="fr-btn fr-btn--primario fr-d-guardar" onClick={guardar} disabled={guardado}>
            {guardado ? "✔ Guardado en «Mis viajes»" : "Guardar mi viaje"}
          </button>
        )}
      </div>
      <span className="sr-only" aria-live="polite">{guardado ? "Viaje guardado" : ""}</span>
    </aside>
  );
}
