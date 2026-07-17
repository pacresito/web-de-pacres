// El viaje concreto (bloque 2) ↔ querystring, para que una URL restaure el viaje al
// recargar o compartir. El viajero (bloque 1) NO va aquí: es reutilizable y vive en
// localStorage. Puro, sin React. Test junto al mapeo.
//
// Parseo defensivo como los filtros del explorador: un valor desconocido se ignora y el
// resto sigue en pie (nunca invalida el conjunto). Solo se aceptan valores de la config.
import { camposDe, opcionesDe, varios, type Campo, type Respuestas } from "./preguntas";

const MULTI: Campo[] = ["prioridades"];              // el único multi del bloque viaje
const esFecha = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);

export function serializarViaje(r: Respuestas): string {
  const p = new URLSearchParams();
  for (const campo of camposDe("viaje")) {
    if (MULTI.includes(campo)) {
      varios(r, campo).forEach((v) => p.append(campo, v));
    } else if (typeof r[campo] === "string") {
      p.set(campo, r[campo] as string);
    }
  }
  return p.toString();
}

export function parsearViaje(p: URLSearchParams): Respuestas {
  const r: Respuestas = {};
  for (const campo of camposDe("viaje")) {
    if (MULTI.includes(campo)) {
      const validos = p.getAll(campo).filter((v) => opcionesDe(campo).includes(v));
      if (validos.length) r[campo] = validos;
    } else {
      const v = p.get(campo);
      if (!v) continue;
      // fecha se valida por formato; el resto contra los valores de la config.
      if (campo === "fecha" ? esFecha(v) : opcionesDe(campo).includes(v)) r[campo] = v;
    }
  }
  return r;
}
