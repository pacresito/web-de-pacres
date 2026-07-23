import type { Metadata } from "next";
import { agenda, sedeParaFecha } from "./engine";
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

export default async function Observatorio() {
  const ahora = new Date();
  const noches = agenda(await cargarSatelites(), ahora);
  return <Vista noches={noches} sede={sedeParaFecha(ahora).nombre} />;
}
