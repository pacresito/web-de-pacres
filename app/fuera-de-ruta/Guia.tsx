"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { DatosViajes, Destino } from "@/lib/fuera-de-ruta/tipos";
import type { MatrizViajes } from "@/lib/fuera-de-ruta/planificador/geo";
import type { Ritmo } from "@/lib/fuera-de-ruta/planificador/tipos";
import { duracion } from "@/lib/fuera-de-ruta/formato";
import { fmtHora, type DiaItin, type ComidaItin, type Itinerario } from "@/lib/fuera-de-ruta/itinerario/itinerario";
import {
  CIERRE, totalesViaje, consejosDelDia, alternativasLluvia, type Alternativa,
} from "@/lib/fuera-de-ruta/guia/guia";
import type { PuntoViaje } from "./MapaViaje";

const MapaViaje = dynamic(() => import("./MapaViaje"), { ssr: false });

// La guía del viaje (Fase G, §5.4-5.9 + briefing §10): **cuatro vistas de los mismos datos**,
// no cuatro documentos que haya que mantener sincronizados. Todas leen el itinerario de la
// Fase E: la guía A lo pinta entero con sus consejos, la de bolsillo lo resume a una
// pantalla, el mapa lo recorre en el mismo orden y la alternativa de lluvia (guía B) cuelga
// de cada parada, ya calculada. El PDF es la guía A impresa (ver `@media print`).

const mapsHref = (gps?: [number, number]) =>
  gps ? `https://www.google.com/maps/search/?api=1&query=${gps[0]},${gps[1]}` : undefined;

// Icono por tipo de destino, solo para la guía de bolsillo: ahí el icono sustituye a la
// palabra («🥾 Ruta de los hórreos»), que es lo que la hace legible de un vistazo.
const ICONO_TIPO: Record<string, string> = {
  ruta: "🥾", cascada: "💧", pueblo: "🏘️", mirador: "🌅", cueva: "🕳️",
  parque: "🌲", monumento: "🏛️", alojamiento: "🏨", actividad: "✨",
};
const icono = (tipo: string) => ICONO_TIPO[tipo] ?? "📍";

type Vista = "itinerario" | "bolsillo" | "mapa";

const VISTAS: { id: Vista; texto: string }[] = [
  { id: "itinerario", texto: "Día a día" },
  { id: "bolsillo", texto: "De bolsillo" },
  { id: "mapa", texto: "Mapa" },
];

export default function Guia({ itinerario, datos, porSlug, matriz, ritmo, provincia, onAtras, onHoraSalida }: {
  itinerario: Itinerario;
  datos: DatosViajes;
  porSlug: Map<string, Destino>;
  matriz: MatrizViajes;
  ritmo: Ritmo;
  provincia: string;
  onAtras: () => void;
  onHoraSalida: (dia: number, min: number) => void;
}) {
  const [vista, setVista] = useState<Vista>("itinerario");
  // La guía sustituye a la pantalla anterior sin navegar, así que hereda su scroll y se
  // abre por la mitad (o por el final en móvil, donde el botón vive abajo del todo).
  useEffect(() => { window.scrollTo(0, 0); }, []);
  const totales = useMemo(() => totalesViaje(itinerario), [itinerario]);
  // Guía B: precalculada al abrir la guía, no al pulsar el botón (§5.5: es un plan ya hecho).
  const alternativas = useMemo(
    () => alternativasLluvia(itinerario, porSlug, datos.destinos, matriz, ritmo),
    [itinerario, porSlug, datos.destinos, matriz, ritmo],
  );
  const zonaNombre = useMemo(() => new Map(datos.zonas.map((z) => [z.id, z.nombre])), [datos.zonas]);

  return (
    <div className="fr-g-wrap">
      <div className="fr-s5-form-head fr-g-head">
        <button className="fr-s5-atras fr-g-no-print" onClick={onAtras} aria-label="Volver a mi viaje">‹</button>
        <h1 className="fr-s5-titulo">Tu guía de viaje</h1>
        <button className="fr-s5-link fr-g-no-print" onClick={() => window.print()}>⬇ Descargar en PDF</button>
      </div>

      {/* Los totales son del viaje, no del día: en la guía de bolsillo estorban y le roban
          la pantalla que necesita (§5.7). Se ocultan por clase, para que el PDF los lleve. */}
      <ul className={`fr-g-totales${vista === "bolsillo" ? " fr-g-oculto" : ""}`}>
        <li>🗓️ <b>{totales.diasConPlan}</b> {totales.diasConPlan === 1 ? "día" : "días"} con plan{totales.dias > totales.diasConPlan ? ` de ${totales.dias}` : ""}</li>
        <li>📷 <b>{totales.actividades}</b> actividades</li>
        <li>🚗 <b>{duracion(totales.conduccionMin)}</b>{totales.km > 0 ? ` · ${totales.km} km` : ""}</li>
        <li>📍 {totales.zonas.map((z) => zonaNombre.get(z) ?? z).join(" · ")}</li>
      </ul>

      <nav className="fr-g-tabs fr-g-no-print" aria-label="Vistas de la guía">
        {VISTAS.map((v) => (
          <button
            key={v.id}
            className={`fr-g-tab${vista === v.id ? " fr-g-tab--on" : ""}`}
            aria-current={vista === v.id}
            onClick={() => setVista(v.id)}
          >
            {v.texto}
          </button>
        ))}
      </nav>

      {/* La guía A queda siempre montada aunque no sea la vista activa: es la que se imprime. */}
      <div className={vista === "itinerario" ? undefined : "fr-g-oculto"}>
        <p className="fr-d-sub fr-it-nota">
          Horarios orientativos, calculados con las horas de luz reales y los tiempos de coche.
          No pretende llenar cada minuto: si sobra tiempo, es tuyo.
        </p>
        {itinerario.dias.map((d) => (
          <DiaItinerario
            key={d.numero}
            dia={d}
            porSlug={porSlug}
            provincia={provincia}
            alternativas={alternativas}
            onHoraSalida={onHoraSalida}
          />
        ))}
      </div>

      {vista === "bolsillo" && <VistaBolsillo itinerario={itinerario} porSlug={porSlug} />}
      {vista === "mapa" && <VistaMapa itinerario={itinerario} datos={datos} porSlug={porSlug} />}

      <p className="fr-g-cierre">{CIERRE}</p>
    </div>
  );
}

// ------------------------------------------------------------ Guía A: el día a día
// §5.4: cada día con su resumen (luz, coche, estancia, alojamiento) y su cronología —hora de
// llegada, inicio, estancia, salida y conducción a la siguiente, con la comida intercalada y
// el regreso—, más los consejos del día y la alternativa de lluvia por actividad. La hora de
// salida es editable y todo se recalcula. Enlace a Maps por parada (el parking).
function DiaItinerario({ dia, porSlug, provincia, alternativas, onHoraSalida }: {
  dia: DiaItin;
  porSlug: Map<string, Destino>;
  provincia: string;
  alternativas: Map<string, Alternativa>;
  onHoraSalida: (dia: number, min: number) => void;
}) {
  const consejos = consejosDelDia(dia, porSlug);

  if (dia.paradas.length === 0) {
    return (
      <section className="fr-it-dia fr-tarjeta fr-it-dia--libre">
        <h2 className="fr-it-dia-t">Día {dia.numero}</h2>
        <p className="fr-it-libre">Día libre. Descansa o improvisa: este día no lo hemos planificado.</p>
      </section>
    );
  }
  return (
    <section className="fr-it-dia fr-tarjeta">
      <div className="fr-it-dia-cab">
        <h2 className="fr-it-dia-t">Día {dia.numero}</h2>
        {dia.alojamiento && <span className="fr-it-aloj">🏨 {dia.alojamiento.nombre}</span>}
      </div>

      <ul className="fr-it-resumen">
        <li>🌅 <b>{fmtHora(dia.amanecer)}</b> · 🌇 <b>{fmtHora(dia.atardecer)}</b></li>
        <li>🚗 <b>{duracion(dia.conduccionMin)}</b>{dia.km > 0 ? ` · ${dia.km} km` : ""}</li>
        <li>👀 estancia <b>{duracion(dia.estanciaTotalMin)}</b></li>
      </ul>

      <label className="fr-it-salida">
        <span>🕗 Hora de salida</span>
        <input
          type="time"
          value={fmtHora(dia.horaSalida)}
          onChange={(e) => {
            const [h, m] = e.target.value.split(":").map(Number);
            if (!Number.isNaN(h)) onHoraSalida(dia.numero, h * 60 + (m || 0));
          }}
        />
      </label>

      <ol className="fr-it-timeline">
        <li className="fr-it-hito">
          <span className="fr-it-hora">{fmtHora(dia.horaSalida)}</span>
          <span className="fr-it-txt">Salida desde {dia.alojamiento ? dia.alojamiento.nombre : "el inicio del día"}.</span>
        </li>

        {dia.paradas.map((p, i) => {
          const prevFin = i > 0 ? dia.paradas[i - 1].horaSalida : dia.horaSalida;
          const comidaAntes = dia.comida && dia.comida.horaInicio >= prevFin && dia.comida.horaInicio <= p.horaLlegada;
          const gps = porSlug.get(p.slug)?.gps;
          return (
            <li key={p.slug} className="fr-it-parada-wrap">
              {comidaAntes && <BloqueComida comida={dia.comida!} />}
              <div className="fr-it-parada">
                <span className="fr-it-hora">{fmtHora(p.horaLlegada)}</span>
                <div className="fr-it-txt">
                  <span className="fr-it-parada-n">
                    Llegada a <b>{p.nombre}</b>{p.nocturna && <span className="fr-it-luna"> 🌙</span>}
                    {p.cocheDesdeAnteriorMin > 0 && <span className="fr-mono fr-it-coche"> · {duracion(p.cocheDesdeAnteriorMin)} en coche{p.kmDesdeAnterior > 0 ? ` (${p.kmDesdeAnterior} km)` : ""}</span>}
                  </span>
                  {p.pausaComida ? (
                    <>
                      <span className="fr-it-detalle">
                        {p.prepMin > 0 && `Aparcar y prepararse ${p.prepMin} min. `}
                        Empieza a las <b>{fmtHora(p.horaInicio)}</b> · estancia total recomendada <b>{duracion(p.estanciaMin)}</b>.
                      </span>
                      <span className="fr-it-detalle fr-it-pausa">
                        🍴 {fmtHora(p.pausaComida.horaInicio)} — {p.pausaComida.restaurante ? <>pausa para comer en <b>{p.pausaComida.restaurante}</b></> : "pausa para comer"} ({duracion(p.pausaComida.min)}) y sigues hasta las <b>{fmtHora(p.horaSalida)}</b>.
                      </span>
                    </>
                  ) : (
                    <span className="fr-it-detalle">
                      {p.prepMin > 0 && `Aparcar y prepararse ${p.prepMin} min. `}
                      Empieza a las <b>{fmtHora(p.horaInicio)}</b>, estancia recomendada <b>{duracion(p.estanciaMin)}</b> → salida <b>{fmtHora(p.horaSalida)}</b>.
                    </span>
                  )}
                  <span className="fr-it-enlaces">
                    {mapsHref(gps) && (
                      <a className="fr-s5-link" href={mapsHref(gps)} target="_blank" rel="noopener">📍 Cómo llegar</a>
                    )}
                    {p.tipo !== "alojamiento" && (
                      <Link className="fr-s5-link" href={`/fuera-de-ruta/${provincia}/${p.slug}`} target="_blank" rel="noopener">Ver ficha</Link>
                    )}
                  </span>
                  {alternativas.get(p.slug) && (
                    <BloqueLluvia alternativa={alternativas.get(p.slug)!} porSlug={porSlug} provincia={provincia} />
                  )}
                </div>
              </div>
            </li>
          );
        })}

        {/* Comida que no partió el recorrido (día de una sola parada): va tras la última. */}
        {dia.comida && !dia.paradas.some((p, i) => {
          const prevFin = i > 0 ? dia.paradas[i - 1].horaSalida : dia.horaSalida;
          return dia.comida!.horaInicio >= prevFin && dia.comida!.horaInicio <= p.horaLlegada;
        }) && <li className="fr-it-parada-wrap"><BloqueComida comida={dia.comida} /></li>}

        {dia.regreso && (
          <li className="fr-it-hito">
            <span className="fr-it-hora">{fmtHora(dia.regreso.horaLlegada)}</span>
            <span className="fr-it-txt">
              🏨 Regreso a {dia.alojamiento?.nombre}
              <span className="fr-mono fr-it-coche"> · {duracion(dia.regreso.cocheMin)} en coche{dia.regreso.km > 0 ? ` (${dia.regreso.km} km)` : ""}</span>
            </span>
          </li>
        )}
      </ol>

      {consejos.length > 0 && (
        <div className="fr-g-consejos">
          <h3 className="fr-g-consejos-t">Consejos del día</h3>
          <ul>{consejos.map((c) => <li key={c}>{c}</li>)}</ul>
        </div>
      )}

      {dia.avisos.length > 0 && (
        <ul className="fr-it-avisos">
          {dia.avisos.map((a) => <li key={a}>⚠ {a}</li>)}
        </ul>
      )}
    </section>
  );
}

function BloqueComida({ comida }: { comida: ComidaItin }) {
  return (
    <div className="fr-it-comida">
      <span className="fr-it-hora">{fmtHora(comida.horaInicio)}</span>
      <span className="fr-it-txt">
        🍴 {comida.restaurante ? <>Comida en <b>{comida.restaurante}</b></> : "Parada para comer"} · {duracion(comida.min)}
      </span>
    </div>
  );
}

// ------------------------------------------------------------ Guía B: la lluvia
// §5.5: la alternativa ya está calculada; el botón solo la enseña. No reorganiza el viaje ni
// consulta la previsión —decide el usuario, y solo si llueve—. En el PDF sale desplegada
// (`@media print`): en papel no hay botón que pulsar.
function BloqueLluvia({ alternativa: a, porSlug, provincia }: {
  alternativa: Alternativa;
  porSlug: Map<string, Destino>;
  provincia: string;
}) {
  const [abierto, setAbierto] = useState(false);
  return (
    <div className="fr-g-lluvia">
      <button className="fr-g-lluvia-b fr-g-no-print" onClick={() => setAbierto((v) => !v)} aria-expanded={abierto}>
        🌧️ Ver alternativa en caso de lluvia
      </button>
      <div className="fr-g-lluvia-cuerpo" hidden={!abierto}>
        <b>{a.nombre}</b> — {a.queEs}
        <span className="fr-it-detalle">
          🚗 {duracion(a.cocheMin)} desde aquí{a.km > 0 ? ` (${a.km} km)` : ""} · ⏱️ {duracion(a.estanciaMin)} · {a.motivo}
        </span>
        <span className="fr-it-enlaces">
          {mapsHref(porSlug.get(a.slug)?.gps) && (
            <a className="fr-s5-link" href={mapsHref(porSlug.get(a.slug)?.gps)} target="_blank" rel="noopener">📍 Cómo llegar</a>
          )}
          <Link className="fr-s5-link" href={`/fuera-de-ruta/${provincia}/${a.slug}`} target="_blank" rel="noopener">Ver ficha</Link>
        </span>
      </div>
    </div>
  );
}

// ------------------------------------------------------------ Guía de bolsillo
// §5.7: el día en una pantalla de móvil, para consultarlo en menos de un minuto durante el
// viaje. Un día cada vez —si hubiera que hacer scroll entre días ya no cabe en la pantalla—.
function VistaBolsillo({ itinerario, porSlug }: { itinerario: Itinerario; porSlug: Map<string, Destino> }) {
  const conPlan = itinerario.dias.filter((d) => d.paradas.length > 0);
  const [numero, setNumero] = useState(conPlan[0]?.numero ?? 1);
  const dia = conPlan.find((d) => d.numero === numero) ?? conPlan[0];

  if (!dia) return <p className="fr-d-sub">Aún no hay ningún día planificado.</p>;

  const consejos = consejosDelDia(dia, porSlug);
  return (
    <div className="fr-g-bolsillo">
      <nav className="fr-g-dias" aria-label="Día">
        {conPlan.map((d) => (
          <button
            key={d.numero}
            className={`fr-g-dia-b${d.numero === dia.numero ? " fr-g-dia-b--on" : ""}`}
            aria-current={d.numero === dia.numero}
            onClick={() => setNumero(d.numero)}
          >
            Día {d.numero}
          </button>
        ))}
      </nav>

      <section className="fr-tarjeta fr-g-tarjeta-b">
        <p className="fr-g-b-linea">🕗 Salida <b>{fmtHora(dia.horaSalida)}</b> · 🚗 {duracion(dia.conduccionMin)}</p>
        <ul className="fr-g-b-lista">
          {filasBolsillo(dia, porSlug).map((f) => (
            <li key={f.clave}>
              <span className="fr-mono fr-g-b-hora">{fmtHora(f.hora)}</span>
              <span>
                {f.icono} <b>{f.nombre}</b>{f.cola}
                {mapsHref(f.gps) && <> · <a className="fr-s5-link" href={mapsHref(f.gps)} target="_blank" rel="noopener">📍</a></>}
              </span>
            </li>
          ))}
        </ul>
        {consejos.length > 0 && <p className="fr-g-b-consejo">⚠️ {consejos[0]}</p>}
      </section>
    </div>
  );
}

// Las líneas del día en **orden de reloj**: actividades, comida y regreso mezclados. En la
// guía A la comida va intercalada en su sitio del recorrido; aquí, donde solo se leen horas,
// lo único que se entiende es el orden cronológico puro.
type FilaBolsillo = { clave: string; hora: number; icono: string; nombre: string; cola: string; gps?: [number, number] };

function filasBolsillo(dia: DiaItin, porSlug: Map<string, Destino>): FilaBolsillo[] {
  const filas: FilaBolsillo[] = dia.paradas.map((p) => ({
    clave: p.slug,
    hora: p.horaInicio,
    icono: icono(p.tipo),
    nombre: p.nombre,
    cola: ` · ${duracion(p.estanciaMin)}`,
    gps: porSlug.get(p.slug)?.gps,
  }));
  const comidas = [dia.comida, ...dia.paradas.map((p) => p.pausaComida)].filter((c) => c !== undefined);
  for (const [i, c] of comidas.entries()) {
    filas.push({ clave: `comida-${i}`, hora: c.horaInicio, icono: "🍴", nombre: c.restaurante ?? "Parada para comer", cola: "" });
  }
  if (dia.regreso && dia.alojamiento) {
    filas.push({ clave: "regreso", hora: dia.regreso.horaLlegada, icono: "🏨", nombre: dia.alojamiento.nombre, cola: "" });
  }
  return filas.sort((a, b) => a.hora - b.hora);
}

// ------------------------------------------------------------ Mapa del viaje
// §5.6: las paradas en el orden de la planificación, con el alojamiento y los restaurantes
// del plan, y Google Maps a un clic desde cada punto. La lista de al lado repite el orden
// para quien prefiera leerlo (y para que el mapa no sea la única forma de llegar al enlace).
function VistaMapa({ itinerario, datos, porSlug }: {
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
      const aloj = dia.alojamiento ? porSlug.get(dia.alojamiento.slug) : undefined;
      if (aloj?.gps) lista.push({ slug: aloj.slug, nombre: aloj.nombre, gps: aloj.gps, etiqueta: "🏨", dia: dia.numero, base: true, detalle: `Día ${dia.numero} · salida y regreso` });
      lista.push(...delDia.sort((a, b) => a.hora - b.hora));
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
