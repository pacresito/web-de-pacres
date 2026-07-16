import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Destino, Restaurante } from "@/lib/fuera-de-ruta/tipos";
import { rango } from "@/lib/fuera-de-ruta/formato";
import { tiempoCoche } from "@/lib/fuera-de-ruta/planificador/geo";
import { datosDe, matrizDe, PROVINCIAS_CON_DATOS } from "@/lib/fuera-de-ruta/datos";
import Portada from "./Portada";

// Ficha de destino (Server Component): URL propia y compartible, colgando de su
// provincia. Todas las rutas salen del JSON en build; un slug desconocido da 404.
// Río pop (F5): toda sección sin dato no se renderiza, sin huecos.

// Restaurantes: uno por categoría, en este orden, máx. 3 (spec de Cris).
const CATEGORIAS = ["economico", "calidad-precio", "especial"] as const;
const ETIQUETA_CAT: Record<string, string> = {
  economico: "Económico",
  "calidad-precio": "Calidad-precio",
  especial: "Especial",
};

// Etiquetas de cara al usuario de los valores estructurados (spec §4.11).
const RECORRIDO_TEXTO: Record<string, string> = {
  circular: "circular",
  "ida-vuelta": "ida y vuelta",
  lineal: "lineal",
};
const ACCESO_TEXTO: Record<string, string> = {
  asfalto: "asfalto",
  "pista buena": "pista en buen estado",
  pista: "pista sin asfaltar",
};

// Minutos → "1 h 30 min". El rango estancia mínima–ideal se muestra como una sola fila.
function minutos(m: number): string {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return [h && `${h} h`, min && `${min} min`].filter(Boolean).join(" ") || "0 min";
}
function estancia(min?: number, ideal?: number): string | undefined {
  if (min === undefined && ideal === undefined) return undefined;
  if (min !== undefined && ideal !== undefined && min !== ideal)
    return `${minutos(min)} – ${minutos(ideal)}`;
  return minutos((ideal ?? min)!);
}

type Props = { params: Promise<{ provincia: string; destino: string }> };

export function generateStaticParams() {
  return PROVINCIAS_CON_DATOS.flatMap((provincia) =>
    datosDe(provincia)!.destinos.map((d) => ({ provincia, destino: d.slug })),
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { provincia, destino } = await params;
  const d = datosDe(provincia)?.destinos.find((x) => x.slug === destino);
  return { title: d ? `${d.nombre} · Fuera de Ruta` : "Fuera de Ruta" };
}

export default async function FichaDestino({ params }: Props) {
  const { provincia, destino } = await params;
  const datos = datosDe(provincia);
  const matriz = matrizDe(provincia);
  if (!datos || !matriz) notFound();

  const d = datos.destinos.find((x) => x.slug === destino);
  if (!d) notFound();

  const hrefZonas = `/fuera-de-ruta/${provincia}`;
  const zona = datos.zonas.find((z) => z.id === d.zona)?.nombre ?? d.zona;
  const restaurantes = CATEGORIAS
    .map((cat) => datos.restaurantes.find((r) => r.zona === d.zona && r.categoria === cat))
    .filter((r): r is Restaurante => r !== undefined);

  // Destinos cercanos: resolver slugs a fichas reales (descartar rotos y el propio)
  // y adjuntar el tiempo de coche desde la matriz cuando ambos están en ella.
  const cercanos = (d.cerca ?? [])
    .map((slug) => datos.destinos.find((x) => x.slug === slug))
    .filter((x): x is Destino => x !== undefined && x.slug !== d.slug)
    .map((c) => {
      const enMatriz = matriz.ids.includes(d.slug) && matriz.ids.includes(c.slug);
      const minutos = enMatriz ? Math.round(tiempoCoche(matriz, d.slug, c.slug) / 60) : undefined;
      return { destino: c, minutos };
    });

  const galeria = d.imagenes ?? (d.imagen ? [d.imagen] : []); // sin foto → fallback "foto en camino"

  // Ficha técnica (nivel 2): toda fila sin dato se omite, así una ficha con pocos
  // campos no deja huecos y una completa los pinta todos.
  const siNo = (v: boolean) => (v ? "sí" : "no");
  const filasTexto: [string, string][] = [];
  if (d.distanciaKm) filasTexto.push(["A pie", rango(d.distanciaKm, "km")]);
  if (d.desnivelM) filasTexto.push(["Desnivel", d.desnivelM[1] === 0 ? "llano" : `+${rango(d.desnivelM, "m")}`]);
  if (d.duracion) filasTexto.push(["Duración", d.duracion]);
  if (d.dificultad) filasTexto.push(["Dificultad", d.dificultad]);
  if (d.recorrido) filasTexto.push(["Recorrido", RECORRIDO_TEXTO[d.recorrido] ?? d.recorrido]);
  if (d.terreno) filasTexto.push(["Terreno", d.terreno]);
  if (d.accesoCarretera) filasTexto.push(["Acceso", ACCESO_TEXTO[d.accesoCarretera] ?? d.accesoCarretera]);
  if (d.senalizacion) filasTexto.push(["Señalización", d.senalizacion]);
  const estanciaTxt = estancia(d.estanciaMin, d.estanciaIdeal);
  if (estanciaTxt) filasTexto.push(["Estancia", estanciaTxt]);
  if (d.edadMinima !== undefined) filasTexto.push(["Edad mínima", `desde ${d.edadMinima} años`]);
  if (d.mejorEpoca) filasTexto.push(["Época", d.mejorEpoca]);
  if (d.mejorMomento) filasTexto.push(["Mejor momento", d.mejorMomento]);
  if (d.horario) filasTexto.push(["Horario", d.horario]);
  if (d.precio) filasTexto.push(["Precio", d.precio]);
  if (d.reserva) filasTexto.push(["Reserva", d.reserva]);
  if (d.plazoReserva) filasTexto.push(["Antelación", d.plazoReserva]);

  const filasBool: [string, boolean][] = [];
  if (d.carrito !== undefined) filasBool.push(["Apta carrito", d.carrito]);
  if (d.ninos !== undefined) filasBool.push(["Apto niños", d.ninos]);
  if (d.perros !== undefined) filasBool.push(["Apto perros", d.perros]);
  if (d.bano !== undefined) filasBool.push(["Baño", d.bano]);
  if (d.vertigo !== undefined) filasBool.push(["Pasarelas / vértigo", d.vertigo]);

  const contactos: [string, string, string][] = []; // [etiqueta, texto, href]
  if (d.contacto?.web) contactos.push(["Web oficial", "abrir web ↗", d.contacto.web]);
  if (d.contacto?.tel) contactos.push(["Teléfono", d.contacto.tel, `tel:${d.contacto.tel}`]);
  if (d.contacto?.email) contactos.push(["Email", d.contacto.email, `mailto:${d.contacto.email}`]);

  const badges = (
    <div className="fr-s4-badges">
      <span className="fr-s4-badge-tipo">{d.tipo}</span>
      <span className="fr-s4-badge-zona">{zona}</span>
      {d.favoritoDeCris && (
        <span className="fr-sticker fr-s4-badge-favorito">favorito de Cris</span>
      )}
    </div>
  );

  return (
    <>
      <article className="fr-s4">
        <div className="fr-s4-crumbs">
          <Link href={hrefZonas} className="fr-crumb">‹ {datos.comunidad}</Link>
        </div>

        <div className="fr-s4-grid">
          <div className="fr-s4-col">
            {/* Cabecera — escritorio: badges + título antes de la galería */}
            <div className="fr-s4-cabecera--desktop">
              {badges}
              <h1 className="fr-s4-h1">{d.nombre}</h1>
              <p className="fr-s4-lead">{d.queEs}</p>
            </div>

            {/* Hero móvil + galería: la foto grande cambia al pulsar una miniatura */}
            <Portada
              fotos={galeria}
              nombre={d.nombre}
              queEs={d.queEs}
              overlay={
                <>
                  <Link href={hrefZonas} className="fr-s4-back" aria-label={`Volver a ${datos.comunidad}`}>‹</Link>
                  <div className="fr-s4-badges--overlay">{badges}</div>
                </>
              }
            />

            {d.loMejor && d.loMejor.length > 0 && (
              <section className="fr-s4-seccion">
                <span className="fr-s4-titulo">Lo mejor</span>
                <div className="fr-s4-lo-mejor">
                  {d.loMejor.map((x) => (
                    <span key={x} className="fr-s4-check"><i>✓</i><span>{x}</span></span>
                  ))}
                </div>
              </section>
            )}

            {d.queVer && d.queVer.length > 0 && (
              <section className="fr-s4-seccion">
                <span className="fr-s4-titulo">Qué ver</span>
                <p className="fr-s4-parrafo">{d.queVer.join(", ")}.</p>
              </section>
            )}

            {d.antesDeIr && d.antesDeIr.length > 0 && (
              <section className="fr-s4-seccion">
                <span className="fr-s4-titulo">Antes de ir</span>
                {d.antesDeIr.map((x) => (
                  <div key={x} className="fr-s4-aviso"><i>!</i><span>{x}</span></div>
                ))}
              </section>
            )}

            {d.nota && (
              <div className="fr-s4-nota">
                <span className="fr-sticker fr-s4-nota-sticker">nota de Cris</span>
                <p>«{d.nota}»</p>
              </div>
            )}

            {cercanos.length > 0 && (
              <section className="fr-s4-seccion">
                <span className="fr-s4-titulo">Cerca de esta ruta</span>
                <div className="fr-s4-cerca-grid">
                  {cercanos.map(({ destino: c, minutos }) => (
                    <Link key={c.slug} href={`/fuera-de-ruta/${provincia}/${c.slug}`} className="fr-s4-cerca-item">
                      <div className="fr-s4-cerca-thumb">
                        {c.imagen && <Image src={c.imagen} alt={c.nombre} fill sizes="52px" />}
                      </div>
                      <span>
                        <span className="fr-s4-cerca-nombre">{c.nombre}</span>
                        <span className="fr-s4-cerca-sub">{c.tipo}{minutos !== undefined ? ` · ${minutos} min en coche` : ""}</span>
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>

          <div className="fr-s4-lateral">
            {d.gps && (
              <a
                className="fr-btn fr-btn--primario fr-s4-accion"
                href={`https://www.google.com/maps/search/?api=1&query=${d.gps[0]},${d.gps[1]}`}
                target="_blank"
                rel="noreferrer"
              >
                Abrir en Google Maps →
                <span className="fr-s4-accion-sub">te lleva al parking, no al monte{d.gpsAprox ? " (ubicación aproximada)" : ""}</span>
              </a>
            )}
            {d.trackWikiloc && (
              <a className="fr-btn fr-btn--secundario fr-s4-accion" href={d.trackWikiloc} target="_blank" rel="noreferrer">
                Ruta en Wikiloc ↗
              </a>
            )}

            {(filasTexto.length > 0 || filasBool.length > 0) && (
              <details className="fr-tarjeta fr-s4-caja fr-s4-ficha" open>
                <summary className="fr-mono fr-s4-caja-titulo fr-s4-ficha-sum">Ficha técnica</summary>
                {filasTexto.map(([k, v]) => (
                  <div key={k} className="fr-s4-fila">
                    <span className="fr-s4-fila-k">{k}</span>
                    <span className="fr-s4-fila-v">{v}</span>
                  </div>
                ))}
                {filasBool.map(([k, v]) => (
                  <div key={k} className="fr-s4-fila">
                    <span className="fr-s4-fila-k">{k}</span>
                    <span className={`fr-pildora ${v ? "fr-pildora--si" : "fr-pildora--no"}`}>{siNo(v)}</span>
                  </div>
                ))}
                {d.paisaje && d.paisaje.length > 0 && (
                  <div className="fr-s4-fila fr-s4-fila--tags">
                    <span className="fr-s4-fila-k">Paisaje</span>
                    <span className="fr-s4-tags">{d.paisaje.map((p) => <span key={p} className="fr-s4-tag">{p}</span>)}</span>
                  </div>
                )}
                {d.experiencia && d.experiencia.length > 0 && (
                  <div className="fr-s4-fila fr-s4-fila--tags">
                    <span className="fr-s4-fila-k">Experiencia</span>
                    <span className="fr-s4-tags">{d.experiencia.map((x) => <span key={x} className="fr-s4-tag">{x}</span>)}</span>
                  </div>
                )}
                {contactos.map(([k, texto, href]) => (
                  <div key={k} className="fr-s4-fila">
                    <span className="fr-s4-fila-k">{k}</span>
                    <a className="fr-s4-fila-v fr-s4-fila-link" href={href} target="_blank" rel="noreferrer">{texto}</a>
                  </div>
                ))}
                {d.material && d.material.length > 0 && (
                  <div className="fr-s4-fila fr-s4-fila--tags">
                    <span className="fr-s4-fila-k">Material</span>
                    <span className="fr-s4-tags">{d.material.map((m) => <span key={m} className="fr-s4-tag">{m}</span>)}</span>
                  </div>
                )}
                {d.detalles && d.detalles.length > 0 && (
                  <div className="fr-s4-ficha-detalles">
                    <span className="fr-s4-ficha-detalles-tit">Detalles que marcan la diferencia</span>
                    {d.detalles.map((x) => <p key={x}>{x}</p>)}
                  </div>
                )}
              </details>
            )}

            {d.pueblosAlojamiento && d.pueblosAlojamiento.length > 0 && (
              <div className="fr-tarjeta fr-s4-caja">
                <span className="fr-mono">Dónde alojarse</span>
                <div className="fr-s4-pueblos fr-s4-caja-pueblos">
                  {d.pueblosAlojamiento.map((p) => <span key={p} className="fr-s4-pueblo">{p}</span>)}
                </div>
              </div>
            )}

            {restaurantes.length > 0 && (
              <div className="fr-tarjeta fr-s4-caja fr-s4-caja--espaciada">
                <span className="fr-mono">Dónde comer en la zona</span>
                {restaurantes.map((r) => <RestoFicha key={r.nombre} resto={r} />)}
              </div>
            )}
          </div>
        </div>
      </article>

      {(d.gps || d.trackWikiloc) && (
        <div className="fr-s4-barra">
          {d.gps && (
            <a className="fr-btn fr-btn--primario" href={`https://www.google.com/maps/search/?api=1&query=${d.gps[0]},${d.gps[1]}`} target="_blank" rel="noreferrer">
              Google Maps →
            </a>
          )}
          {d.trackWikiloc && (
            <a className="fr-btn fr-btn--secundario" href={d.trackWikiloc} target="_blank" rel="noreferrer">
              Wikiloc ↗
            </a>
          )}
        </div>
      )}
    </>
  );
}

function RestoFicha({ resto: r }: { resto: Restaurante }) {
  const precios = [
    r.precioMenu !== undefined && `menú ${r.precioMenu} €`,
    r.precioCarta && `carta ${rango(r.precioCarta, "€")}`,
  ].filter(Boolean).join(" · ");

  return (
    <div className="fr-s4-resto">
      <span className="fr-s4-resto-badge">R</span>
      <span>
        <span className="fr-s4-resto-nombre">
          {r.nombre}
          {r.categoria && ETIQUETA_CAT[r.categoria] && ` · ${ETIQUETA_CAT[r.categoria]}`}
        </span>
        <span className="fr-s4-resto-sub">
          {[r.poblacion, precios || undefined, r.reserva ? "mejor reservar" : undefined].filter(Boolean).join(" · ")}
        </span>
      </span>
    </div>
  );
}
