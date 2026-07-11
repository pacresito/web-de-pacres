"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import type { DatosViajes, Destino, Restaurante } from "@/lib/viajes/tipos";
import { filtrarDestinos, nivelesDificultad, type Desnivel, type Filtros } from "@/lib/viajes/filtrar";
import { rango } from "@/lib/viajes/formato";
import CrearViaje from "./CrearViaje";

// Leaflet toca `window`: solo en cliente, sin SSR.
const Mapa = dynamic(() => import("./Mapa"), { ssr: false });

// Explorador del índice /viajes: mantiene el estado de filtros en cliente y
// deriva la lista filtrada que alimenta a la vez el grid y el mapa.
// Estilo provisional en viajes.css; la lógica no depende de él.

// Umbrales (valor único, no categoría): un tope acumulativo no admite multi-selección.
const DISTANCIAS = [5, 10, 15, 20, 25];
const DURACIONES = [1, 2, 3, 4, 6];
const DESNIVELES: { valor: Desnivel; texto: string }[] = [
  { valor: "<150", texto: "Hasta 150 m" },
  { valor: "<300", texto: "Hasta 300 m" },
  { valor: "<500", texto: "Hasta 500 m" },
  { valor: "+500", texto: "Más de 500 m" },
];

// Opciones categóricas con su texto visible, en orden. Se muestran solo las
// presentes en los datos (como `tipos`), para no ofrecer filtros que no filtran.
type Opcion = { valor: string; texto: string };
const DIFICULTADES: Opcion[] = [
  { valor: "fácil", texto: "Fácil" },
  { valor: "media", texto: "Media" },
  { valor: "difícil", texto: "Difícil" },
];
const EPOCAS: Opcion[] = [
  { valor: "primavera", texto: "Primavera" },
  { valor: "verano", texto: "Verano" },
  { valor: "otono", texto: "Otoño" },
  { valor: "invierno", texto: "Invierno" },
];
const AGUAS: Opcion[] = [
  { valor: "ibon", texto: "Ibón" },
  { valor: "cascada", texto: "Cascada" },
  { valor: "rio", texto: "Río" },
  { valor: "poza", texto: "Poza" },
  { valor: "embalse", texto: "Embalse" },
];

export default function Explorador({ datos, zonaInicial, onCambiarZonas }: {
  datos: DatosViajes;
  zonaInicial?: string[];        // zonas elegidas en la entrada por mapa (vacío = todas)
  onCambiarZonas?: () => void;   // volver a la entrada por mapa
}) {
  const [filtros, setFiltros] = useState<Filtros>(() => (zonaInicial?.length ? { zona: zonaInicial } : {}));
  const [verRestaurantes, setVerRestaurantes] = useState(false);
  const [modo, setModo] = useState<"explorar" | "plan">("explorar");

  const nombreZona = useMemo(
    () => new Map(datos.zonas.map((z) => [z.id, z.nombre])),
    [datos.zonas],
  );
  // Opciones categóricas presentes en los datos: solo se ofrece lo que filtra.
  const tipos = useMemo<Opcion[]>(
    () => [...new Set(datos.destinos.map((d) => d.tipo))].sort().map((t) => ({ valor: t, texto: t })),
    [datos.destinos],
  );
  const dificultades = useMemo(() => presentes(DIFICULTADES, datos.destinos.flatMap((d) => nivelesDificultad(d.dificultad))), [datos.destinos]);
  const epocas = useMemo(() => presentes(EPOCAS, datos.destinos.flatMap((d) => d.epoca ?? [])), [datos.destinos]);
  const aguas = useMemo(() => presentes(AGUAS, datos.destinos.flatMap((d) => d.agua ?? [])), [datos.destinos]);

  const destinos = useMemo(
    () => filtrarDestinos(datos.destinos, filtros),
    [datos.destinos, filtros],
  );

  const zonaUnica = filtros.zona?.length === 1 ? filtros.zona[0] : undefined;
  const restaurantes = filtros.zona?.length
    ? datos.restaurantes.filter((r) => filtros.zona!.includes(r.zona))
    : datos.restaurantes;

  const set = (parcial: Partial<Filtros>) => setFiltros((f) => ({ ...f, ...parcial }));
  // Alterna un valor en una dimensión multi-selección. Vacía = `undefined`, para
  // que la clave no cuente como filtro activo (se miran valores, no claves).
  const toggle = (clave: "zona" | "tipo" | "dificultad" | "epoca" | "agua", valor: string) =>
    setFiltros((f) => {
      const actual = f[clave] ?? [];
      const nueva = actual.includes(valor) ? actual.filter((v) => v !== valor) : [...actual, valor];
      return { ...f, [clave]: nueva.length ? nueva : undefined };
    });
  // Desactivar un filtro deja su clave con `undefined` (el spread no la borra):
  // hay que mirar valores, no claves.
  const hayFiltros = Object.values(filtros).some((v) => v !== undefined);

  if (modo === "plan") {
    return <CrearViaje datos={datos} filtros={filtros} onVolver={() => setModo("explorar")} />;
  }

  return (
    <>
      <div className="v-filtros">
        <div className="v-filtros-inner">
          {onCambiarZonas && (
            <button className="v-volver-zonas" onClick={onCambiarZonas}>← Cambiar zonas</button>
          )}
          <div className="v-fila">
            <div className="v-campo">
              <label htmlFor="v-dist">Distancia</label>
              <select
                id="v-dist"
                value={filtros.distanciaMax ?? ""}
                onChange={(e) => set({ distanciaMax: e.target.value ? Number(e.target.value) : undefined })}
              >
                <option value="">Sin tope</option>
                {DISTANCIAS.map((km) => (
                  <option key={km} value={km}>Hasta {km} km</option>
                ))}
              </select>
            </div>

            <div className="v-campo">
              <label htmlFor="v-dur">Duración</label>
              <select
                id="v-dur"
                value={filtros.duracionMax ?? ""}
                onChange={(e) => set({ duracionMax: e.target.value ? Number(e.target.value) : undefined })}
              >
                <option value="">Sin tope</option>
                {DURACIONES.map((h) => (
                  <option key={h} value={h}>Hasta {h} h</option>
                ))}
              </select>
            </div>

            <div className="v-campo">
              <label htmlFor="v-desn">Desnivel</label>
              <select
                id="v-desn"
                value={filtros.desnivel ?? ""}
                onChange={(e) => set({ desnivel: (e.target.value || undefined) as Desnivel | undefined })}
              >
                <option value="">Cualquiera</option>
                {DESNIVELES.map((d) => (
                  <option key={d.valor} value={d.valor}>{d.texto}</option>
                ))}
              </select>
            </div>
          </div>

          <Grupo label="Zona" opciones={datos.zonas.map((z) => ({ valor: z.id, texto: z.nombre }))}
            seleccion={filtros.zona} onToggle={(v) => toggle("zona", v)} />
          <Grupo label="Tipo" opciones={tipos} seleccion={filtros.tipo} onToggle={(v) => toggle("tipo", v)} />
          {dificultades.length > 0 && (
            <Grupo label="Dificultad" opciones={dificultades} seleccion={filtros.dificultad} onToggle={(v) => toggle("dificultad", v)} />
          )}
          {epocas.length > 0 && (
            <Grupo label="Época" opciones={epocas} seleccion={filtros.epoca} onToggle={(v) => toggle("epoca", v)} />
          )}
          {aguas.length > 0 && (
            <Grupo label="Agua" opciones={aguas} seleccion={filtros.agua} onToggle={(v) => toggle("agua", v)} />
          )}

          <div className="v-toggles">
            <Chip on={!!filtros.ninos} onClick={() => set({ ninos: filtros.ninos ? undefined : true })}>Con niños</Chip>
            <Chip on={!!filtros.perros} onClick={() => set({ perros: filtros.perros ? undefined : true })}>Con perro</Chip>
            <Chip on={!!filtros.bano} onClick={() => set({ bano: filtros.bano ? undefined : true })}>Con baño</Chip>
            <Chip on={!!filtros.parkingGratuito} onClick={() => set({ parkingGratuito: filtros.parkingGratuito ? undefined : true })}>Parking gratis</Chip>
            <Chip on={!!filtros.sinReserva} onClick={() => set({ sinReserva: filtros.sinReserva ? undefined : true })}>Sin reserva</Chip>
            <Chip on={verRestaurantes} onClick={() => setVerRestaurantes((v) => !v)}>Restaurantes</Chip>
            <button className="v-crear" onClick={() => setModo("plan")}>Crear mi viaje →</button>
            <button
              className="v-limpiar"
              onClick={() => setFiltros({})}
              disabled={!hayFiltros}
            >
              Limpiar
            </button>
          </div>
        </div>
      </div>

      <div className="v-main">
        <div>
          <p className="v-conteo">
            {destinos.length} {destinos.length === 1 ? "sitio" : "sitios"}
            {hayFiltros ? " con estos filtros" : ""}
          </p>
          {destinos.length === 0 ? (
            <p className="v-vacio">Nada encaja con estos filtros. Prueba a aflojar alguno.</p>
          ) : (
            <div className="v-grid">
              {destinos.map((d) => (
                <Card key={d.slug} destino={d} zona={nombreZona.get(d.zona) ?? d.zona} />
              ))}
            </div>
          )}
        </div>

        <aside className="v-aside">
          <Mapa destinos={destinos} />

          {verRestaurantes && (
            <div className="v-restos">
              <h2>Dónde comer{zonaUnica ? ` · ${nombreZona.get(zonaUnica)}` : ""}</h2>
              {restaurantes.map((r) => (
                <RestoCard key={r.nombre} resto={r} zona={nombreZona.get(r.zona) ?? r.zona} />
              ))}
            </div>
          )}
        </aside>
      </div>
    </>
  );
}

// Deja de `todas` las opciones en su orden solo las que aparecen en los datos.
function presentes(todas: Opcion[], valores: string[]): Opcion[] {
  const hay = new Set(valores);
  return todas.filter((o) => hay.has(o.valor));
}

// Grupo de chips multi-selección para una dimensión categórica.
function Grupo({ label, opciones, seleccion, onToggle }: {
  label: string;
  opciones: Opcion[];
  seleccion?: string[];
  onToggle: (valor: string) => void;
}) {
  const sel = seleccion ?? [];
  return (
    <div className="v-grupo">
      <span className="v-grupo-label">{label}</span>
      <div className="v-grupo-chips">
        {opciones.map((o) => (
          <Chip key={o.valor} on={sel.includes(o.valor)} onClick={() => onToggle(o.valor)}>{o.texto}</Chip>
        ))}
      </div>
    </div>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <label className="v-toggle" data-on={on}>
      <input type="checkbox" checked={on} onChange={onClick} />
      {children}
    </label>
  );
}

function Card({ destino: d, zona }: { destino: Destino; zona: string }) {
  return (
    <Link href={`/viajes/${d.slug}`} className="v-card">
      <div className="v-card-img">
        <Image src={d.imagen} alt={d.nombre} fill sizes="(max-width: 600px) 100vw, 300px" />
      </div>
      <div className="v-card-body">
        <div className="v-card-top">
          <span className="v-tipo">{d.tipo}</span>
          <span className="v-zona">{zona}</span>
        </div>
        <div className="v-nombre">{d.nombre}</div>
        <p className="v-que">{d.queEs}</p>
        <div className="v-meta">
          {d.distanciaKm && <span className="v-pill">{rango(d.distanciaKm, "km")}</span>}
          {d.desnivelM && <span className="v-pill">↑ {rango(d.desnivelM, "m")}</span>}
          {d.duracion && <span className="v-pill">{d.duracion}</span>}
          {d.ninos && <span className="v-pill v-pill--ok">niños</span>}
          {d.perros && <span className="v-pill v-pill--ok">perros</span>}
          {d.bano && <span className="v-pill v-pill--ok">baño</span>}
        </div>
      </div>
    </Link>
  );
}

function RestoCard({ resto: r, zona }: { resto: Restaurante; zona: string }) {
  return (
    <div className="v-resto">
      <div className="v-resto-nombre">{r.nombre}</div>
      <div className="v-resto-sub">{r.poblacion ?? zona}{r.telefono ? ` · ${r.telefono}` : ""}</div>
      {r.tipoComida && <div className="v-resto-comida">{r.tipoComida}</div>}
    </div>
  );
}
