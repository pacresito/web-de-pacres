"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import type { DatosViajes, Destino } from "@/lib/viajes/tipos";
import { filtrarDestinos, nivelesDificultad, type Desnivel, type Filtros } from "@/lib/viajes/filtrar";
import { AGUA_TEXTO, DESNIVEL_TEXTO, EPOCA_TEXTO, filtrosActivos, resumenFiltros } from "@/lib/viajes/resumen";
import { rango } from "@/lib/viajes/formato";
import CrearViaje from "./CrearViaje";

// Leaflet toca `window`: solo en cliente, sin SSR.
const Mapa = dynamic(() => import("./Mapa"), { ssr: false });

// Explorador de /viajes (S3, Río pop): filtros en dos filas (dropdowns-chip multi
// + toggles), grid de tarjetas numeradas y mapa sticky con los mismos números —
// pin y tarjeta se resaltan mutuamente vía `activo`. Todos los recuentos en vivo
// (por opción del dropdown, chips de rescate del estado 0) se calculan
// re-ejecutando filtrar.ts, la lógica pura ya testada.

// Umbrales (valor único, no categoría): un tope acumulativo no admite multi-selección.
const DISTANCIAS = [5, 10, 15, 20, 25];
const DURACIONES = [1, 2, 3, 4, 6];
const DESNIVELES = Object.keys(DESNIVEL_TEXTO) as Desnivel[];
const DIFICULTADES = ["fácil", "media", "difícil"];

export default function Explorador({ datos, zonaInicial, onCambiarZonas, onVolverEspana }: {
  datos: DatosViajes;
  zonaInicial?: string[];        // zonas elegidas en la entrada por mapa (vacío = todas)
  onCambiarZonas?: () => void;   // crumb de la comunidad → volver a elegir zonas
  onVolverEspana?: () => void;   // crumb "‹ España" → volver a la portada
}) {
  const [filtros, setFiltros] = useState<Filtros>(() => (zonaInicial?.length ? { zona: zonaInicial } : {}));
  const [verRestaurantes, setVerRestaurantes] = useState(false);
  const [modo, setModo] = useState<"explorar" | "plan">("explorar");
  const [abierto, setAbierto] = useState<string | null>(null); // dropdown desplegado
  const [activo, setActivo] = useState<string | null>(null);   // slug resaltado pin↔tarjeta

  const nombreZona = useMemo(() => new Map(datos.zonas.map((z) => [z.id, z.nombre])), [datos.zonas]);
  const zona = (id: string) => nombreZona.get(id) ?? id;

  // Opciones categóricas presentes en los datos: solo se ofrece lo que filtra.
  const tipos = useMemo(() => [...new Set(datos.destinos.map((d) => d.tipo))].sort(), [datos.destinos]);
  const dificultades = useMemo(() => presentes(DIFICULTADES, datos.destinos.flatMap((d) => nivelesDificultad(d.dificultad))), [datos.destinos]);
  const epocas = useMemo(() => presentes(Object.keys(EPOCA_TEXTO), datos.destinos.flatMap((d) => d.epoca ?? [])), [datos.destinos]);
  const aguas = useMemo(() => presentes(Object.keys(AGUA_TEXTO), datos.destinos.flatMap((d) => d.agua ?? [])), [datos.destinos]);

  const destinos = useMemo(() => filtrarDestinos(datos.destinos, filtros), [datos.destinos, filtros]);
  const activos = filtrosActivos(filtros, zona);
  const resumen = resumenFiltros(filtros, zona);

  // Recuento en vivo con una variación de los filtros.
  const cuenta = (parcial: Partial<Filtros>) => filtrarDestinos(datos.destinos, { ...filtros, ...parcial }).length;

  // Pins R del mapa: restaurantes de las zonas filtradas que tienen GPS.
  const restaurantes = useMemo(
    () => (verRestaurantes
      ? datos.restaurantes.filter((r) => r.gps && (!filtros.zona?.length || filtros.zona.includes(r.zona)))
      : []),
    [datos.restaurantes, verRestaurantes, filtros.zona],
  );

  const set = (parcial: Partial<Filtros>) => setFiltros((f) => ({ ...f, ...parcial }));
  // Alterna un valor en una dimensión multi-selección. Vacía = `undefined`, para
  // que la clave no cuente como filtro activo (se miran valores, no claves).
  const toggle = (clave: "zona" | "tipo" | "dificultad" | "epoca" | "agua", valor: string) =>
    setFiltros((f) => {
      const actual = f[clave] ?? [];
      const nueva = actual.includes(valor) ? actual.filter((v) => v !== valor) : [...actual, valor];
      return { ...f, [clave]: nueva.length ? nueva : undefined };
    });

  // Un solo dropdown abierto a la vez.
  const desp = (id: string) => ({
    abierto: abierto === id,
    onToggle: () => setAbierto(abierto === id ? null : id),
    onCerrar: () => setAbierto(null),
  });

  // Click en un pin: resalta y lleva a su tarjeta.
  const irATarjeta = (slug: string) => {
    setActivo(slug);
    document.getElementById(`fr-card-${slug}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  if (modo === "plan") {
    return <CrearViaje datos={datos} filtros={filtros} onVolver={() => setModo("explorar")} />;
  }

  const nBano = (filtros.bano ? 1 : 0) + (filtros.agua?.length ?? 0);

  return (
    <>
      <div className="fr-s3-crumbs">
        {onVolverEspana && <button className="fr-crumb" onClick={onVolverEspana}>‹ España</button>}
        {onCambiarZonas && <button className="fr-crumb fr-crumb--on" onClick={onCambiarZonas}>{datos.comunidad}</button>}
      </div>

      <div className="fr-s3-filtros">
        <div className="fr-s3-filtros-inner">
          <div className="fr-s3-fila">
            <Desplegable etiqueta="Zona" titulo="zona — marca varias" {...desp("zona")}
              valor={filtros.zona?.length ? String(filtros.zona.length) : undefined}
              onLimpiar={() => set({ zona: undefined })}>
              {datos.zonas.map((z) => (
                <Opcion key={z.id} texto={z.nombre} on={!!filtros.zona?.includes(z.id)}
                  n={cuenta({ zona: [z.id] })} onClick={() => toggle("zona", z.id)} />
              ))}
            </Desplegable>

            <Desplegable etiqueta="Tipo" titulo="tipo de destino — marca varios" {...desp("tipo")}
              valor={filtros.tipo?.length ? String(filtros.tipo.length) : undefined}
              onLimpiar={() => set({ tipo: undefined })}>
              {tipos.map((t) => (
                <Opcion key={t} texto={t} on={!!filtros.tipo?.includes(t)}
                  n={cuenta({ tipo: [t] })} onClick={() => toggle("tipo", t)} />
              ))}
            </Desplegable>

            {dificultades.length > 0 && (
              <Desplegable etiqueta="Dificultad" titulo="dificultad — marca varias" {...desp("dificultad")}
                valor={filtros.dificultad?.length ? String(filtros.dificultad.length) : undefined}
                onLimpiar={() => set({ dificultad: undefined })}>
                {dificultades.map((d) => (
                  <Opcion key={d} texto={d} on={!!filtros.dificultad?.includes(d)}
                    n={cuenta({ dificultad: [d] })} onClick={() => toggle("dificultad", d)} />
                ))}
              </Desplegable>
            )}

            <Desplegable etiqueta="Baño" titulo="agua y baño — marca varios" {...desp("bano")}
              valor={nBano ? String(nBano) : undefined}
              onLimpiar={() => set({ bano: undefined, agua: undefined })}>
              <Opcion texto="te puedes bañar" on={!!filtros.bano} n={cuenta({ bano: true })}
                onClick={() => set({ bano: filtros.bano ? undefined : true })} />
              {aguas.map((a) => (
                <Opcion key={a} texto={AGUA_TEXTO[a]} on={!!filtros.agua?.includes(a)}
                  n={cuenta({ agua: [a] })} onClick={() => toggle("agua", a)} />
              ))}
            </Desplegable>

            {epocas.length > 0 && (
              <Desplegable etiqueta="Época" titulo="época — marca varias" {...desp("epoca")}
                valor={filtros.epoca?.length ? String(filtros.epoca.length) : undefined}
                onLimpiar={() => set({ epoca: undefined })}>
                {epocas.map((e) => (
                  <Opcion key={e} texto={EPOCA_TEXTO[e]} on={!!filtros.epoca?.includes(e)}
                    n={cuenta({ epoca: [e] })} onClick={() => toggle("epoca", e)} />
                ))}
              </Desplegable>
            )}

            <span className="fr-s3-divisor" />

            <Desplegable etiqueta="A pie" titulo="a pie, como mucho" {...desp("apie")}
              valor={filtros.distanciaMax !== undefined ? `‹ ${filtros.distanciaMax} km` : undefined}
              onLimpiar={() => set({ distanciaMax: undefined })}>
              {DISTANCIAS.map((km) => (
                <Opcion key={km} texto={`‹ ${km} km`} on={filtros.distanciaMax === km} n={cuenta({ distanciaMax: km })}
                  onClick={() => set({ distanciaMax: filtros.distanciaMax === km ? undefined : km })} />
              ))}
              <Opcion texto="da igual" on={false} n={cuenta({ distanciaMax: undefined })}
                onClick={() => set({ distanciaMax: undefined })} />
            </Desplegable>

            <Desplegable etiqueta="Duración" titulo="duración, como mucho" {...desp("duracion")}
              valor={filtros.duracionMax !== undefined ? `‹ ${filtros.duracionMax} h` : undefined}
              onLimpiar={() => set({ duracionMax: undefined })}>
              {DURACIONES.map((h) => (
                <Opcion key={h} texto={`‹ ${h} h`} on={filtros.duracionMax === h} n={cuenta({ duracionMax: h })}
                  onClick={() => set({ duracionMax: filtros.duracionMax === h ? undefined : h })} />
              ))}
              <Opcion texto="da igual" on={false} n={cuenta({ duracionMax: undefined })}
                onClick={() => set({ duracionMax: undefined })} />
            </Desplegable>

            <Desplegable etiqueta="Desnivel" titulo="desnivel, como mucho" alinear="der" {...desp("desnivel")}
              valor={filtros.desnivel ? DESNIVEL_TEXTO[filtros.desnivel] : undefined}
              onLimpiar={() => set({ desnivel: undefined })}>
              {DESNIVELES.map((d) => (
                <Opcion key={d} texto={DESNIVEL_TEXTO[d]} on={filtros.desnivel === d} n={cuenta({ desnivel: d })}
                  onClick={() => set({ desnivel: filtros.desnivel === d ? undefined : d })} />
              ))}
              <Opcion texto="da igual" on={false} n={cuenta({ desnivel: undefined })}
                onClick={() => set({ desnivel: undefined })} />
            </Desplegable>
          </div>

          <div className="fr-s3-fila fr-s3-fila--extras">
            <Interruptor on={!!filtros.ninos} onClick={() => set({ ninos: filtros.ninos ? undefined : true })}>apto niños</Interruptor>
            <Interruptor on={!!filtros.perros} onClick={() => set({ perros: filtros.perros ? undefined : true })}>apto perros</Interruptor>
            <Interruptor on={!!filtros.parkingGratuito} onClick={() => set({ parkingGratuito: filtros.parkingGratuito ? undefined : true })}>parking gratis</Interruptor>
            <Interruptor on={!!filtros.sinReserva} onClick={() => set({ sinReserva: filtros.sinReserva ? undefined : true })}>sin reserva</Interruptor>
            <button className={`fr-s3-restos${verRestaurantes ? " fr-s3-restos--on" : ""}`}
              aria-pressed={verRestaurantes} onClick={() => setVerRestaurantes((v) => !v)}>
              <span className="fr-s3-restos-r">R</span>Restaurantes
            </button>
            {activos.length > 0 && (
              <button className="fr-s3-limpiar" onClick={() => setFiltros({})}>Limpiar ({activos.length})</button>
            )}
          </div>
        </div>
      </div>

      <div className="fr-s3-main">
        <div className="fr-s3-col">
          {destinos.length === 0 ? (
            <div className="fr-s3-vacio">
              <span className="fr-s3-cero">0</span>
              <h2 className="fr-s3-vacio-titulo">Ni Cris conoce un sitio con todo eso</h2>
              <p className="fr-s3-vacio-p">
                No hay {filtros.tipo?.length ? "" : "sitios "}{resumen}. Suelta uno de estos y seguro que aparece algo:
              </p>
              <div className="fr-s3-rescates">
                {activos.map((a) => (
                  <button key={a.etiqueta} className="fr-s3-rescate" onClick={() => setFiltros(a.sin)}>
                    {a.etiqueta} × <b>→ +{filtrarDestinos(datos.destinos, a.sin).length}</b>
                  </button>
                ))}
              </div>
              <button className="fr-s3-vacio-btn" onClick={() => setFiltros({})}>
                Limpiar {activos.length === 1 ? "el filtro" : `los ${activos.length} filtros`}
              </button>
              <span className="fr-s3-vacio-nota">El mapa se queda quieto — no borra tu encuadre.</span>
            </div>
          ) : (
            <>
              <div className="fr-s3-head">
                <span className="fr-s3-n">{destinos.length} {destinos.length === 1 ? "sitio" : "sitios"}</span>
                {resumen && <span className="fr-s3-resumen">{resumen}</span>}
              </div>
              <div className="fr-s3-grid">
                {destinos.map((d, i) => (
                  <Tarjeta key={d.slug} destino={d} zona={zona(d.zona)} num={i + 1}
                    activa={activo === d.slug} onActivo={setActivo} />
                ))}
              </div>
              <button className="fr-s3-cta" onClick={() => setModo("plan")}>
                Crear mi viaje con estos {destinos.length} →
              </button>
            </>
          )}
        </div>

        <aside className="fr-s3-aside">
          <Mapa destinos={destinos} restaurantes={restaurantes} activo={activo} onActivo={setActivo} onPin={irATarjeta} />
        </aside>
      </div>
    </>
  );
}

// Deja de `todas` las opciones en su orden solo las que aparecen en los datos.
function presentes(todas: string[], valores: string[]): string[] {
  const hay = new Set(valores);
  return todas.filter((v) => hay.has(v));
}

// Dropdown-chip de la fila 1: chip (Lima con valor cuando filtra) + panel flotante
// con opciones, "Limpiar <dimensión>" y "Listo". El velo cierra al clicar fuera.
function Desplegable({ etiqueta, valor, titulo, abierto, onToggle, onCerrar, onLimpiar, alinear, children }: {
  etiqueta: string;
  valor?: string;            // resumen en el chip ("2", "‹ 5 km"); presente = activo
  titulo: string;
  abierto: boolean;
  onToggle: () => void;
  onCerrar: () => void;
  onLimpiar: () => void;
  alinear?: "der";           // panel alineado a la derecha (chips junto al borde)
  children: React.ReactNode;
}) {
  return (
    <div className="fr-s3-desp">
      <button className={`fr-s3-chip${valor ? " fr-s3-chip--on" : ""}`} aria-expanded={abierto} onClick={onToggle}>
        {etiqueta}{valor ? ` · ${valor}` : ""} {abierto ? "▴" : "▾"}
      </button>
      {abierto && (
        <>
          <div className="fr-s3-velo" onClick={onCerrar} />
          <div className={`fr-s3-panel${alinear ? " fr-s3-panel--der" : ""}`}>
            <span className="fr-mono">{titulo}</span>
            <div className="fr-s3-panel-chips">{children}</div>
            <div className="fr-s3-panel-pie">
              <button className="fr-s3-panel-limpiar" onClick={onLimpiar}>Limpiar {etiqueta.toLowerCase()}</button>
              <button className="fr-s3-listo" onClick={onCerrar}>Listo</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Opción dentro del panel. Sin resultados (y sin marcar) = deshabilitada con "· 0".
function Opcion({ texto, on, n, onClick }: { texto: string; on: boolean; n: number; onClick: () => void }) {
  const off = !on && n === 0;
  return (
    <button
      className={`fr-s3-opcion${on ? " fr-s3-opcion--on" : ""}${off ? " fr-s3-opcion--off" : ""}`}
      disabled={off}
      onClick={onClick}
    >
      {texto}{on ? " ×" : off ? " · 0" : ""}
    </button>
  );
}

// Toggle de la fila 2 (track 38×22, knob Tinta; on = track Lima, knob a la derecha).
function Interruptor({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" className="fr-s3-toggle" data-on={on} aria-pressed={on} onClick={onClick}>
      <span className="fr-s3-track"><span className="fr-s3-knob" /></span>
      {children}
    </button>
  );
}

function Tarjeta({ destino: d, zona, num, activa, onActivo }: {
  destino: Destino;
  zona: string;
  num: number;
  activa: boolean;
  onActivo: (slug: string | null) => void;
}) {
  // 2-4 chips de datos; "baño sí" no va en chip porque ya lo dice el sticker.
  const chips: { texto: string; tono?: "si" | "no" }[] = [];
  if (d.distanciaKm) chips.push({ texto: rango(d.distanciaKm, "km") });
  if (d.desnivelM) chips.push({ texto: d.desnivelM[1] === 0 ? "llano" : `+${rango(d.desnivelM, "m")}` });
  if (d.ninos !== undefined) chips.push({ texto: `niños ${d.ninos ? "sí" : "no"}`, tono: d.ninos ? "si" : "no" });
  if (d.perros !== undefined) chips.push({ texto: `perros ${d.perros ? "sí" : "no"}`, tono: d.perros ? "si" : "no" });
  if (d.bano === false) chips.push({ texto: "baño no", tono: "no" });

  return (
    <Link
      href={`/viajes/${d.slug}`}
      id={`fr-card-${d.slug}`}
      className={`fr-s3-card${activa ? " fr-s3-card--activa" : ""}`}
      onMouseEnter={() => onActivo(d.slug)}
      onMouseLeave={() => onActivo(null)}
    >
      <div className="fr-s3-card-foto">
        {d.imagen ? (
          <div className="fr-s3-card-marco">
            <Image src={d.imagen} alt={d.nombre} fill sizes="(max-width: 900px) 100vw, 330px" />
          </div>
        ) : (
          <div className="fr-s3-card-fallback">
            <i className="fr-s3-foto-pronto">foto en camino</i>
            <span>{d.nombre}</span>
          </div>
        )}
        <span className={`fr-s3-pin-num${activa ? " fr-s3-pin-num--activo" : ""}`}>{num}</span>
        {d.bano && <span className="fr-s3-bano">te puedes bañar</span>}
      </div>
      <div className="fr-s3-card-body">
        <span className="fr-s3-card-meta">{zona} · {d.tipo}</span>
        <span className="fr-s3-card-nombre">{d.nombre}</span>
        {chips.length > 0 && (
          <span className="fr-s3-card-chips">
            {chips.slice(0, 4).map((c) => (
              <span key={c.texto} className={`fr-s3-dato${c.tono ? ` fr-s3-dato--${c.tono}` : ""}`}>{c.texto}</span>
            ))}
          </span>
        )}
      </div>
    </Link>
  );
}
