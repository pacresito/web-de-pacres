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
}

export const ENLACES: Enlace[] = [
  { alias: "Velasco", id: "p395", nombre: "José", nace: "1921" },
  { alias: "Crespo", id: "p84", nombre: "Vicente", nace: "1900" },
  { alias: "Maestre", id: "p289", nombre: "José", nace: "1914" },
  { alias: "Perez", id: "p466", nombre: "Francisco", nace: "" },
  { alias: "Cardona", id: "p21", nombre: "María de los Ángeles", nace: "1955" },
  { alias: "Sala", id: "p442", nombre: "Pepe", nace: "1942" },
  { alias: "Castrillo", id: "p81", nombre: "Ambrosio", nace: "1883" },
  { alias: "Pablo", id: "p25", nombre: "Pablo", nace: "1986" },
  { alias: "Carmen", id: "p24", nombre: "Carmen", nace: "1989" },
  { alias: "Jara", id: "p134", nombre: "Jara", nace: "2012" },
  { alias: "Nora", id: "p130", nombre: "Nora", nace: "2023" },
];

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
