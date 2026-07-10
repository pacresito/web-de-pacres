"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import type { DatosViajes, Destino, Restaurante } from "@/lib/viajes/tipos";
import { filtrarDestinos, type Desnivel, type Filtros } from "@/lib/viajes/filtrar";
import { rango } from "@/lib/viajes/formato";

// Leaflet toca `window`: solo en cliente, sin SSR.
const Mapa = dynamic(() => import("./Mapa"), { ssr: false });

// Explorador del índice /viajes: mantiene el estado de filtros en cliente y
// deriva la lista filtrada que alimenta a la vez el grid y (paso 4) el mapa.
// Estilo provisional en viajes.css; la lógica no depende de él.

const DISTANCIAS = [5, 10, 15, 20, 25];
const DESNIVELES: { valor: Desnivel; texto: string }[] = [
  { valor: "<150", texto: "Hasta 150 m" },
  { valor: "<300", texto: "Hasta 300 m" },
  { valor: "<500", texto: "Hasta 500 m" },
  { valor: "+500", texto: "Más de 500 m" },
];

export default function Explorador({ datos }: { datos: DatosViajes }) {
  const [filtros, setFiltros] = useState<Filtros>({});
  const [verRestaurantes, setVerRestaurantes] = useState(false);

  const nombreZona = useMemo(
    () => new Map(datos.zonas.map((z) => [z.id, z.nombre])),
    [datos.zonas],
  );
  const tipos = useMemo(
    () => [...new Set(datos.destinos.map((d) => d.tipo))].sort(),
    [datos.destinos],
  );

  const destinos = useMemo(
    () => filtrarDestinos(datos.destinos, filtros),
    [datos.destinos, filtros],
  );

  const restaurantes = filtros.zona
    ? datos.restaurantes.filter((r) => r.zona === filtros.zona)
    : datos.restaurantes;

  const set = (parcial: Partial<Filtros>) => setFiltros((f) => ({ ...f, ...parcial }));
  // Desactivar un filtro deja su clave con `undefined` (el spread no la borra):
  // hay que mirar valores, no claves.
  const hayFiltros = Object.values(filtros).some((v) => v !== undefined);

  return (
    <>
      <div className="v-filtros">
        <div className="v-filtros-inner">
          <div className="v-campo">
            <label htmlFor="v-zona">Zona</label>
            <select
              id="v-zona"
              value={filtros.zona ?? ""}
              onChange={(e) => set({ zona: e.target.value || undefined })}
            >
              <option value="">Todas</option>
              {datos.zonas.map((z) => (
                <option key={z.id} value={z.id}>{z.nombre}</option>
              ))}
            </select>
          </div>

          <div className="v-campo">
            <label htmlFor="v-tipo">Tipo</label>
            <select
              id="v-tipo"
              value={filtros.tipo ?? ""}
              onChange={(e) => set({ tipo: e.target.value || undefined })}
            >
              <option value="">Todos</option>
              {tipos.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

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

          <div className="v-toggles">
            <Chip on={!!filtros.ninos} onClick={() => set({ ninos: filtros.ninos ? undefined : true })}>Con niños</Chip>
            <Chip on={!!filtros.perros} onClick={() => set({ perros: filtros.perros ? undefined : true })}>Con perro</Chip>
            <Chip on={!!filtros.bano} onClick={() => set({ bano: filtros.bano ? undefined : true })}>Con baño</Chip>
            <Chip on={verRestaurantes} onClick={() => setVerRestaurantes((v) => !v)}>Restaurantes</Chip>
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
              <h2>Dónde comer{filtros.zona ? ` · ${nombreZona.get(filtros.zona)}` : ""}</h2>
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
