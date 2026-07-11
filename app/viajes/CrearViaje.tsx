"use client";

import { useMemo, useState } from "react";
import type { DatosViajes } from "@/lib/viajes/tipos";
import { filtrarDestinos, type Filtros } from "@/lib/viajes/filtrar";
import { planificar } from "@/lib/viajes/planificador/planificar";
import type { MatrizViajes } from "@/lib/viajes/planificador/geo";
import type { Comida, Propuesta, Ritmo } from "@/lib/viajes/planificador/tipos";
import matrizNavarra from "@/data/viajes/matriz-navarra.json";

// UI "Crear mi viaje" (Fase E.3): superficie sobre el motor determinista. Toma los
// filtros actuales del Explorador (incluidas las zonas del mapa), pide los inputs de
// viaje y pinta las 3 propuestas de planificar(). El motor no toca red: solo se le
// pasan los inputs y se pinta el resultado. Estilo provisional `.v-` (pulido = handoff).
const matriz = matrizNavarra as MatrizViajes;

const RITMOS: { valor: Ritmo; texto: string }[] = [
  { valor: "relajado", texto: "Relajado" },
  { valor: "medio", texto: "Medio" },
  { valor: "activo", texto: "Activo" },
];
const COMIDAS: { valor: Comida; texto: string }[] = [
  { valor: "restaurante", texto: "Restaurante" },
  { valor: "picnic", texto: "Picnic" },
  { valor: "da-igual", texto: "Da igual" },
  { valor: "solo-cena", texto: "Solo cena" },
];

const hoy = () => new Date().toISOString().slice(0, 10);
const fmt = (m: number) => `${Math.floor(m / 60)}h${String(m % 60).padStart(2, "0")}`;

export default function CrearViaje({ datos, filtros, onVolver }: {
  datos: DatosViajes;
  filtros: Filtros;       // filtros actuales del Explorador (incluyen la zona del mapa)
  onVolver: () => void;   // volver a la lista de resultados
}) {
  const [dias, setDias] = useState(2);
  const [ritmo, setRitmo] = useState<Ritmo>("medio");
  const [comida, setComida] = useState<Comida>("restaurante");
  const [fecha, setFecha] = useState(hoy);
  const [imprescindibles, setImprescindibles] = useState<string[]>([]);
  const [propuestas, setPropuestas] = useState<Propuesta[] | null>(null);

  // Candidatos reales del motor: filtrados, con GPS en la matriz y visitables. Son los
  // que se pueden marcar como imprescindibles (el resto no entraría en el plan igual).
  const candidatos = useMemo(
    () => filtrarDestinos(datos.destinos, filtros)
      .filter((d) => d.gps && matriz.ids.includes(d.slug) && d.tipo !== "alojamiento"),
    [datos.destinos, filtros],
  );
  const nombrePorSlug = useMemo(
    () => new Map(datos.destinos.map((d) => [d.slug, d.nombre])),
    [datos.destinos],
  );

  const toggleImp = (slug: string) =>
    setImprescindibles((s) => (s.includes(slug) ? s.filter((x) => x !== slug) : [...s, slug]));

  const generar = () =>
    setPropuestas(planificar({ datos, matriz, filtros, dias, ritmo, comida, fecha: new Date(fecha), imprescindibles }));

  return (
    <div className="v-plan">
      <button className="v-volver-zonas" onClick={onVolver}>← Volver a los resultados</button>
      <h1 className="v-plan-titulo">Crear mi viaje</h1>
      <p className="v-plan-sub">
        Sobre {candidatos.length} {candidatos.length === 1 ? "sitio" : "sitios"} con tus filtros.
        Ajusta el viaje y te propongo tres planes.
      </p>

      <div className="v-plan-form">
        <div className="v-fila">
          <div className="v-campo">
            <label htmlFor="v-dias">Días</label>
            <input
              id="v-dias" type="number" min={1} max={15} value={dias}
              onChange={(e) => setDias(Math.min(15, Math.max(1, Number(e.target.value) || 1)))}
            />
          </div>
          <div className="v-campo">
            <label htmlFor="v-fecha">Fecha</label>
            <input id="v-fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </div>
        </div>

        <Segmentado label="Ritmo" opciones={RITMOS} valor={ritmo} onElegir={setRitmo} />
        <Segmentado label="Comida" opciones={COMIDAS} valor={comida} onElegir={setComida} />

        {candidatos.length > 0 && (
          <div className="v-grupo">
            <span className="v-grupo-label">Imprescindibles</span>
            <div className="v-grupo-chips">
              {candidatos.map((d) => (
                <label key={d.slug} className="v-toggle" data-on={imprescindibles.includes(d.slug)}>
                  <input type="checkbox" checked={imprescindibles.includes(d.slug)} onChange={() => toggleImp(d.slug)} />
                  {d.nombre}
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="v-plan-acciones">
          <button className="v-ver" onClick={generar} disabled={candidatos.length === 0}>
            {candidatos.length === 0 ? "Nada que planificar" : "Planificar →"}
          </button>
        </div>
      </div>

      {propuestas && (
        <div className="v-propuestas">
          {propuestas.map((p) => (
            <PropuestaCard key={p.id} propuesta={p} nombrePorSlug={nombrePorSlug} />
          ))}
        </div>
      )}
    </div>
  );
}

function PropuestaCard({ propuesta: p, nombrePorSlug }: {
  propuesta: Propuesta;
  nombrePorSlug: Map<string, string>;
}) {
  return (
    <section className="v-propuesta">
      <header className="v-propuesta-head">
        <span className="v-propuesta-id">{p.id}</span>
        <div>
          <div className="v-propuesta-nombre">{p.nombre}</div>
          <div className="v-propuesta-meta">
            {p.dias.length} {p.dias.length === 1 ? "día" : "días"} · {fmt(p.cocheTotalMin)} de coche
          </div>
        </div>
      </header>

      {p.avisos.map((a) => <p key={a} className="v-aviso">{a}</p>)}

      <div className="v-dias">
        {p.dias.map((d) => (
          <div key={d.numero} className="v-dia">
            <div className="v-dia-head">
              <span className="v-dia-num">Día {d.numero}</span>
              <span className="v-dia-zona">{d.zona}</span>
              <span className="v-dia-luz">{fmt(d.minutosActivos)} / {fmt(d.minutosLuz)} de luz</span>
            </div>
            <ol className="v-paradas">
              {d.paradas.map((par) => (
                <li key={par.slug} className="v-parada">
                  {par.cocheDesdeAnterior > 0 && (
                    <span className="v-parada-coche">🚗 {fmt(par.cocheDesdeAnterior)}</span>
                  )}
                  <span className="v-parada-nombre">{par.nombre}</span>
                  <span className="v-parada-visita">{fmt(par.visitaMin)}</span>
                </li>
              ))}
            </ol>
            {d.restaurante && <div className="v-dia-resto">🍽 {d.restaurante}</div>}
            {d.avisos.map((a) => <p key={a} className="v-aviso">{a}</p>)}
          </div>
        ))}
      </div>

      {p.sinEncajar.length > 0 && (
        <div className="v-sin-encajar">
          <span className="v-grupo-label">No caben</span>
          <span>{p.sinEncajar.map((s) => nombrePorSlug.get(s.slug) ?? s.slug).join(" · ")}</span>
        </div>
      )}
    </section>
  );
}

// Selector de valor único en fila (ritmo, comida): mismos chips, sin multi.
function Segmentado<T extends string>({ label, opciones, valor, onElegir }: {
  label: string;
  opciones: { valor: T; texto: string }[];
  valor: T;
  onElegir: (v: T) => void;
}) {
  return (
    <div className="v-grupo">
      <span className="v-grupo-label">{label}</span>
      <div className="v-grupo-chips">
        {opciones.map((o) => (
          <label key={o.valor} className="v-toggle" data-on={valor === o.valor}>
            <input type="radio" checked={valor === o.valor} onChange={() => onElegir(o.valor)} />
            {o.texto}
          </label>
        ))}
      </div>
    </div>
  );
}
