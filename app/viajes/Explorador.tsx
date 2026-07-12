"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import type { DatosViajes, Destino } from "@/lib/viajes/tipos";
import { filtrarDestinos, nivelesDificultad, type Desnivel, type Filtros } from "@/lib/viajes/filtrar";
import { AGUA_TEXTO, DESNIVEL_TEXTO, EPOCA_TEXTO, filtrosActivos, resumenFiltros, type FiltroActivo } from "@/lib/viajes/resumen";
import { rango } from "@/lib/viajes/formato";
import CrearViaje from "./CrearViaje";

// Leaflet toca `window`: solo en cliente, sin SSR.
const Mapa = dynamic(() => import("./Mapa"), { ssr: false });

// Explorador de /viajes (S3, Río pop). Escritorio (F3): filtros en dos filas
// (dropdowns-chip + toggles), grid de tarjetas y mapa sticky. Móvil (F4): overlay
// a pantalla completa con dos modos —lista y mapa— y los filtros en hoja inferior.
// El componente elige árbol según el ancho (`useEsMovil`); ambos comparten TODA la
// lógica de filtros y recuentos, que re-ejecuta filtrar.ts (lógica pura ya testada).

// Umbrales (valor único, no categoría): un tope acumulativo no admite multi-selección.
const DISTANCIAS = [5, 10, 15, 20, 25];
const DURACIONES = [1, 2, 3, 4, 6];
const DESNIVELES = Object.keys(DESNIVEL_TEXTO) as Desnivel[];
const DIFICULTADES = ["fácil", "media", "difícil"];

// Salta a un árbol u otro sin parpadeo: en cliente ya sabe el ancho en el primer
// render (el Explorador solo se monta tras navegar, nunca en SSR).
function useEsMovil() {
  const [esMovil, setEsMovil] = useState(() => typeof window !== "undefined" && window.matchMedia("(max-width: 899px)").matches);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 899px)");
    const on = () => setEsMovil(mq.matches);
    mq.addEventListener("change", on);
    on();
    return () => mq.removeEventListener("change", on);
  }, []);
  return esMovil;
}

export default function Explorador({ datos, zonaInicial, filtrosInicial, onCambiarZonas, onVolverEspana }: {
  datos: DatosViajes;
  zonaInicial?: string[];        // zonas elegidas en la entrada por mapa (vacío = todas)
  filtrosInicial?: Filtros;      // filtros completos (p. ej. al volver de un plan compartido)
  onCambiarZonas?: () => void;   // crumb de la comunidad → volver a elegir zonas
  onVolverEspana?: () => void;   // crumb "‹ España" → volver a la portada
}) {
  const [filtros, setFiltros] = useState<Filtros>(() => filtrosInicial ?? (zonaInicial?.length ? { zona: zonaInicial } : {}));
  const [verRestaurantes, setVerRestaurantes] = useState(false);
  const [modo, setModo] = useState<"explorar" | "plan">("explorar");
  const [abierto, setAbierto] = useState<string | null>(null); // dropdown desplegado (escritorio)
  const [activo, setActivo] = useState<string | null>(null);   // slug resaltado pin↔tarjeta
  const [modoMovil, setModoMovil] = useState<"lista" | "mapa">("lista");
  const [hojaAbierta, setHojaAbierta] = useState(false);
  const esMovil = useEsMovil();

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

  // Un solo dropdown abierto a la vez (escritorio).
  const desp = (id: string) => ({
    abierto: abierto === id,
    onToggle: () => setAbierto(abierto === id ? null : id),
    onCerrar: () => setAbierto(null),
  });

  // Click en un pin (escritorio): resalta y lleva a su tarjeta.
  const irATarjeta = (slug: string) => {
    setActivo(slug);
    document.getElementById(`fr-card-${slug}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  if (modo === "plan") {
    return <CrearViaje datos={datos} filtros={filtros} onVolver={() => setModo("explorar")} />;
  }

  const nBano = (filtros.bano ? 1 : 0) + (filtros.agua?.length ?? 0);

  // ---------------------------------------------------------------- MÓVIL (F4)
  if (esMovil) {
    // Con 0 resultados no se puede ir al mapa: se muestra el estado 0 en la lista.
    const modoEfectivo = destinos.length === 0 ? "lista" : modoMovil;
    const zonasSel = filtros.zona?.length ? filtros.zona.map(zona).join(" + ") : "";

    return (
      <div className="fr-m3">
        <header className="fr-m3-head">
          <button className="fr-m3-atras" onClick={onCambiarZonas ?? onVolverEspana} aria-label="Volver">‹</button>
          <span className="fr-m3-titulo">
            <b>{modoEfectivo === "mapa" ? `${destinos.length} ${destinos.length === 1 ? "sitio" : "sitios"}` : datos.comunidad}</b>
            {modoEfectivo !== "mapa" && zonasSel && <span>{zonasSel}</span>}
          </span>
          <button className="fr-m3-filtros" onClick={() => setHojaAbierta(true)}>
            Filtros{activos.length > 0 && <span className="fr-m3-badge">{activos.length}</span>}
          </button>
        </header>

        <div className="fr-m3-body">
          <div className="fr-m3-lista" hidden={modoEfectivo !== "lista"}>
            {destinos.length === 0 ? (
              <EstadoVacio resumen={resumen} hayTipo={!!filtros.tipo?.length} activos={activos} todos={datos.destinos} onFiltros={setFiltros} />
            ) : (
              <>
                {activos.length > 0 && (
                  <div className="fr-m3-chips">
                    {activos.map((a) => (
                      <button key={a.etiqueta} className="fr-m3-chip-activo" onClick={() => setFiltros(a.sin)}>{a.etiqueta} ×</button>
                    ))}
                    <button className="fr-m3-chip-limpiar" onClick={() => setFiltros({})}>Limpiar</button>
                  </div>
                )}
                <div className="fr-m3-cont">
                  <span className="fr-m3-n">{destinos.length} {destinos.length === 1 ? "sitio" : "sitios"}</span>
                  {destinos.map((d, i) => (
                    <TarjetaCompacta key={d.slug} destino={d} zona={zona(d.zona)} num={i + 1} />
                  ))}
                  <button className="fr-m3-cta" onClick={() => setModo("plan")}>Crear mi viaje con estos {destinos.length} →</button>
                </div>
              </>
            )}
          </div>

          {/* Mapa: siempre montado (no reinicializar Leaflet al cambiar de modo) */}
          <div className="fr-m3-mapa-capa">
            <Mapa destinos={destinos} restaurantes={restaurantes} activo={activo} onActivo={setActivo} onPin={setActivo} />
            {destinos.length > 0 && (
              <div className="fr-m3-carrusel">
                <div className="fr-m3-carrusel-top">
                  <button className="fr-m3-pildora" onClick={() => setModoMovil("lista")}>≡ Lista</button>
                </div>
                <CarruselMovil destinos={destinos} activo={activo} onActivo={setActivo} />
              </div>
            )}
          </div>
        </div>

        {modoEfectivo === "lista" && destinos.length > 0 && (
          <button className="fr-m3-pildora fr-m3-pildora--fija" onClick={() => setModoMovil("mapa")}>
            <span className="fr-m3-pildora-punto" />Mapa · {destinos.length}
          </button>
        )}

        {hojaAbierta && (
          <div className="fr-m3-scrim" onClick={() => setHojaAbierta(false)}>
            <div className="fr-m3-hoja" onClick={(e) => e.stopPropagation()}>
              <div className="fr-m3-asa"><span /></div>
              <div className="fr-m3-hoja-scroll">
                <div className="fr-m3-hoja-head">
                  <b>Filtros</b>
                  {activos.length > 0 && <button className="fr-m3-hoja-limpiar" onClick={() => setFiltros({})}>Limpiar todo ({activos.length})</button>}
                </div>

                <Grupo label="Zona">
                  <div className="fr-m3-grupo-chips">
                    {datos.zonas.map((z) => (
                      <Opcion key={z.id} texto={z.nombre} on={!!filtros.zona?.includes(z.id)} n={cuenta({ zona: [z.id] })} onClick={() => toggle("zona", z.id)} />
                    ))}
                  </div>
                </Grupo>

                <Grupo label="Tipo de destino">
                  <div className="fr-m3-grupo-chips">
                    {tipos.map((t) => (
                      <Opcion key={t} texto={t} on={!!filtros.tipo?.includes(t)} n={cuenta({ tipo: [t] })} onClick={() => toggle("tipo", t)} />
                    ))}
                  </div>
                </Grupo>

                {dificultades.length > 0 && (
                  <Grupo label="Dificultad">
                    <div className="fr-m3-grupo-chips">
                      {dificultades.map((d) => (
                        <Opcion key={d} texto={d} on={!!filtros.dificultad?.includes(d)} n={cuenta({ dificultad: [d] })} onClick={() => toggle("dificultad", d)} />
                      ))}
                    </div>
                  </Grupo>
                )}

                <Grupo label="Agua y baño">
                  <div className="fr-m3-grupo-chips">
                    <Opcion texto="te puedes bañar" on={!!filtros.bano} n={cuenta({ bano: true })} onClick={() => set({ bano: filtros.bano ? undefined : true })} />
                    {aguas.map((a) => (
                      <Opcion key={a} texto={AGUA_TEXTO[a]} on={!!filtros.agua?.includes(a)} n={cuenta({ agua: [a] })} onClick={() => toggle("agua", a)} />
                    ))}
                  </div>
                </Grupo>

                {epocas.length > 0 && (
                  <Grupo label="Época">
                    <div className="fr-m3-grupo-chips">
                      {epocas.map((e) => (
                        <Opcion key={e} texto={EPOCA_TEXTO[e]} on={!!filtros.epoca?.includes(e)} n={cuenta({ epoca: [e] })} onClick={() => toggle("epoca", e)} />
                      ))}
                    </div>
                  </Grupo>
                )}

                <Grupo label="A pie, como mucho">
                  <Segmentado opciones={DISTANCIAS.map((km) => ({ v: km, etq: `${km} km` }))} valor={filtros.distanciaMax} onElegir={(v) => set({ distanciaMax: v })} />
                </Grupo>

                <Grupo label="Duración, como mucho">
                  <Segmentado opciones={DURACIONES.map((h) => ({ v: h, etq: `${h} h` }))} valor={filtros.duracionMax} onElegir={(v) => set({ duracionMax: v })} />
                </Grupo>

                <Grupo label="Desnivel, como mucho">
                  <Segmentado opciones={DESNIVELES.map((d) => ({ v: d, etq: DESNIVEL_TEXTO[d] }))} valor={filtros.desnivel} onElegir={(v) => set({ desnivel: v })} />
                </Grupo>

                <div className="fr-m3-grupo">
                  <span className="fr-m3-grupo-lab">Extras</span>
                  <ExtraSwitch label="Apto niños" on={!!filtros.ninos} onClick={() => set({ ninos: filtros.ninos ? undefined : true })} />
                  <ExtraSwitch label="Apto perros" on={!!filtros.perros} onClick={() => set({ perros: filtros.perros ? undefined : true })} />
                  <ExtraSwitch label="Parking gratis" on={!!filtros.parkingGratuito} onClick={() => set({ parkingGratuito: filtros.parkingGratuito ? undefined : true })} />
                  <ExtraSwitch label="Sin reserva" on={!!filtros.sinReserva} onClick={() => set({ sinReserva: filtros.sinReserva ? undefined : true })} />
                  <div className="fr-m3-restos-fila">
                    <span><span className="fr-m3-restos-r">R</span>Restaurantes en el mapa</span>
                    <button className="fr-m3-sw" aria-pressed={verRestaurantes} aria-label="Restaurantes en el mapa" onClick={() => setVerRestaurantes((v) => !v)} />
                  </div>
                </div>
              </div>
              <div className="fr-m3-hoja-pie">
                <button className="fr-m3-hoja-cerrar" onClick={() => setHojaAbierta(false)}>Cerrar</button>
                <button className="fr-m3-hoja-ver" onClick={() => setHojaAbierta(false)}>Ver {destinos.length} {destinos.length === 1 ? "sitio" : "sitios"}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ----------------------------------------------------------- ESCRITORIO (F3)
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
            <EstadoVacio resumen={resumen} hayTipo={!!filtros.tipo?.length} activos={activos} todos={datos.destinos} onFiltros={setFiltros} />
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

// Estado 0 (compartido escritorio/móvil): explica el porqué en lenguaje natural y
// ofrece un chip por filtro con cuántos resultados devuelve al quitarlo (en vivo).
function EstadoVacio({ resumen, hayTipo, activos, todos, onFiltros }: {
  resumen: string;
  hayTipo: boolean;
  activos: FiltroActivo[];
  todos: Destino[];
  onFiltros: (f: Filtros) => void;
}) {
  return (
    <div className="fr-s3-vacio">
      <span className="fr-s3-cero">0</span>
      <h2 className="fr-s3-vacio-titulo">Ni Cris conoce un sitio con todo eso</h2>
      <p className="fr-s3-vacio-p">No hay {hayTipo ? "" : "sitios "}{resumen}. Suelta uno de estos y seguro que aparece algo:</p>
      <div className="fr-s3-rescates">
        {activos.map((a) => (
          <button key={a.etiqueta} className="fr-s3-rescate" onClick={() => onFiltros(a.sin)}>
            {a.etiqueta} × <b>→ +{filtrarDestinos(todos, a.sin).length}</b>
          </button>
        ))}
      </div>
      <button className="fr-s3-vacio-btn" onClick={() => onFiltros({})}>
        Limpiar {activos.length === 1 ? "el filtro" : `los ${activos.length} filtros`}
      </button>
      <span className="fr-s3-vacio-nota">El mapa se queda quieto — no borra tu encuadre.</span>
    </div>
  );
}

// Dropdown-chip de la fila 1 (escritorio): chip (Lima con valor cuando filtra) +
// panel flotante con opciones, "Limpiar <dimensión>" y "Listo". Cierra al clicar fuera.
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

// Opción multi-selección (panel escritorio y hoja móvil). Sin resultados (y sin
// marcar) = deshabilitada con "· 0".
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

// Toggle de la fila 2 escritorio (track 38×22, knob Tinta; on = track Lima, knob a la derecha).
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

// Tarjeta compacta horizontal (lista móvil): foto 112px con pin + meta/nombre/chips.
// A diferencia de la de escritorio, "baño sí" sí va en chip (no hay sticker aquí).
function TarjetaCompacta({ destino: d, zona, num }: { destino: Destino; zona: string; num: number }) {
  const chips: { texto: string; tono?: "si" | "no" }[] = [];
  if (d.distanciaKm) chips.push({ texto: rango(d.distanciaKm, "km") });
  if (d.bano !== undefined) chips.push({ texto: `baño ${d.bano ? "sí" : "no"}`, tono: d.bano ? "si" : "no" });
  if (d.ninos !== undefined) chips.push({ texto: `niños ${d.ninos ? "sí" : "no"}`, tono: d.ninos ? "si" : "no" });
  if (d.perros !== undefined) chips.push({ texto: `perros ${d.perros ? "sí" : "no"}`, tono: d.perros ? "si" : "no" });
  if (d.desnivelM) chips.push({ texto: d.desnivelM[1] === 0 ? "llano" : `+${rango(d.desnivelM, "m")}` });

  return (
    <Link href={`/viajes/${d.slug}`} className="fr-m3-card">
      <div className={`fr-m3-card-foto${d.imagen ? "" : " fr-m3-card-foto--sin"}`}>
        {d.imagen && <Image src={d.imagen} alt={d.nombre} fill sizes="112px" />}
        <span className="fr-m3-card-pin">{num}</span>
      </div>
      <div className="fr-m3-card-body">
        <span className="fr-m3-card-meta">{zona} · {d.tipo}</span>
        <span className="fr-m3-card-nombre">{d.nombre}</span>
        {chips.length > 0 && (
          <span className="fr-m3-card-chips">
            {chips.slice(0, 3).map((c) => (
              <span key={c.texto} className={`fr-m3-dato${c.tono ? ` fr-m3-dato--${c.tono}` : ""}`}>{c.texto}</span>
            ))}
          </span>
        )}
      </div>
    </Link>
  );
}

// Carrusel de mini-tarjetas (modo mapa), sincronizado con los pins: al deslizar,
// la tarjeta centrada activa su pin; al tocar un pin, su tarjeta se centra. El
// umbral de "ya centrada" corta la pelea scroll↔activo (si el cambio vino del
// propio swipe, no se reposiciona).
function CarruselMovil({ destinos, activo, onActivo }: {
  destinos: Destino[];
  activo: string | null;
  onActivo: (slug: string | null) => void;
}) {
  const pista = useRef<HTMLDivElement>(null);
  const raf = useRef(0);
  const ultimo = useRef<string | null>(activo);

  const onScroll = () => {
    if (raf.current) return;
    raf.current = requestAnimationFrame(() => {
      raf.current = 0;
      const cont = pista.current;
      if (!cont) return;
      const centro = cont.scrollLeft + cont.clientWidth / 2;
      let slug: string | null = null;
      let min = Infinity;
      cont.querySelectorAll<HTMLElement>("[data-slug]").forEach((el) => {
        const d = Math.abs(el.offsetLeft + el.offsetWidth / 2 - centro);
        if (d < min) { min = d; slug = el.dataset.slug ?? null; }
      });
      if (slug && slug !== ultimo.current) { ultimo.current = slug; onActivo(slug); }
    });
  };

  useEffect(() => {
    ultimo.current = activo;
    const cont = pista.current;
    if (!cont || !activo) return;
    const el = cont.querySelector<HTMLElement>(`[data-slug="${activo}"]`);
    if (!el) return;
    if (Math.abs(cont.scrollLeft + cont.clientWidth / 2 - (el.offsetLeft + el.offsetWidth / 2)) < 40) return;
    // Scroll instantáneo, no smooth: con scroll-snap mandatory Chromium cancela el
    // scroll suave programático (el snap lo interrumpe). El salto directo es fiable.
    cont.scrollTo({ left: el.offsetLeft - (cont.clientWidth - el.offsetWidth) / 2 });
  }, [activo]);

  return (
    <div className="fr-m3-pista" ref={pista} onScroll={onScroll}>
      {destinos.map((d, i) => (
        <Link key={d.slug} href={`/viajes/${d.slug}`} data-slug={d.slug}
          className={`fr-m3-mini${activo === d.slug ? " fr-m3-mini--activa" : ""}`}>
          <div className={`fr-m3-mini-foto${d.imagen ? "" : " fr-m3-mini-foto--sin"}`}>
            {d.imagen && <Image src={d.imagen} alt={d.nombre} fill sizes="88px" />}
            <span className="fr-m3-mini-pin">{i + 1}</span>
          </div>
          <div className="fr-m3-mini-body">
            <span className="fr-m3-mini-meta">{d.tipo}{d.bano !== undefined ? ` · baño ${d.bano ? "sí" : "no"}` : ""}</span>
            <span className="fr-m3-mini-nombre">{d.nombre}</span>
            <span className="fr-m3-mini-stat">{miniStat(d)}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}

function miniStat(d: Destino): string {
  const p: string[] = [];
  if (d.distanciaKm) p.push(rango(d.distanciaKm, "km"));
  if (d.desnivelM) p.push(d.desnivelM[1] === 0 ? "llano" : `+${rango(d.desnivelM, "m")}`);
  return p.join(" · ");
}

// Grupo de la hoja de filtros: micro-etiqueta mono + contenido (chips o segmentado).
function Grupo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="fr-m3-grupo">
      <span className="fr-m3-grupo-lab">{label}</span>
      {children}
    </div>
  );
}

// Umbral como segmentado de valor único: cada opción alterna, "da igual" = sin filtro.
function Segmentado<T extends string | number>({ opciones, valor, onElegir }: {
  opciones: { v: T; etq: string }[];
  valor: T | undefined;
  onElegir: (v: T | undefined) => void;
}) {
  return (
    <div className="fr-m3-seg">
      {opciones.map((o) => (
        <button key={o.v} type="button" aria-pressed={valor === o.v} onClick={() => onElegir(valor === o.v ? undefined : o.v)}>{o.etq}</button>
      ))}
      <button type="button" className="fr-m3-seg-igual" aria-pressed={valor === undefined} onClick={() => onElegir(undefined)}>da igual</button>
    </div>
  );
}

// Fila de extra en la hoja: etiqueta + toggle grande (44×26).
function ExtraSwitch({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <div className="fr-m3-extra">
      <span>{label}</span>
      <button type="button" className="fr-m3-sw" aria-pressed={on} aria-label={label} onClick={onClick} />
    </div>
  );
}
