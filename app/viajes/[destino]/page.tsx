import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { DatosViajes, Destino, Restaurante } from "@/lib/viajes/tipos";
import { rango } from "@/lib/viajes/formato";
import datosNavarra from "@/data/viajes/navarra.json";

// Ficha de destino (Server Component): URL propia y compartible. Todas las
// rutas salen del JSON en build; un slug desconocido da 404.
const datos = datosNavarra as DatosViajes;

// Restaurantes: uno por categoría, en este orden, máx. 3 (spec de Cris).
const CATEGORIAS = ["economico", "calidad-precio", "especial"] as const;
const ETIQUETA_CAT: Record<string, string> = {
  economico: "Económico",
  "calidad-precio": "Calidad-precio",
  especial: "Especial",
};

type Props = { params: Promise<{ destino: string }> };

export function generateStaticParams() {
  return datos.destinos.map((d) => ({ destino: d.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { destino } = await params;
  const d = datos.destinos.find((x) => x.slug === destino);
  return { title: d ? `${d.nombre} · Fuera de Ruta` : "Fuera de Ruta" };
}

export default async function FichaDestino({ params }: Props) {
  const { destino } = await params;
  const d = datos.destinos.find((x) => x.slug === destino);
  if (!d) notFound();

  const zona = datos.zonas.find((z) => z.id === d.zona)?.nombre ?? d.zona;
  const restaurantes = CATEGORIAS
    .map((cat) => datos.restaurantes.find((r) => r.zona === d.zona && r.categoria === cat))
    .filter((r): r is Restaurante => r !== undefined);

  // Destinos cercanos: resolver slugs a fichas reales (descartar rotos y el propio).
  const cercanos = (d.cerca ?? [])
    .map((slug) => datos.destinos.find((x) => x.slug === slug))
    .filter((x): x is Destino => x !== undefined && x.slug !== d.slug);

  const galeria = d.imagenes ?? [d.imagen];

  const siNo = (v: boolean) => (v ? "Sí" : "No");
  const filas: [string, string][] = [];
  if (d.distanciaKm) filas.push(["Distancia", rango(d.distanciaKm, "km")]);
  if (d.desnivelM) filas.push(["Desnivel", rango(d.desnivelM, "m")]);
  if (d.duracion) filas.push(["Duración", d.duracion]);
  if (d.dificultad) filas.push(["Dificultad", d.dificultad]);
  if (d.circular !== undefined) filas.push(["Circular", siNo(d.circular)]);
  if (d.senalizacion) filas.push(["Señalización", d.senalizacion]);
  if (d.bano !== undefined) filas.push(["Baño", siNo(d.bano)]);
  if (d.ninos !== undefined) filas.push(["Con niños", siNo(d.ninos)]);
  if (d.perros !== undefined) filas.push(["Con perro", siNo(d.perros)]);
  if (d.mejorEpoca) filas.push(["Mejor época", d.mejorEpoca]);
  if (d.reserva) filas.push(["Reserva", d.reserva]);

  return (
    <>
      <header className="v-header">
        <div className="v-header-inner">
          <Link href="/viajes" className="v-marca">Fuera de Ruta</Link>
        </div>
      </header>

      <article className="v-ficha">
        <Link href="/viajes" className="v-volver">← Todos los sitios</Link>

        <div className="v-ficha-img">
          <Image src={galeria[0]} alt={d.nombre} fill sizes="(max-width: 860px) 100vw, 860px" priority />
        </div>

        {galeria.length > 1 && (
          <div className="v-galeria">
            {galeria.slice(1).map((src) => (
              <div key={src} className="v-galeria-thumb">
                <Image src={src} alt={d.nombre} fill sizes="(max-width: 860px) 33vw, 280px" />
              </div>
            ))}
          </div>
        )}

        <div className="v-ficha-top">
          <span className="v-tipo">{d.tipo}</span>
          <span className="v-zona">{zona} · {datos.comunidad}</span>
        </div>
        <h1>{d.nombre}</h1>
        <p className="v-ficha-que">{d.queEs}</p>

        {(d.gps || d.trackWikiloc) && (
          <div className="v-acciones">
            {d.gps && (
              <a
                className="v-maps"
                href={`https://www.google.com/maps/search/?api=1&query=${d.gps[0]},${d.gps[1]}`}
                target="_blank"
                rel="noreferrer"
              >
                Abrir en Google Maps{d.gpsAprox ? " (ubicación aproximada)" : ""}
              </a>
            )}
            {d.trackWikiloc && (
              <a className="v-wikiloc" href={d.trackWikiloc} target="_blank" rel="noreferrer">
                Ver track en Wikiloc
              </a>
            )}
          </div>
        )}

        {filas.length > 0 && (
          <dl className="v-datos">
            {filas.map(([nombre, valor]) => (
              <div key={nombre} className="v-dato">
                <dt>{nombre}</dt>
                <dd>{valor}</dd>
              </div>
            ))}
          </dl>
        )}

        {d.loMejor && d.loMejor.length > 0 && (
          <section className="v-seccion">
            <h2>Lo mejor</h2>
            <ul className="v-lista-check">
              {d.loMejor.map((x) => <li key={x}>{x}</li>)}
            </ul>
          </section>
        )}

        {d.queVer && d.queVer.length > 0 && (
          <section className="v-seccion">
            <h2>Qué ver</h2>
            <ul className="v-quever">
              {d.queVer.map((q) => <li key={q}>{q}</li>)}
            </ul>
          </section>
        )}

        {d.antesDeIr && d.antesDeIr.length > 0 && (
          <section className="v-seccion">
            <h2>Antes de ir</h2>
            <ul className="v-lista-warn">
              {d.antesDeIr.map((x) => <li key={x}>{x}</li>)}
            </ul>
          </section>
        )}

        {d.nota && <p className="v-nota">{d.nota}</p>}

        {d.pueblosAlojamiento && d.pueblosAlojamiento.length > 0 && (
          <section className="v-seccion">
            <h2>Dónde alojarse</h2>
            <div className="v-pueblos">
              {d.pueblosAlojamiento.map((p) => <span key={p} className="v-pueblo">{p}</span>)}
            </div>
          </section>
        )}

        {restaurantes.length > 0 && (
          <section className="v-seccion">
            <h2>Dónde comer en la zona</h2>
            {restaurantes.map((r) => (
              <RestoFicha key={r.nombre} resto={r} />
            ))}
          </section>
        )}

        {cercanos.length > 0 && (
          <section className="v-seccion">
            <h2>Cerca de esta ruta</h2>
            <div className="v-cerca">
              {cercanos.map((c) => (
                <Link key={c.slug} href={`/viajes/${c.slug}`} className="v-cerca-item">
                  <span className="v-cerca-nombre">{c.nombre}</span>
                  <span className="v-cerca-tipo">{c.tipo}</span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>
    </>
  );
}

function RestoFicha({ resto: r }: { resto: Restaurante }) {
  const precios = [
    r.precioMenu !== undefined && `Menú ${r.precioMenu} €`,
    r.precioCarta && `Carta ${rango(r.precioCarta, "€")}`,
  ].filter(Boolean).join(" · ");

  return (
    <div className="v-resto">
      <div className="v-resto-nombre">
        {r.nombre}
        {r.categoria && ETIQUETA_CAT[r.categoria] && (
          <span className="v-resto-cat">{ETIQUETA_CAT[r.categoria]}</span>
        )}
      </div>
      <div className="v-resto-sub">
        {[r.direccion ?? r.poblacion, r.telefono].filter(Boolean).join(" · ")}
      </div>
      {r.tipoComida && <div className="v-resto-comida">{r.tipoComida}</div>}
      {precios && <div className="v-resto-precios">{precios}</div>}
      {r.platos && r.platos.length > 0 && (
        <div className="v-resto-platos">{r.platos.join(" · ")}</div>
      )}
    </div>
  );
}
