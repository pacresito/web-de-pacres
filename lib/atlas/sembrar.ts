// Mazos de salida: un punto de partida que no es el cero.
//
// Nacieron para poder juzgar la interfaz el primer día —una tarjeta de tres huecos exige cuatro
// datos con más de tres semanas de vida, y sin esto medio diseño no se veía hasta dentro de un
// mes— y son también los niveles que elige quien juega sin cuenta: vuelve sin su localStorage, o
// se le ha quedado corto. **Nunca tocan Redis**: `almacen` corta el volcado y la sincronía en
// cuanto hay siembra, así que la garantía no depende de dónde se ponga el botón.
//
// Son relojes inventados, y el algoritmo los corrige solo: un dato que se falla cae a 0,01 días
// y vuelve en la misma sesión, así que en dos sesiones el mazo se parece a lo que se sabe.
import { DATOS, type Dato, type Mazo } from "./srs";
import { RECORRIDO } from "@/data/atlas/orden";

export const PERFILES = ["vacio", "facil", "medio", "dominado", "mezcla"] as const;
export type Perfil = (typeof PERFILES)[number];

export const esPerfil = (v: string | null): v is Perfil => !!v && (PERFILES as readonly string[]).includes(v);

/** Cuántos países entran en un mazo sembrado. Ni los 195 —sembrar el mundo entero mete de golpe
 *  en juego lo que el freno de países nuevos existe para dosificar— ni tan pocos que el reto se
 *  acabe en una tarde. */
export const SEMBRADOS = 50;

// Determinista a propósito, con la semilla como única entrada de azar: el mismo perfil y la misma
// semilla dan siempre el mismo mazo, así que una pega vista en una tarjeta se puede volver a
// mirar. Quien juega pide semilla nueva; `?sembrar` no la pide y por eso repite.
//
// FNV-1a con avalancha al final, y no el `h * 31 + c` de toda la vida: aquel ordena por lo que
// pesa la cadena antes que por lo que dice —dos ids de distinta longitud caen siempre del mismo
// lado— y el sorteo salía igual con cualquier semilla.
const revuelto = (...partes: string[]) => {
  let h = 2166136261;
  for (const c of partes.join("·")) {
    h ^= c.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 2246822507);
  h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
};

const DIA = 86_400_000;

/**
 * Los que entran: cincuenta al azar y no los cincuenta primeros del recorrido, porque un mazo
 * sembrado no es solo una ventaja de salida —es otra manera de usar esto, un reto de un día sin
 * intención de volver—, y un reto que empieza siempre por los mismos países se acaba a la segunda.
 */
export const sorteo = (ids: string[], semilla: string) =>
  [...ids].sort((a, b) => revuelto(a, semilla) - revuelto(b, semilla)).slice(0, SEMBRADOS);

/** `semilla` decide **cuáles** son los cincuenta; el perfil, en qué estado están. */
export function sembrar(perfil: Perfil, ahora: number, semilla = ""): Mazo {
  if (perfil === "vacio") return {};
  const mazo: Mazo = {};
  sorteo(RECORRIDO, semilla).forEach((id, i) => {
    // En "mezcla" cada país cae en un estado distinto, que es lo que hace falta para ver de
    // un tirón las tarjetas de uno, dos y tres huecos.
    const estado = perfil === "mezcla" ? (["vacio", "medio", "dominado"] as const)[i % 3] : perfil;
    if (estado === "vacio") return;
    mazo[id] = {};
    for (const d of DATOS) {
      const r = revuelto(id, d);
      // "facil" deja todo por asentar —países ya vistos, un hueco por tarjeta—; "medio" asienta
      // la mitad, que es donde la regla de huecos decide; "dominado" los cuatro.
      const vida = estado === "dominado" ? 40 + r * 200
        : estado === "facil" ? 2 + r * 15
        : r < 0.5 ? 2 + r * 10 : 30 + r * 60;
      mazo[id]![d] = { vida, visto: ahora - r * vida * DIA };
    }
  });
  return mazo;
}
