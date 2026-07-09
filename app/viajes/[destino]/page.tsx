import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { DatosViajes, Restaurante } from "@/lib/viajes/tipos";
import { rango } from "@/lib/viajes/formato";
import datosNavarra from "@/data/viajes/navarra.json";

// Ficha de destino (Server Component): URL propia y compartible. Todas las
// rutas salen del JSON en build; un slug desconocido da 404.
const datos = datosNavarra as DatosViajes;

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
  const restaurantes = datos.restaurantes.filter((r) => r.zona === d.zona);

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

        <div className="v-ficha-img">🏔️</div>

        <div className="v-ficha-top">
          <span className="v-tipo">{d.tipo}</span>
          <span className="v-zona">{zona} · {datos.comunidad}</span>
        </div>
        <h1>{d.nombre}</h1>
        <p className="v-ficha-que">{d.queEs}</p>

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

        {d.queVer && d.queVer.length > 0 && (
          <section className="v-seccion">
            <h2>Qué ver</h2>
            <ul className="v-quever">
              {d.queVer.map((q) => <li key={q}>{q}</li>)}
            </ul>
          </section>
        )}

        {d.nota && <p className="v-nota">{d.nota}</p>}

        {restaurantes.length > 0 && (
          <section className="v-seccion">
            <h2>Dónde comer en la zona</h2>
            {restaurantes.map((r) => (
              <RestoFicha key={r.nombre} resto={r} />
            ))}
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
      <div className="v-resto-nombre">{r.nombre}</div>
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
