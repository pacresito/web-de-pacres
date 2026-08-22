// La sesión de Atlas: el mazo, la tarjeta que toca, y el puente con React.
//
// Sin sesión iniciada el progreso vive en este navegador y a riesgo de Pablo: es deliberado,
// sirve para prestar el móvil sin ensuciar el mazo. Con sesión mandará Redis y esto será caché.
//
// Vive fuera de React a propósito. React no es el dueño del mazo —lo es el almacenamiento del
// navegador— y, sobre todo, decidir qué tarjeta toca exige mirar el reloj, que en un render es
// impuro: dos renders del mismo estado darían tarjetas distintas. Aquí el reloj se mira una
// vez, al avanzar, y `useSyncExternalStore` lee el resultado sin efectos ni cascadas.
import { esPerfil, sembrar, type Perfil } from "./sembrar";
import { RECORRIDO } from "@/data/atlas/orden";
import { calificar, montar, siguiente, type Dato, type Mazo, type Nota, type Tarjeta } from "./srs";

const CLAVE = "atlas:mazo";
const CLAVE_COLA = "atlas:cola";
const CLAVE_NIVEL = "atlas:nivel";
const RUTA_MAZO = "/juegos/atlas/api/mazo";
const RUTA_LOGIN = "/juegos/atlas/api/login";

/** Una calificación suelta, tal como viaja. El reloj es el de cuando se dio, no el del envío. */
type Calificacion = { pais: string; dato: Dato; nota: Nota; ms: number };

export type Vista = {
  tarjeta: Tarjeta | null;
  /** El mazo vacío es la primerísima vez: se enseña cómo va esto y no vuelve a aparecer. */
  estrenando: boolean;
};

let mazo: Mazo | null = null;
let vista: Vista | null = null;
let cola: Calificacion[] = [];
let identificado = false;
// Un mazo sembrado no se sincroniza jamás: son cuarenta calificaciones falsas y con sesión
// abierta se irían derechas al mazo de verdad, sin manera de deshacerlo. **La garantía vive
// aquí y no en la interfaz**, para que ningún botón puesto en el sitio equivocado pueda saltársela.
let sembrado = false;
/** El nivel de salida que se eligió, para poder enseñarlo. Sin elegir, se empieza de cero. */
let nivel: Perfil = "vacio";
const oyentes = new Set<() => void>();
const notificar = () => oyentes.forEach((a) => a());

function leerDeDisco(): Mazo {
  // `?sembrar=<perfil>` fabrica un mazo en el estado que se quiera mirar; sin él, ver una
  // tarjeta de tres huecos exigiría esperar tres semanas. Solo escribe en local.
  const perfil = new URLSearchParams(location.search).get("sembrar");
  if (esPerfil(perfil)) {
    sembrado = true;
    return sembrar(perfil, Date.now());
  }
  try {
    cola = JSON.parse(localStorage.getItem(CLAVE_COLA) ?? "[]") as Calificacion[];
    const n = localStorage.getItem(CLAVE_NIVEL);
    if (esPerfil(n)) nivel = n;
    const s = localStorage.getItem(CLAVE);
    return s ? (JSON.parse(s) as Mazo) : {};
  } catch {
    // Modo privado o almacenamiento lleno: se juega sin recordar, que es mejor que no jugar.
    return {};
  }
}

function guardar() {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(mazo));
    localStorage.setItem(CLAVE_COLA, JSON.stringify(cola));
    localStorage.setItem(CLAVE_NIVEL, nivel);
  } catch {}
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

export const sesionActual = () => identificado;
export const sinSesion = () => false;

/** Aplica las notas de la tarjeta actual, guarda y pasa a la siguiente. */
export function calificarTarjeta(paisId: string, notas: Partial<Record<Dato, Nota>>) {
  const ahora = Date.now();
  let m = mazo ?? {};
  for (const [dato, nota] of Object.entries(notas)) {
    m = calificar(m, paisId, dato as Dato, nota, ahora);
    cola.push({ pais: paisId, dato: dato as Dato, nota, ms: ahora });
  }
  mazo = m;
  guardar();
  vista = avanzar(m);
  notificar();
  // Se manda y no se espera: la tarjeta siguiente no depende de la red, y lo que no salga hoy
  // sale al volver. Tampoco se adopta lo que conteste — cambiar de tarjeta a media sesión
  // porque el otro dispositivo dijo otra cosa sería un salto sin explicación.
  if (!sembrado) void volcar();
}

/**
 * Vuelca la cola y devuelve el mazo del servidor, o null si no hay a quién volcarla.
 *
 * Un 401 no es un fallo: es que no hay sesión, y sin sesión el progreso vive en este navegador
 * y punto —así se le puede prestar el móvil a alguien sin ensuciar el mazo—. Por eso ahí la
 * cola se tira: no hay nada a lo que pertenezca. Un fallo de red sí la conserva.
 */
async function volcar(): Promise<Mazo | null> {
  const enviadas = cola.length;
  let r: Response;
  try {
    r = await fetch(RUTA_MAZO, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ calificaciones: cola }),
    });
  } catch {
    return null; // sin cobertura: la cola espera
  }
  if (r.status === 401) {
    identificado = false;
    cola = [];
    guardar();
    notificar();
    return null;
  }
  if (!r.ok) return null;
  const { mazo: remoto } = (await r.json()) as { mazo: Mazo };
  // Solo lo enviado: lo calificado mientras volaba la petición sigue pendiente.
  cola = cola.slice(enviadas);
  identificado = true;
  guardar();
  notificar();
  return remoto;
}

export const nivelActual = (): Perfil => nivel;

/**
 * Cambiar de nivel es **empezar otra vez desde otro sitio**: el mazo de este navegador se
 * sustituye entero por uno inventado y lo anterior no vuelve. Es la contrapartida de que exista
 * —quien vuelve sin su localStorage no tiene nada que perder— y por eso solo se ofrece sin
 * sesión: con cuenta, el mazo bueno está en Redis y no se toca desde aquí.
 */
export function elegirNivel(perfil: Perfil) {
  nivel = perfil;
  sembrado = true;
  cola = [];
  // Semilla nueva en cada elección: cincuenta países distintos, que es lo que hace que repetir
  // nivel sea un reto nuevo y no la misma partida otra vez.
  mazo = sembrar(perfil, Date.now(), String(Date.now()));
  guardar();
  vista = avanzar(mazo);
  notificar();
}

/**
 * Al cargar: se vuelca lo pendiente y **gana Redis**. En ese orden — al revés, lo calificado sin
 * cobertura lo pisaría el mazo del servidor y se perdería sin que nadie se enterase.
 */
export async function sincronizar() {
  if (sembrado) return;
  const remoto = await volcar();
  if (!remoto) return;
  mazo = remoto;
  guardar();
  vista = avanzar(remoto);
  notificar();
}

/** Devuelve el error a enseñar, o null si entró. */
export async function entrar(password: string): Promise<string | null> {
  let r: Response;
  try {
    r = await fetch(RUTA_LOGIN, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
  } catch {
    return "Sin conexión";
  }
  if (!r.ok) return ((await r.json().catch(() => ({}))) as { error?: string }).error ?? "No se pudo entrar";
  // El mazo local se juega sin cuenta y no sube: lo de esta sesión es de este navegador, y
  // quien manda a partir de ahora es Redis. Eso incluye lo sembrado: entrar deshace la siembra,
  // que si no la sesión se quedaría mirando un mazo de mentira con la cuenta abierta.
  cola = [];
  sembrado = false;
  await sincronizar();
  return null;
}

export async function salir() {
  try {
    await fetch(RUTA_LOGIN, { method: "DELETE" });
  } catch {}
  identificado = false;
  cola = [];
  guardar();
  notificar();
}
