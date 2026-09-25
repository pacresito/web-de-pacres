"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { DatosViajes } from "@/lib/fuera-de-ruta/tipos";
import { filtrarDestinos, nivelesDificultad, type Desnivel, type Filtros } from "@/lib/fuera-de-ruta/filtrar";
import { AGUA_TEXTO, DESNIVEL_TEXTO, EPOCA_TEXTO, filtrosActivos, resumenFiltros } from "@/lib/fuera-de-ruta/resumen";
import { filtrosAQuery, queryAFiltros } from "@/lib/fuera-de-ruta/url-filtros";
import EstadoVacio from "./_explorador/EstadoVacio";
import { Desplegable, ExtraSwitch, Grupo, Interruptor, Opcion, Segmentado } from "./_explorador/Controles";
import { CarruselMovil, Tarjeta, TarjetaCompacta } from "./_explorador/Tarjetas";

// Leaflet toca `window`: solo en cliente, sin SSR.
const Mapa = dynamic(() => import("./Mapa"), { ssr: false });

// Explorador de una provincia. Móvil y escritorio son dos árboles con la misma lógica de
// filtros. Los filtros van a la URL con `history.replaceState`, no con el router, que
// re-renderizaría el Server Component y reiniciaría Leaflet; a cambio, el «atrás» sale
// del explorador en vez de deshacer filtros.

const DISTANCIAS = [5, 10, 15, 20, 25];
const DURACIONES = [1, 2, 3, 4, 6];
const DESNIVELES = Object.keys(DESNIVEL_TEXTO) as Desnivel[];
const DIFICULTADES = ["fácil", "media", "difícil"];
const EXTRAS = [
  { clave: "ninos", texto: "apto niños" },
  { clave: "perros", texto: "apto perros" },
  { clave: "parkingGratuito", texto: "parking gratis" },
  { clave: "sinReserva", texto: "sin reserva" },
] as const;

type Multi = "zona" | "tipo" | "dificultad" | "epoca" | "agua";
type Booleano = "ninos" | "perros" | "bano" | "parkingGratuito" | "sinReserva";

const MOVIL = "(max-width: 899px)";

// Sin SSR, el ancho ya se conoce en el primer render: no hay salto de árbol.
function useEsMovil() {
  const [esMovil, setEsMovil] = useState(() => window.matchMedia(MOVIL).matches);
  useEffect(() => {
    const mq = window.matchMedia(MOVIL);
    const on = () => setEsMovil(mq.matches);
    mq.addEventListener("change", on);
    on();
    return () => mq.removeEventListener("change", on);
  }, []);
  return esMovil;
}

export default function Explorador({ datos, provincia }: {
  datos: DatosViajes;
  provincia: string;             // slug
}) {
  const [filtros, setFiltros] = useState<Filtros>(() => queryAFiltros(new URLSearchParams(window.location.search)));
  const [verRestaurantes, setVerRestaurantes] = useState(false);
  const [abierto, setAbierto] = useState<string | null>(null); // desplegable de escritorio
  const [activo, setActivo] = useState<string | null>(null);   // slug resaltado en mapa y lista
  const [modoMovil, setModoMovil] = useState<"lista" | "mapa">("lista");
  const [hojaAbierta, setHojaAbierta] = useState(false);
  const esMovil = useEsMovil();

  useEffect(() => {
    const q = filtrosAQuery(filtros);
    window.history.replaceState(null, "", `${window.location.pathname}${q ? `?${q}` : ""}`);
  }, [filtros]);

  const nombreZona = useMemo(() => new Map(datos.zonas.map((z) => [z.id, z.nombre])), [datos.zonas]);
  const zona = (id: string) => nombreZona.get(id) ?? id;

  const hrefDestino = (slug: string) => `/fuera-de-ruta/${provincia}/${slug}`;
  const hrefZonas = `/fuera-de-ruta/${provincia}`;

  // Solo se ofrecen los valores presentes en los datos.
  const tipos = useMemo(() => [...new Set(datos.destinos.map((d) => d.tipo))].sort(), [datos.destinos]);
  const dificultades = useMemo(() => presentes(DIFICULTADES, datos.destinos.flatMap((d) => nivelesDificultad(d.dificultad))), [datos.destinos]);
  const epocas = useMemo(() => presentes(Object.keys(EPOCA_TEXTO), datos.destinos.flatMap((d) => d.epoca ?? [])), [datos.destinos]);
  const aguas = useMemo(() => presentes(Object.keys(AGUA_TEXTO), datos.destinos.flatMap((d) => d.agua ?? [])), [datos.destinos]);

  const destinos = useMemo(() => filtrarDestinos(datos.destinos, filtros), [datos.destinos, filtros]);
  const activos = filtrosActivos(filtros, zona);
  const resumen = resumenFiltros(filtros, zona);

  const cuenta = (parcial: Partial<Filtros>) => filtrarDestinos(datos.destinos, { ...filtros, ...parcial }).length;

  const restaurantes = useMemo(
    () => (verRestaurantes
      ? datos.restaurantes.filter((r) => r.gps && (!filtros.zona?.length || filtros.zona.includes(r.zona)))
      : []),
    [datos.restaurantes, verRestaurantes, filtros.zona],
  );

  const set = (parcial: Partial<Filtros>) => setFiltros((f) => ({ ...f, ...parcial }));
  const alternarBool = (clave: Booleano) => set({ [clave]: filtros[clave] ? undefined : true });
  // Vacía = `undefined`, para que la dimensión no cuente como filtro activo.
  const toggle = (clave: Multi, valor: string) =>
    setFiltros((f) => {
      const actual = f[clave] ?? [];
      const nueva = actual.includes(valor) ? actual.filter((v) => v !== valor) : [...actual, valor];
      return { ...f, [clave]: nueva.length ? nueva : undefined };
    });

  // Las opciones de una dimensión, iguales en el panel de escritorio y en la hoja móvil.
  const opciones = (clave: Multi, valores: string[], texto: (v: string) => string = (v) => v) =>
    valores.map((v) => (
      <Opcion key={v} texto={texto(v)} on={!!filtros[clave]?.includes(v)} n={cuenta({ [clave]: [v] })}
        onClick={() => toggle(clave, v)} />
    ));
  const opcionBano = (
    <Opcion texto="te puedes bañar" on={!!filtros.bano} n={cuenta({ bano: true })} onClick={() => alternarBool("bano")} />
  );
  const idsZona = datos.zonas.map((z) => z.id);

  const desp = (id: string) => ({
    abierto: abierto === id,
    onToggle: () => setAbierto(abierto === id ? null : id),
    onCerrar: () => setAbierto(null),
  });

  const irATarjeta = (slug: string) => {
    setActivo(slug);
    document.getElementById(`fr-card-${slug}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  // El planificador hereda los filtros por la URL, igual que un enlace compartido.
  const queryActual = filtrosAQuery(filtros);
  const hrefCrearViaje = `/fuera-de-ruta/${provincia}/crear-viaje${queryActual ? `?${queryActual}` : ""}`;

  const nBano = (filtros.bano ? 1 : 0) + (filtros.agua?.length ?? 0);

  if (esMovil) {
    // Con 0 resultados no hay mapa al que ir.
    const modoEfectivo = destinos.length === 0 ? "lista" : modoMovil;
    const zonasSel = filtros.zona?.length ? filtros.zona.map(zona).join(" + ") : "";

    return (
      <div className="fr-m3">
        <header className="fr-m3-head">
          <Link href={hrefZonas} className="fr-m3-atras" aria-label="Volver">‹</Link>
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
                    <TarjetaCompacta key={d.slug} destino={d} zona={zona(d.zona)} num={i + 1} href={hrefDestino(d.slug)} />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Siempre montado, para no reiniciar Leaflet al cambiar de modo. */}
          <div className="fr-m3-mapa-capa">
            <Mapa destinos={destinos} restaurantes={restaurantes} activo={activo} onActivo={setActivo} onPin={setActivo} />
            {destinos.length > 0 && (
              <div className="fr-m3-carrusel">
                <div className="fr-m3-carrusel-top">
                  <button className="fr-m3-pildora" onClick={() => setModoMovil("lista")}>≡ Lista</button>
                </div>
                <CarruselMovil destinos={destinos} activo={activo} onActivo={setActivo} hrefDestino={hrefDestino} />
              </div>
            )}
          </div>
        </div>

        {modoEfectivo === "lista" && destinos.length > 0 && (
          <div className="fr-m3-barra">
            <button className="fr-m3-barra-mapa" onClick={() => setModoMovil("mapa")}>
              <span className="fr-m3-pildora-punto" />Mapa · {destinos.length}
            </button>
            <Link href={hrefCrearViaje} className="fr-m3-barra-cta">Crear viaje con estos {destinos.length} →</Link>
          </div>
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
                  <div className="fr-m3-grupo-chips">{opciones("zona", idsZona, zona)}</div>
                </Grupo>

                <Grupo label="Tipo de destino">
                  <div className="fr-m3-grupo-chips">{opciones("tipo", tipos)}</div>
                </Grupo>

                {dificultades.length > 0 && (
                  <Grupo label="Dificultad">
                    <div className="fr-m3-grupo-chips">{opciones("dificultad", dificultades)}</div>
                  </Grupo>
                )}

                <Grupo label="Agua y baño">
                  <div className="fr-m3-grupo-chips">{opcionBano}{opciones("agua", aguas, (a) => AGUA_TEXTO[a])}</div>
                </Grupo>

                {epocas.length > 0 && (
                  <Grupo label="Época">
                    <div className="fr-m3-grupo-chips">{opciones("epoca", epocas, (e) => EPOCA_TEXTO[e])}</div>
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
                  {EXTRAS.map((e) => (
                    <ExtraSwitch key={e.clave} label={e.texto[0].toUpperCase() + e.texto.slice(1)}
                      on={!!filtros[e.clave]} onClick={() => alternarBool(e.clave)} />
                  ))}
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

  return (
    <>
      <div className="fr-s3-crumbs">
        <Link href="/fuera-de-ruta" className="fr-crumb">‹ España</Link>
        <Link href={hrefZonas} className="fr-crumb fr-crumb--on">{datos.comunidad}</Link>
      </div>

      <div className="fr-s3-filtros">
        <div className="fr-s3-filtros-inner">
          <div className="fr-s3-fila">
            <Desplegable etiqueta="Zona" titulo="zona — marca varias" {...desp("zona")}
              valor={filtros.zona?.length ? String(filtros.zona.length) : undefined}
              onLimpiar={() => set({ zona: undefined })}>
              {opciones("zona", idsZona, zona)}
            </Desplegable>

            <Desplegable etiqueta="Tipo" titulo="tipo de destino — marca varios" {...desp("tipo")}
              valor={filtros.tipo?.length ? String(filtros.tipo.length) : undefined}
              onLimpiar={() => set({ tipo: undefined })}>
              {opciones("tipo", tipos)}
            </Desplegable>

            {dificultades.length > 0 && (
              <Desplegable etiqueta="Dificultad" titulo="dificultad — marca varias" {...desp("dificultad")}
                valor={filtros.dificultad?.length ? String(filtros.dificultad.length) : undefined}
                onLimpiar={() => set({ dificultad: undefined })}>
                {opciones("dificultad", dificultades)}
              </Desplegable>
            )}

            <Desplegable etiqueta="Baño" titulo="agua y baño — marca varios" {...desp("bano")}
              valor={nBano ? String(nBano) : undefined}
              onLimpiar={() => set({ bano: undefined, agua: undefined })}>
              {opcionBano}
              {opciones("agua", aguas, (a) => AGUA_TEXTO[a])}
            </Desplegable>

            {epocas.length > 0 && (
              <Desplegable etiqueta="Época" titulo="época — marca varias" {...desp("epoca")}
                valor={filtros.epoca?.length ? String(filtros.epoca.length) : undefined}
                onLimpiar={() => set({ epoca: undefined })}>
                {opciones("epoca", epocas, (e) => EPOCA_TEXTO[e])}
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
            {EXTRAS.map((e) => (
              <Interruptor key={e.clave} on={!!filtros[e.clave]} onClick={() => alternarBool(e.clave)}>{e.texto}</Interruptor>
            ))}
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
                  <Tarjeta key={d.slug} destino={d} zona={zona(d.zona)} num={i + 1} href={hrefDestino(d.slug)}
                    activa={activo === d.slug} onActivo={setActivo} />
                ))}
              </div>
              <Link href={hrefCrearViaje} className="fr-s3-cta">
                Crear mi viaje con estos {destinos.length} →
              </Link>
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

function presentes(todas: string[], valores: string[]): string[] {
  const hay = new Set(valores);
  return todas.filter((v) => hay.has(v));
}
