"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { DatosViajes, Destino, Rango, Restaurante } from "@/lib/fuera-de-ruta/tipos";
import { filtrarDestinos, type Filtros } from "@/lib/fuera-de-ruta/filtrar";
import { resumenFiltros } from "@/lib/fuera-de-ruta/resumen";
import { COMIDA_TEXTO, rango, RITMO_TEXTO } from "@/lib/fuera-de-ruta/formato";
import { planificar } from "@/lib/fuera-de-ruta/planificador/planificar";
import type { MatrizViajes } from "@/lib/fuera-de-ruta/planificador/geo";
import type { Comida, Dia, Parada, Propuesta, Ritmo } from "@/lib/fuera-de-ruta/planificador/tipos";
import { serializarEncargo, type Encargo } from "@/lib/fuera-de-ruta/planificador/encargo";
import { guardarViaje } from "@/lib/fuera-de-ruta/planificador/guardados";
import { filtrosAQuery } from "@/lib/fuera-de-ruta/url-filtros";

// S5 «Crear mi viaje» (Río pop, F6): superficie sobre el motor determinista.
// Paso 1 = formulario (filtros heredados del explorador + 5 preguntas por chips);
// paso 2 = las 3 propuestas de planificar() con su itinerario. El motor no toca red
// ni cambia aquí: solo se le pasan los inputs y se pinta el resultado.

const RITMOS: { valor: Ritmo; texto: string }[] = [
  { valor: "relajado", texto: "tranquilo" },
  { valor: "medio", texto: "normal" },
  { valor: "activo", texto: "a tope" },
];
const COMIDAS: { valor: Comida; texto: string }[] = [
  { valor: "restaurante", texto: "restaurante" },
  { valor: "picnic", texto: "picnic" },
  { valor: "da-igual", texto: "da igual" },
];
const MAX_IMPRESCINDIBLES = 3;

const hoy = () => new Date().toISOString().slice(0, 10);

// --- Formateo de tiempos (todo en minutos desde medianoche o duraciones) ---
const pad = (n: number) => String(n).padStart(2, "0");
const hhmm = (m: number) => `${Math.floor(m / 60) % 24}:${pad(Math.round(m) % 60)}`;
const dur = (m: number) => {
  const h = Math.floor(m / 60), mm = Math.round(m % 60);
  return h && mm ? `${h} h ${mm}` : h ? `${h} h` : `${mm} min`;
};
const horasDec = (m: number) => `${(m / 60).toFixed(1).replace(/\.0$/, "").replace(".", ",")} h`;

// "vie 12", "sep" en español, a partir de una fecha local.
const diaFmt = new Intl.DateTimeFormat("es-ES", { weekday: "short", day: "numeric" });
const mesFmt = new Intl.DateTimeFormat("es-ES", { month: "short" });
const fechaLocal = (iso: string, sumaDias = 0) => {
  const d = new Date(`${iso}T00:00`);
  d.setDate(d.getDate() + sumaDias);
  return d;
};
const juntarY = (v: string[]) => (v.length <= 1 ? v.join("") : `${v.slice(0, -1).join(", ")} y ${v[v.length - 1]}`);

export default function CrearViaje({ datos, matriz, provincia, filtros, inicial }: {
  datos: DatosViajes;
  matriz: MatrizViajes;
  provincia: string;        // slug de URL ("navarra"), para los enlaces y el Compartir
  filtros: Filtros;         // filtros heredados del explorador, por la URL
  inicial?: Encargo;        // encargo llegado por URL (Compartir): arranca en el paso 2
}) {
  const [paso, setPaso] = useState<1 | 2>(inicial ? 2 : 1);
  const [dias, setDias] = useState(inicial?.dias ?? 2);
  const [ritmo, setRitmo] = useState<Ritmo>(inicial?.ritmo ?? "medio");
  const [comida, setComida] = useState<Comida>(inicial?.comida ?? "restaurante");
  const [fecha, setFecha] = useState(inicial?.fecha ?? hoy);
  const [imprescindibles, setImprescindibles] = useState<string[]>(inicial?.imprescindibles ?? []);
  const [propuestas, setPropuestas] = useState<Propuesta[] | null>(
    () => (inicial ? planificar({ datos, matriz, ...inicial, fecha: new Date(inicial.fecha) }) : null),
  );

  const zonaNombre = useMemo(() => new Map(datos.zonas.map((z) => [z.id, z.nombre])), [datos.zonas]);
  const zona = (id: string) => zonaNombre.get(id) ?? id;
  const destinoPorSlug = useMemo(() => new Map(datos.destinos.map((d) => [d.slug, d])), [datos.destinos]);
  const restPorNombre = useMemo(() => new Map(datos.restaurantes.map((r) => [r.nombre, r])), [datos.restaurantes]);

  // Candidatos reales del motor: filtrados, con GPS en la matriz y visitables. Son los
  // que se pueden marcar como imprescindibles (el resto no entraría en el plan igual).
  const candidatos = useMemo(
    () => filtrarDestinos(datos.destinos, filtros)
      .filter((d) => d.gps && matriz.ids.includes(d.slug) && d.tipo !== "alojamiento"),
    [datos.destinos, filtros, matriz],
  );

  const resumenHeredado = resumenFiltros(filtros, zona);
  const topeImp = imprescindibles.length >= MAX_IMPRESCINDIBLES;
  const toggleImp = (slug: string) =>
    setImprescindibles((s) =>
      s.includes(slug) ? s.filter((x) => x !== slug) : s.length >= MAX_IMPRESCINDIBLES ? s : [...s, slug]);

  // Volver a los resultados = volver a los filtros con los que se entró, que viajan en
  // la URL. Un plan compartido cae así en el explorador de quien lo abre, con los
  // mismos filtros que usó quien lo montó.
  const queryFiltros = filtrosAQuery(filtros);
  const hrefSitios = `/fuera-de-ruta/${provincia}/sitios${queryFiltros ? `?${queryFiltros}` : ""}`;

  const encargo = (): Encargo => ({ dias, fecha, ritmo, comida, imprescindibles, filtros });
  const montar = () => {
    setPropuestas(planificar({ datos, matriz, filtros, dias, ritmo, comida, fecha: new Date(fecha), imprescindibles }));
    setPaso(2);
  };

  const rangoFechas = (() => {
    const ini = fechaLocal(fecha), fin = fechaLocal(fecha, dias - 1);
    return dias === 1 ? `${diaFmt.format(ini)} ${mesFmt.format(ini)}` : `${diaFmt.format(ini)} → ${diaFmt.format(fin)} ${mesFmt.format(fin)}`;
  })();

  if (paso === 2 && propuestas) {
    return (
      <Propuestas
        propuestas={propuestas}
        encargo={encargo()}
        propuestaInicial={inicial?.propuesta}
        provincia={provincia}
        rangoFechas={rangoFechas}
        resumenHeredado={resumenHeredado}
        destinoPorSlug={destinoPorSlug}
        restPorNombre={restPorNombre}
        zona={zona}
        onEditar={() => setPaso(1)}
      />
    );
  }

  // ------------------------------------------------------------- PASO 1 · Formulario
  return (
    <div className="fr-s5-form">
      <div className="fr-s5-form-head">
        <Link href={hrefSitios} className="fr-s5-atras" aria-label="Volver a los resultados">‹</Link>
        <h1 className="fr-s5-titulo">Crear mi viaje</h1>
        <span className="fr-mono">paso 1 de 2</span>
      </div>

      <div className="fr-s5-form-card fr-tarjeta">
        <div className="fr-s5-heredados">
          <span className="fr-s5-heredados-badge">✓</span>
          <span>
            Vienen contigo los filtros del explorador:{" "}
            <b>{resumenHeredado || `${datos.comunidad} entera`}</b>.{" "}
            <Link href={hrefSitios} className="fr-s5-link">Editar</Link>
          </span>
        </div>

        <Pregunta titulo="¿Cuántos días?">
          <div className="fr-s5-chips">
            {[1, 2, 3].map((n) => (
              <Chip key={n} on={dias === n} onClick={() => setDias(n)}>{n}</Chip>
            ))}
            <Chip on={dias >= 4} onClick={() => setDias((d) => (d >= 4 ? d : 4))}>4+</Chip>
            {dias >= 4 && (
              <span className="fr-s5-stepper">
                <button onClick={() => setDias((d) => Math.max(4, d - 1))} aria-label="Un día menos">−</button>
                <b>{dias} días</b>
                <button onClick={() => setDias((d) => Math.min(15, d + 1))} aria-label="Un día más">+</button>
              </span>
            )}
          </div>
        </Pregunta>

        <Pregunta titulo="¿Cuándo?" nota="La fecha decide las horas de luz y los avisos de época.">
          <label className="fr-s5-fecha">
            <span>{rangoFechas}</span>
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value || hoy())} />
          </label>
        </Pregunta>

        <Pregunta titulo="¿A qué ritmo?">
          <div className="fr-s5-chips">
            {RITMOS.map((r) => (
              <Chip key={r.valor} on={ritmo === r.valor} onClick={() => setRitmo(r.valor)}>{r.texto}</Chip>
            ))}
          </div>
        </Pregunta>

        <Pregunta titulo="¿Dónde comemos?">
          <div className="fr-s5-chips">
            {COMIDAS.map((c) => (
              <Chip key={c.valor} on={comida === c.valor} onClick={() => setComida(c.valor)}>{c.texto}</Chip>
            ))}
          </div>
        </Pregunta>

        {candidatos.length > 0 && (
          <Pregunta titulo="Imprescindibles" nota={`máx. ${MAX_IMPRESCINDIBLES}`}>
            <div className="fr-s5-chips">
              {candidatos.map((d) => {
                const on = imprescindibles.includes(d.slug);
                return (
                  <button
                    key={d.slug}
                    className={`fr-s5-imp${on ? " fr-s5-imp--on" : ""}`}
                    disabled={!on && topeImp}
                    onClick={() => toggleImp(d.slug)}
                  >
                    {on && "★ "}{d.nombre}
                  </button>
                );
              })}
            </div>
          </Pregunta>
        )}
      </div>

      <div className="fr-s5-cta-barra">
        <button className="fr-btn fr-btn--primario fr-s5-montar" onClick={montar} disabled={candidatos.length === 0}>
          {candidatos.length === 0 ? "Nada que planificar" : "Montar mi viaje →"}
        </button>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ PASO 2 · Propuestas
function Propuestas({ propuestas, encargo, propuestaInicial, provincia, rangoFechas, resumenHeredado, destinoPorSlug, restPorNombre, zona, onEditar }: {
  propuestas: Propuesta[];
  encargo: Encargo;
  propuestaInicial?: Propuesta["id"]; // la que traía el enlace guardado o compartido
  provincia: string;
  rangoFechas: string;
  resumenHeredado: string;
  destinoPorSlug: Map<string, Destino>;
  restPorNombre: Map<string, Restaurante>;
  zona: (id: string) => string;
  onEditar: () => void;
}) {
  const [activa, setActiva] = useState<Propuesta["id"]>(propuestaInicial ?? propuestas[0].id);
  const [abiertoDia, setAbiertoDia] = useState(1); // acordeón móvil: un día abierto
  const [aviso, setAviso] = useState("");
  const prop = propuestas.find((p) => p.id === activa)!;

  // Separador "·" (no "y"): las zonas reales ya contienen "y" ("Baztán y Otsondo").
  const zonasViaje = [...new Set(prop.dias.map((d) => zona(d.zona)))].join(" · ");
  const nombre = (slug: string) => destinoPorSlug.get(slug)?.nombre ?? slug;

  const mostrarAviso = (t: string) => { setAviso(t); window.setTimeout(() => setAviso(""), 2600); };

  // Lo que se comparte o se guarda es el encargo **con la propuesta abierta**: quien lo
  // abra cae en la que se eligió, no en la A por defecto.
  const encargoElegido = (): Encargo => ({ ...encargo, propuesta: activa });

  // El enlace apunta al planificador, no al índice: la provincia va en la ruta (el
  // encargo no la lleva) y quien lo abre cae directamente en las propuestas.
  const compartir = async () => {
    const url = `${window.location.origin}/fuera-de-ruta/${provincia}/crear-viaje?${serializarEncargo(encargoElegido())}`;
    window.history.replaceState(null, "", url);
    try {
      await navigator.clipboard.writeText(url);
      mostrarAviso("Enlace copiado — pégalo donde quieras");
    } catch {
      mostrarAviso("Enlace listo en la barra de direcciones");
    }
  };

  const guardar = () => {
    try {
      guardarViaje(provincia, encargoElegido());
      mostrarAviso("Viaje guardado — lo tienes en «Mis viajes»");
    } catch {
      mostrarAviso("No se pudo guardar en este navegador");
    }
  };

  return (
    <div className="fr-s5-plan">
      <div className="fr-s5-plan-head">
        <div className="fr-s5-plan-titulo">
          Tu viaje · <b>{encargo.dias} {encargo.dias === 1 ? "día" : "días"}</b>
          {zonasViaje && <> por {zonasViaje}</>}
        </div>
        <div className="fr-s5-acciones">
          <button className="fr-btn fr-btn--secundario" onClick={compartir}>Compartir</button>
          <button className="fr-btn fr-btn--primario" onClick={guardar}>Guardar</button>
        </div>
      </div>

      <div className="fr-s5-plan-body">
        <aside className="fr-s5-rail">
          <div className="fr-s5-encargo fr-tarjeta">
            <span className="fr-mono">tu encargo</span>
            <div className="fr-s5-encargo-l"><b>{encargo.dias} {encargo.dias === 1 ? "día" : "días"}</b> · {rangoFechas}</div>
            <div className="fr-s5-encargo-l">ritmo {RITMO_TEXTO[encargo.ritmo]} · {COMIDA_TEXTO[encargo.comida]}</div>
            {encargo.imprescindibles.length > 0 && (
              <div className="fr-s5-encargo-l">★ {juntarY(encargo.imprescindibles.map(nombre))}</div>
            )}
            <div className="fr-s5-encargo-l fr-s5-encargo-filtros">filtros: {resumenHeredado || "Navarra entera"}</div>
            <button className="fr-s5-link" onClick={onEditar}>Editar</button>
          </div>

          <NoEncajan propuesta={prop} nombre={nombre} />
        </aside>

        <div className="fr-s5-derecha">
          <div className="fr-s5-tabs">
            {propuestas.map((p) => {
              const sitios = p.dias.reduce((s, d) => s + d.paradas.length, 0);
              return (
                <button
                  key={p.id}
                  className={`fr-s5-tab${p.id === activa ? " fr-s5-tab--on" : ""}`}
                  onClick={() => setActiva(p.id)}
                >
                  <span className="fr-s5-tab-id">{p.id} · {p.nombre}</span>
                  <span className="fr-s5-tab-meta">{sitios} sitios · {dur(p.cocheTotalMin)} de coche</span>
                </button>
              );
            })}
          </div>

          <div className="fr-s5-dias">
            {prop.dias.map((d) => (
              <DiaCard
                key={d.numero}
                dia={d}
                provincia={provincia}
                fechaBase={encargo.fecha}
                zonaTxt={zona(d.zona)}
                imprescindibles={encargo.imprescindibles}
                destinoPorSlug={destinoPorSlug}
                restPorNombre={restPorNombre}
                abierto={abiertoDia === d.numero}
                onAbrir={() => setAbiertoDia(d.numero)}
              />
            ))}
            <div className="fr-s5-noencajan-movil">
              <NoEncajan propuesta={prop} nombre={nombre} />
            </div>
          </div>
        </div>
      </div>

      {aviso && <div className="fr-s5-toast">{aviso}</div>}

      <div className="fr-s5-barra-movil">
        <button className="fr-btn fr-btn--secundario" onClick={compartir}>Compartir</button>
        <button className="fr-btn fr-btn--primario fr-s5-barra-guardar" onClick={guardar}>Guardar viaje</button>
      </div>
    </div>
  );
}

// Caja "No encajan en la A": descartes con motivo humano y la propuesta que sí lo coloca.
function NoEncajan({ propuesta: p, nombre }: { propuesta: Propuesta; nombre: (slug: string) => string }) {
  if (!p.sinEncajar.length) return null;
  return (
    <div className="fr-s5-noencajan">
      <span className="fr-mono">no encajan en la {p.id}</span>
      {p.sinEncajar.map((s) => (
        <div key={s.slug} className="fr-s5-descarte">
          <b>{nombre(s.slug)}</b>
          <span>{s.motivo}</span>
          {s.enPropuesta && <span className="fr-s5-descarte-otra">Están en la propuesta {s.enPropuesta} ↓</span>}
        </div>
      ))}
    </div>
  );
}

// Un día del itinerario: cabecera con barra plan-vs-luz + timeline (paradas blancas,
// comida rosa, conectores "coche N min"). En móvil es acordeón (resumen si plegado).
function DiaCard({ dia: d, provincia, fechaBase, zonaTxt, imprescindibles, destinoPorSlug, restPorNombre, abierto, onAbrir }: {
  dia: Dia;
  provincia: string;
  fechaBase: string;
  zonaTxt: string;
  imprescindibles: string[];
  destinoPorSlug: Map<string, Destino>;
  restPorNombre: Map<string, Restaurante>;
  abierto: boolean;
  onAbrir: () => void;
}) {
  const dstr = diaFmt.format(fechaLocal(fechaBase, d.numero - 1));
  const pct = Math.min(100, Math.round((d.minutosActivos / d.minutosLuz) * 100));
  const resumenLinea = `${d.paradas.slice(0, 2).map((p) => p.nombre).join(" + ")}${d.paradas.length > 2 ? "…" : ""} · ${dur(d.minutosActivos)} de plan`;

  // Índice de la parada ante la que se intercala la comida (la primera que arranca
  // tras la comida). -1 si no hay restaurante programado.
  const idxComida = d.restaurante && d.comidaHoraInicio != null
    ? d.paradas.findIndex((p) => p.horaInicio > d.comidaHoraInicio!)
    : -1;
  const rest = d.restaurante ? restPorNombre.get(d.restaurante) : undefined;

  return (
    <section className={`fr-s5-dia fr-tarjeta${abierto ? " fr-s5-dia--abierto" : ""}`}>
      <button className="fr-s5-dia-head" onClick={onAbrir} aria-expanded={abierto}>
        <span className="fr-s5-dia-num">Día {d.numero} · {dstr}</span>
        <span className="fr-s5-dia-zona">{zonaTxt}</span>
        <span className="fr-s5-dia-resumen">{resumenLinea}</span>
        <span className="fr-s5-dia-flecha">{abierto ? "▴" : "▾"}</span>
      </button>

      <div className="fr-s5-dia-cuerpo">
          <div className="fr-s5-luz">
            <span className="fr-s5-luz-track"><span className="fr-s5-luz-fill" style={{ width: `${pct}%` }} /></span>
            <span className="fr-mono">{dur(d.minutosActivos)} de plan · {horasDec(d.minutosLuz)} de luz</span>
          </div>

          <ol className="fr-s5-timeline">
            {d.paradas.map((p, i) => (
              <li key={p.slug}>
                {p.cocheDesdeAnterior > 0 && <Conector min={p.cocheDesdeAnterior} />}
                {i === idxComida && rest && <ComidaItem rest={rest} hora={d.comidaHoraInicio!} />}
                <ParadaItem
                  parada={p}
                  num={i + 1}
                  href={`/fuera-de-ruta/${provincia}/${p.slug}`}
                  estrella={imprescindibles.includes(p.slug)}
                  distanciaKm={destinoPorSlug.get(p.slug)?.distanciaKm}
                />
              </li>
            ))}
            {rest && idxComida === -1 && (
              <li><ComidaItem rest={rest} hora={d.comidaHoraInicio ?? d.paradas[d.paradas.length - 1].horaInicio} /></li>
            )}
          </ol>

          {d.avisos.map((a) => <p key={a} className="fr-s5-aviso">{a}</p>)}
      </div>
    </section>
  );
}

function Conector({ min }: { min: number }) {
  return <div className="fr-s5-conector"><span className="fr-s5-coche">coche {dur(min)}</span></div>;
}

function ParadaItem({ parada: p, num, href, estrella, distanciaKm }: {
  parada: Parada;
  num: number;
  href: string;
  estrella: boolean;
  distanciaKm?: Rango;
}) {
  const meta = [hhmm(p.horaInicio), dur(p.visitaMin), distanciaKm && `${rango(distanciaKm, "km")} a pie`].filter(Boolean).join(" · ");
  return (
    <Link href={href} className="fr-s5-item fr-s5-item--parada">
      <span className="fr-s5-pin">{num}</span>
      <span className="fr-s5-item-txt">
        <span className="fr-s5-item-nombre">{p.nombre}{estrella && <span className="fr-s5-star"> ★</span>}</span>
        <span className="fr-s5-item-meta">{meta}</span>
      </span>
      <span className="fr-s5-item-ir">›</span>
    </Link>
  );
}

function ComidaItem({ rest, hora }: { rest: Restaurante; hora: number }) {
  const meta = [hhmm(hora), rest.poblacion].filter(Boolean).join(" · ");
  return (
    <div className="fr-s5-item fr-s5-item--comida">
      <span className="fr-s5-pin fr-s5-pin--r">R</span>
      <span className="fr-s5-item-txt">
        <span className="fr-s5-item-nombre">{rest.nombre}</span>
        <span className="fr-s5-item-meta">{meta}</span>
      </span>
    </div>
  );
}

// --- Piezas de formulario ---
function Pregunta({ titulo, nota, children }: { titulo: string; nota?: string; children: React.ReactNode }) {
  return (
    <div className="fr-s5-preg">
      <span className="fr-s5-preg-t">{titulo}{nota && <em className="fr-s5-preg-nota"> {nota}</em>}</span>
      {children}
    </div>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button className={`fr-chip${on ? " fr-chip--activo" : ""}`} onClick={onClick} aria-pressed={on}>
      {children}
    </button>
  );
}
