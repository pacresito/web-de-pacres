// Mazos de mentira para poder juzgar la interfaz el primer día.
//
// Una tarjeta de tres huecos exige cuatro datos con más de tres semanas de vida, así que sin
// esto la mitad del diseño no se podría mirar hasta dentro de un mes. Se invoca con
// `?sembrar=<perfil>` y solo escribe el estado local: no toca Redis ni nada de nadie.
import { DATOS, type Dato, type Mazo } from "./srs";
import { PAISES } from "./paises";

export const PERFILES = ["vacio", "medio", "dominado", "mezcla"] as const;
export type Perfil = (typeof PERFILES)[number];

export const esPerfil = (v: string | null): v is Perfil => !!v && (PERFILES as readonly string[]).includes(v);

// Determinista a propósito: el mismo perfil da siempre el mismo mazo, así que una pega vista
// en una tarjeta se puede volver a mirar.
const revuelto = (id: string, d: Dato) =>
  [...id + d].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 997, 7) / 997;

const DIA = 86_400_000;

export function sembrar(perfil: Perfil, ahora: number): Mazo {
  if (perfil === "vacio") return {};
  const mazo: Mazo = {};
  PAISES.forEach((p, i) => {
    // En "mezcla" cada país cae en un estado distinto, que es lo que hace falta para ver de
    // un tirón las tarjetas de uno, dos y tres huecos.
    const estado = perfil === "mezcla" ? (["vacio", "medio", "dominado"] as const)[i % 3] : perfil;
    if (estado === "vacio") return;
    mazo[p.id] = {};
    for (const d of DATOS) {
      const r = revuelto(p.id, d);
      // "medio" deja unos datos asentados y otros no, que es donde la regla de huecos decide.
      const vida = estado === "dominado" ? 40 + r * 200 : r < 0.5 ? 2 + r * 10 : 30 + r * 60;
      mazo[p.id]![d] = { vida, visto: ahora - r * vida * DIA };
    }
  });
  return mazo;
}
