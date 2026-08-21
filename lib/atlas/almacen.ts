// La sesión de Atlas: el mazo, la tarjeta que toca, y el puente con React.
//
// Sin sesión iniciada el progreso vive en este navegador y a riesgo de Pablo: es deliberado,
// sirve para prestar el móvil sin ensuciar el mazo. Con sesión mandará Redis y esto será caché.
//
// Vive fuera de React a propósito. React no es el dueño del mazo —lo es el almacenamiento del
// navegador— y, sobre todo, decidir qué tarjeta toca exige mirar el reloj, que en un render es
// impuro: dos renders del mismo estado darían tarjetas distintas. Aquí el reloj se mira una
// vez, al avanzar, y `useSyncExternalStore` lee el resultado sin efectos ni cascadas.
import { esPerfil, sembrar } from "./sembrar";
import { RECORRIDO } from "@/data/atlas/orden";
import { calificar, montar, siguiente, type Dato, type Mazo, type Nota, type Tarjeta } from "./srs";

const CLAVE = "atlas:mazo";

export type Vista = {
  tarjeta: Tarjeta | null;
  /** El mazo vacío es la primerísima vez: se enseña cómo va esto y no vuelve a aparecer. */
  estrenando: boolean;
};

let mazo: Mazo | null = null;
let vista: Vista | null = null;
const oyentes = new Set<() => void>();

function leerDeDisco(): Mazo {
  // `?sembrar=<perfil>` fabrica un mazo en el estado que se quiera mirar; sin él, ver una
  // tarjeta de tres huecos exigiría esperar tres semanas. Solo escribe en local.
  const perfil = new URLSearchParams(location.search).get("sembrar");
  if (esPerfil(perfil)) return sembrar(perfil, Date.now());
  try {
    const s = localStorage.getItem(CLAVE);
    return s ? (JSON.parse(s) as Mazo) : {};
  } catch {
    // Modo privado o almacenamiento lleno: se juega sin recordar, que es mejor que no jugar.
    return {};
  }
}

function avanzar(m: Mazo): Vista {
  const ahora = Date.now();
  const pais = siguiente(m, RECORRIDO, ahora);
  return { tarjeta: pais ? montar(m, pais, ahora) : null, estrenando: Object.keys(m).length === 0 };
}

export function suscribir(avisar: () => void) {
  oyentes.add(avisar);
  return () => { oyentes.delete(avisar); };
}

export function vistaActual(): Vista {
  if (!vista) vista = avanzar((mazo = leerDeDisco()));
  return vista;
}

// En el server no hay mazo. Pintar una tarjeta con el mazo vacío y otra distinta al hidratar
// sería un desajuste de hidratación, que se manifiesta como un error ilegible.
export const sinVista = (): Vista | null => null;

// El mazo tal cual, para explorar, que solo lo mira. Devuelve la misma referencia mientras no
// cambie —`useSyncExternalStore` compara por identidad y una copia nueva por lectura sería un
// bucle de renders—; y en el server, uno vacío y siempre el mismo, por lo mismo.
const VACIO: Mazo = {};
export function mazoActual(): Mazo {
  if (!mazo) vistaActual();
  return mazo!;
}
export const sinMazo = (): Mazo => VACIO;

/** Aplica las notas de la tarjeta actual, guarda y pasa a la siguiente. */
export function calificarTarjeta(paisId: string, notas: Partial<Record<Dato, Nota>>) {
  const ahora = Date.now();
  let m = mazo ?? {};
  for (const [dato, nota] of Object.entries(notas)) m = calificar(m, paisId, dato as Dato, nota, ahora);
  mazo = m;
  try { localStorage.setItem(CLAVE, JSON.stringify(m)); } catch {}
  vista = avanzar(m);
  for (const avisar of oyentes) avisar();
}
