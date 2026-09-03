// De dónde sale el Centro con el que se entra: el enlace con el que se reparte el árbol
// —`/arbol?centro=Velasco`— y, a falta de él, lo que recuerde el dispositivo del último.
// Lo de arriba es puro y se verifica: `npx tsx lib/arbol/enlaces.test.ts`.
//
// El árbol se manda por WhatsApp, así que el enlace tiene que poder leerse y escribirse a mano;
// `p395` no cumple ninguna de las dos. Los alias los escribo yo y no salen del JSON: los segundos
// apellidos con los que se nombra a esta gente están deducidos del árbol, no escritos en el dato.
//
// **Alias de rama, no de persona.** El repo es público: un alias lleva apellido de familia, que no
// dice quién es nadie. Los personales van con el nombre de pila y nada más.
//
// **Cada id lleva al lado con quién tiene que seguir cuadrando**, y el test lo comprueba. Los ids
// salen de un JSON que se regenera, y un enlace que cambiara de dueño en silencio no se descubre:
// ya está repartido, y quien lo abre no sabe a quién esperaba ver. El año está para desempatar a
// los que se llaman igual —hay tres José Maestre—.

export interface Enlace {
  alias: string;
  id: string;
  nombre: string;
  /**
   * Año de nacimiento, que es lo que distingue a un homónimo de otro. Vacío en quien no
   * trae ninguno: entonces el enlace se apoya solo en el nombre, que sigue delatando al id
   * que cambiara de dueño hacia alguien con año.
   */
  nace: string;
  /**
   * Uniones que llegan ya desplegadas, además de lo que trae cualquier Centro. Un Centro
   * enseña su línea directa y esconde lo colateral tras contadores, y a veces la familia
   * de al lado es justo lo que el enlace viene a enseñar.
   */
  abre?: Apertura[];
  /**
   * Y de quién **no** se despliega la descendencia, que llega tras su contador. Es para la
   * rama que se desgaja y tiene enlace propio: sin esto, entrar por el patriarca de una
   * abre de golpe las dos.
   */
  pliega?: Pliegue[];
}

/** Una unión que el enlace despliega, con quiénes son: el test comprueba que siguen siéndolo. */
export interface Apertura {
  union: string;
  quienes: string;
}

/** Y una descendencia que llega plegada, con de quién es. */
export interface Pliegue {
  id: string;
  nombre: string;
}

export const ENLACES: Enlace[] = [
  { alias: "Crespo", id: "p84", nombre: "Vicente", nace: "1900" },
  { alias: "Castrillo", id: "p81", nombre: "Ambrosio", nace: "1883" },
  // Centrado en el patriarca, con los Maestre plegados: son 68 personas que tienen su propio
  // enlace, y sin plegarlas la entrada de los Velasco es la de las dos ramas a la vez.
  { alias: "Velasco", id: "p271", nombre: "José", nace: "1888", pliega: [{ id: "p289", nombre: "José" }] },
  { alias: "Maestre", id: "p289", nombre: "José", nace: "1914" },
  { alias: "Perez", id: "p466", nombre: "Francisco", nace: "1883" },
  // Centrado en José Alberto y no en su padre: es el único que es sangre de las dos casas, y
  // desde cualquier otro los Oreja son familia política y el filtro los corta. Lo que abre son
  // las cuatro uniones que un Centro deja en contadores: los hermanos de arriba y los suyos.
  {
    alias: "Bordallo",
    id: "p22",
    nombre: "José Alberto",
    nace: "1953",
    abre: [
      { union: "u327", quienes: "Alberto Bordallo y Teresa Campos" },
      { union: "u330", quienes: "José Oreja Elvira y Adoración Vicente Vallejo" },
      { union: "u331", quienes: "Adoración Oreja Vicente y Jesús Lobato Lobo" },
      { union: "u332", quienes: "Alberto Bordallo Campos y María del Carmen Oreja Vicente" },
    ],
  },
  { alias: "Cardona", id: "p3", nombre: "José Gerardo", nace: "1912" },
  { alias: "Sala", id: "p442", nombre: "Pepe", nace: "1942" },
  { alias: "Pablo", id: "p25", nombre: "Pablo", nace: "1986" },
  { alias: "Carmen", id: "p24", nombre: "Carmen", nace: "1989" },
  { alias: "Jara", id: "p134", nombre: "Jara", nace: "2012" },
  { alias: "Nora", id: "p130", nombre: "Nora", nace: "2023" },
];

/**
 * Lo que el enlace enseña de más y de menos, **mientras el Centro sea el suyo**: mudarlo es
 * mirar desde otro sitio, y ahí manda lo que se haya abierto a mano. Quien entra sin enlace
 * —por lo que recuerde el dispositivo o por el de casa— entra igual por aquí: el retoque es
 * de la persona por la que se entra, no de la URL que se tecleó.
 */
export const aberturasDe = (id: string | null): string[] =>
  ENLACES.find((e) => e.id === id)?.abre?.map((a) => a.union) ?? [];

export const pliegueDe = (id: string | null): string[] =>
  ENLACES.find((e) => e.id === id)?.pliega?.map((p) => p.id) ?? [];

/**
 * A quién centra un `?centro=`. Los alias no distinguen mayúsculas —se teclean de memoria— y lo
 * que no sea uno se toma por un id, que es como se reparte a quien no tiene alias. Si tampoco
 * existe, quien lo abra arranca por donde arrancaría sin enlace: un enlace roto no es una pantalla
 * de error, es un enlace que no dice nada.
 */
export function centroDeEnlace(valor: string | null | undefined): string | null {
  const pedido = valor?.trim();
  if (!pedido) return null;
  const alias = ENLACES.find((e) => e.alias.toLowerCase() === pedido.toLowerCase());
  return alias?.id ?? pedido;
}

// Lo que recuerda el dispositivo (sin test: es el navegador, no hay lógica que verificar)

const CLAVE = "pacres-arbol-centro";

/**
 * El centro del último enlace que se abrió aquí, que es por donde entra quien vuelve sin él. **Se
 * guarda el del enlace y no el que se mude paseando**: si no, volver al punto de vista de entrada
 * acabaría llevando a la última persona que alguien miró de refilón.
 */
export function centroRecordado(): string | null {
  try {
    return localStorage.getItem(CLAVE);
  } catch {
    return null;
  }
}

export function recordarCentro(id: string): void {
  try {
    localStorage.setItem(CLAVE, id);
  } catch {
    // Sin sitio donde guardarlo se entra igual: es un atajo para la próxima visita, no un dato.
  }
}
