// El bloque viaje ↔ querystring, para que una URL restaure el viaje. Como en los
// filtros, un valor desconocido se ignora sin tumbar el resto.
import { camposDe, esMulti, opcionesDe, varios, type Respuestas } from "./preguntas";

const esFecha = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);

export function serializarViaje(r: Respuestas): string {
  const p = new URLSearchParams();
  for (const campo of camposDe("viaje")) {
    if (esMulti(campo)) {
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
    if (esMulti(campo)) {
      const validos = p.getAll(campo).filter((v) => opcionesDe(campo).includes(v));
      if (validos.length) r[campo] = validos;
    } else {
      const v = p.get(campo);
      if (!v) continue;
      if (campo === "fecha" ? esFecha(v) : opcionesDe(campo).includes(v)) r[campo] = v;
    }
  }
  return r;
}
