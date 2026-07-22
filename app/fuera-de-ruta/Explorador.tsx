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

// Explorador de /fuera-de-ruta/<provincia>/sitios (S3, Río pop). Escritorio (F3):
// filtros en dos filas (dropdowns-chip + toggles), grid de tarjetas y mapa sticky.
// Móvil (F4): overlay a pantalla completa con dos modos —lista y mapa— y los filtros
// en hoja inferior. El componente elige árbol según el ancho (`useEsMovil`); ambos
// comparten TODA la lógica de filtros y recuentos, que re-ejecuta filtrar.ts (lógica
// pura ya testada). La página lo monta sin SSR: elegir árbol por ancho y leer los
// filtros de la URL solo tienen respuesta en el navegador.
//
// Los filtros se reflejan en la URL con `history.replaceState`, NO con el router: un
// `router.replace` por clic re-renderizaría el Server Component y reinicializaría
// Leaflet (parpadeo y encuadre perdido). Así la URL queda compartible sin tocar el
// árbol de React. El precio, asumido: el «atrás» del navegador no deshace filtros de
// uno en uno, sale del explorador — que es lo que la gente espera de un panel así.

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

export default function Explorador({ datos, provincia }: {
  datos: DatosViajes;
  provincia: string;             // slug de URL ("navarra"), para los enlaces
}) {
  // Los filtros arrancan de la URL: así un enlace compartido abre el explorador tal
  // cual lo dejó quien lo mandó, y el paso de zonas entra con su `?zona=`.
  const [filtros, setFiltros] = useState<Filtros>(
    () => queryAFiltros(new URLSearchParams(typeof window === "undefined" ? "" : window.location.search)),
  );
  const [verRestaurantes, setVerRestaurantes] = useState(false);
  const [abierto, setAbierto] = useState<string | null>(null); // dropdown desplegado (escritorio)
  const [activo, setActivo] = useState<string | null>(null);   // slug resaltado pin↔tarjeta
  const [modoMovil, setModoMovil] = useState<"lista" | "mapa">("lista");
  const [hojaAbierta, setHojaAbierta] = useState(false);
  const esMovil = useEsMovil();

  // Filtros → URL, sin pasar por el router (ver cabecera).
  useEffect(() => {
    const q = filtrosAQuery(filtros);
    window.history.replaceState(null, "", `${window.location.pathname}${q ? `?${q}` : ""}`);
  }, [filtros]);

  const nombreZona = useMemo(() => new Map(datos.zonas.map((z) => [z.id, z.nombre])), [datos.zonas]);
  const zona = (id: string) => nombreZona.get(id) ?? id;

  const hrefDestino = (slug: string) => `/fuera-de-ruta/${provincia}/${slug}`;
  const hrefZonas = `/fuera-de-ruta/${provincia}`;

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

  // El planificador hereda los filtros por la URL, que es como los hereda también un
  // enlace compartido: una sola forma de entrar, sin estado escondido.
  const queryActual = filtrosAQuery(filtros);
  const hrefCrearViaje = `/fuera-de-ruta/${provincia}/crear-viaje${queryActual ? `?${queryActual}` : ""}`;

  const nBano = (filtros.bano ? 1 : 0) + (filtros.agua?.length ?? 0);

  // ---------------------------------------------------------------- MÓVIL (F4)
  if (esMovil) {
    // Con 0 resultados no se puede ir al mapa: se muestra el estado 0 en la lista.
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

          {/* Mapa: siempre montado (no reinicializar Leaflet al cambiar de modo) */}
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

        {/* Barra de acción fija: el CTA principal siempre visible (antes solo al final de
            la lista) + acceso al mapa. Sustituye a la píldora suelta «Mapa · N». */}
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
        <Link href="/fuera-de-ruta" className="fr-crumb">‹ España</Link>
        <Link href={hrefZonas} className="fr-crumb fr-crumb--on">{datos.comunidad}</Link>
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

// Deja de `todas` las opciones en su orden solo las que aparecen en los datos.
function presentes(todas: string[], valores: string[]): string[] {
  const hay = new Set(valores);
  return todas.filter((v) => hay.has(v));
}
