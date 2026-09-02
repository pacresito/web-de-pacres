import type { Metadata } from "next";
import { ALTITUD_MINIMA, MAGNITUD_MAXIMA, cielo } from "./engine";
import { HOLGURA_ENLACE, pasoDelEnlace } from "./marco";
import { cargarSatelites } from "./tle";
import Vista from "./vista";

// Sin caché de página: la agenda arranca en "ahora", y esta página se visita de tarde en
// tarde. Cacheada, la primera carga tras unos días serviría una agenda vieja (con eventos
// ya pasados) y solo la recarga siguiente estaría fresca. Recalcular cuesta ~200 ms.
export const dynamic = "force-dynamic";

// Pero `force-dynamic` también pone TODOS los fetch en `no-store`, y entonces cada visita
// se bajaría el TLE de Celestrak. `default-cache` devuelve el control al propio fetch, que
// pide sus 6 h de caché en `tle.ts`: la página se recalcula siempre, la red no se toca.
export const fetchCache = "default-cache";

export const metadata: Metadata = {
  title: "Observatorio",
  description: "Qué se ve en el cielo las próximas noches.",
};

// Los criterios del prompt salen de las constantes del motor: si allí cambia el listón, la
// cabecera no puede seguir presumiendo del viejo. Se arma aquí, en el servidor, para que la
// vista no tenga que importar el motor —y con él, astronomy-engine— al navegador.
const COMANDO = `./observatorio --min-altitude=${ALTITUD_MINIMA} --max-magnitude=${MAGNITUD_MAXIMA}`;

// El paso que señala `?paso=` —el enlace del aviso al móvil—, o null. Se resuelve aquí y no
// en el navegador para que el HTML llegue ya con la carta puesta: leído al montar, primero se
// vería el observatorio entero y un segundo después la carta encima.
export default async function Observatorio({ searchParams }: {
  searchParams: Promise<{ [clave: string]: string | string[] | undefined }>;
}) {
  const c = cielo(await cargarSatelites(), new Date());
  const señal = pasoDelEnlace((await searchParams).paso);
  const suyo = señal && c.pasos.find((p) => p.nombre.toLowerCase() === señal.nombre
    && Math.abs(p.visibleDesde - señal.visibleDesde) < HOLGURA_ENLACE);

  return <Vista cielo={c} comando={COMANDO} abrir={suyo ? suyo.instante : null} />;
}
