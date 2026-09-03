// Las cuentas del árbol: cuánta gente hay, de dónde viene y qué le falta. Puro:
// `npx tsx lib/arbol/stats.test.ts`.
//
// No es una vista del árbol sino del trabajo de rellenarlo: cuánto se ha escrito, por qué
// rama y cuánto queda. Por eso está en una ruta que no se enlaza desde ninguna parte —el
// árbol es para mirar a la familia, no para mirar el árbol— y por eso todo lo que cuenta
// sale de los módulos que ya lo calculan para el lienzo: dos formas de contar lo mismo
// acabarían dando dos cifras, y la de aquí no la vigila nadie.

import { añoDe, conDia, edadEntre, escribirDiaDeMes, seLeSuponeFallecido, type Fecha } from "./fechas";
import { descendientes, visibles, type Grafo } from "./grafo";
import { aberturasDe, ENLACES, pliegueDe } from "./enlaces";
import { losIncompletos } from "./incompletos";
import { libretaDe, SIN_NOMBRE } from "./identidad";
import { calcularLayout } from "./layout";
import { comoSeLlama, etiquetaDe, type Apellidos } from "./personas";
import { calcularRamas, RAMAS } from "./ramas";

/** Un enlace de los que se reparten, con lo que se ve al abrirlo. */
export interface Centro {
  alias: string;
  id: string;
  /** Cómo se le llama en casa, con su año: es a quien abre el enlace. */
  quien: string;
  /** Lo que el lienzo pinta nada más entrar, sin abrir un solo contador. */
  desplegados: number;
  /** Y a cuánta gente se llega desde ahí abriéndolos todos. */
  alcanzables: number;
}

export interface RamaContada {
  nombre: string;
  /** Quien estrena el apellido, ya escrito: es la cabecera de la rama. */
  ancestro: string;
  gente: number;
  /** De ellos, los que además están en otra rama. */
  compartidos: number;
  /** Y a los que les queda algo que preguntar: lo que falta por rellenar de esta. */
  huecos: number;
}

/** Una generación entera, numerada desde la más antigua, que es la 1. */
export interface Generacion {
  numero: number;
  cuantos: number;
}

export interface Repetido {
  texto: string;
  cuantos: number;
}

export interface Stats {
  personas: number;
  uniones: number;
  /** Las que acabaron, que el lienzo dibuja a rayas. */
  rotas: number;
  /** A los que no se les supone fallecidos: sin fecha ninguna, se da por vivo. */
  vivos: number;
  centros: Centro[];
  ramas: RamaContada[];
  /** Cuánta gente está en más de una rama: descender de dos no es una ambigüedad que resolver. */
  enVarias: number;
  /** Quien no desciende de ningún antepasado de rama ni se casó con quien sí. */
  sinRama: number;
  generaciones: Generacion[];
  /** Lo que queda por preguntar, que es de lo que va el repaso. */
  falta: {
    conAlgo: number;
    sinNombre: number;
    sinApellido: number;
    sinNingunaFecha: number;
  };
  nombres: Repetido[];
  apellidos: Repetido[];
  /** Los que comparten nombre completo y año con otro: a quienes el árbol tiene que numerar. */
  homonimos: number;
  /** Los récords del árbol, ya escritos: cada uno con su rótulo y con quién lo tiene. */
  extremos: Extremo[];
}

/** Una fila de «Los extremos»: el rótulo y lo que se lee al lado. */
export interface Extremo {
  que: string;
  quien: string;
  /**
   * Y quiénes son, cuando el récord lo tiene un grupo. Va escrito debajo y no en un globo al
   * pasar por encima: son cuatro nombres, y en un móvil no hay puntero que pasar.
   */
  detalle?: string[];
}

/** Cuántos de cada cosa, en el orden que las pinta la página. */
const CUANTOS_REPETIDOS = 8;

export function calcularStats(g: Grafo, hoy: Fecha): Stats {
  const gente = [...g.personaPorId.values()];
  const { linaje, homonimias } = libretaDe(g);
  const nombrar = (id: string) => conAño(g, id);
  const conHuecos = losIncompletos(g, linaje, hoy);
  const pertenencias = calcularRamas(g);

  const centros = ENLACES.filter((e) => g.personaPorId.has(e.id)).map(({ alias, id }) => ({
    alias,
    id,
    quien: nombrar(id),
    // Lo que se ve al abrir el enlace, que no es lo que ve un Centro cualquiera: cada uno
    // trae lo suyo abierto y lo suyo plegado, y contar sin ellos daría una cifra que nadie ve.
    desplegados: calcularLayout(g, {
      puntoDeVista: id,
      expandidas: new Set(aberturasDe(id)),
      parejas: new Set(),
      plegados: new Set(pliegueDe(id)),
      ocultarNoConectados: true,
    }).nodos.length,
    alcanzables: visibles(g, id).size,
  }));

  const suyos = (nombre: string) => [...pertenencias].filter(([, p]) => p.ramas.includes(nombre)).map(([id]) => id);
  const ramas = RAMAS.map(({ nombre, ancestro }) => {
    const gente = suyos(nombre);
    return {
      nombre,
      ancestro: nombrar(ancestro),
      gente: gente.length,
      compartidos: gente.filter((id) => pertenencias.get(id)!.ramas.length > 1).length,
      huecos: gente.filter((id) => conHuecos.has(id)).length,
    };
  });

  // La generación se numera desde la más antigua: en el dato es un entero relativo que no
  // significa nada por su cuenta —crece hacia los hijos y arranca donde arrancara el recorrido—.
  const porNivel = new Map<number, number>();
  for (const nivel of g.generacion.values()) porNivel.set(nivel, (porNivel.get(nivel) ?? 0) + 1);
  const niveles = [...porNivel.keys()].sort((a, b) => a - b);
  const generaciones = niveles.map((nivel, i) => ({ numero: i + 1, cuantos: porNivel.get(nivel)! }));


  return {
    personas: gente.length,
    uniones: g.unionPorId.size,
    rotas: [...g.unionPorId.values()].filter((u) => u.roto).length,
    vivos: gente.filter((p) => !p.death && !seLeSuponeFallecido(p, hoy)).length,
    centros,
    ramas,
    enVarias: [...pertenencias.values()].filter((p) => p.ramas.length > 1).length,
    sinRama: gente.filter((p) => !pertenencias.has(p.id)).length,
    generaciones,
    falta: {
      conAlgo: conHuecos.size,
      sinNombre: gente.filter((p) => p.nombre === SIN_NOMBRE).length,
      sinApellido: gente.filter((p) => linaje.get(p.id)!.todos.length === 0).length,
      sinNingunaFecha: gente.filter((p) => !p.birth && !p.death).length,
    },
    nombres: masRepetidos(gente.filter((p) => p.nombre !== SIN_NOMBRE).map((p) => p.nombre)),
    apellidos: masRepetidos(gente.flatMap((p) => linaje.get(p.id)!.todos)),
    homonimos: homonimias.size,
    extremos: extremosDe(g, linaje),
  };
}

/**
 * Los récords, escritos aquí y no en la página: son ocho maneras distintas de mirar la misma
 * lista y ninguna es un dato del árbol, así que quien las pinta solo tiene que ponerlas en
 * fila. **El que no tenga a nadie no sale**: una fila que dice «—» ocupa lo mismo que una
 * que cuenta algo.
 */
function extremosDe(g: Grafo, linaje: Map<string, Apellidos>): Extremo[] {
  const gente = [...g.personaPorId.values()];
  const nombrar = (id: string) => conApellidoYAño(g, linaje, id);
  const elMayor = <T>(cosas: T[], valor: (x: T) => number | null): T | undefined =>
    cosas.reduce<{ x: T; v: number } | undefined>((mejor, x) => {
      const v = valor(x);
      return v !== null && (!mejor || v > mejor.v) ? { x, v } : mejor;
    }, undefined)?.x;

  const familia = elMayor([...g.unionPorId.values()], (u) => u.children.length);
  const prolifico = elMayor(gente, (p) => descendientes(g, p.id).size);
  const primero = elMayor(gente, (p) => (p.birth ? -añoDe(p.birth) : null));
  const ultimo = elMayor(gente, (p) => (p.birth ? enOrden(p.birth) : null));
  const longevo = elMayor(gente, (p) => (p.birth && p.death ? edadEntre(p.birth, p.death) : null));
  const año = masRepetidos(gente.filter((p) => p.birth).map((p) => añoDe(p.birth as Fecha).toString()), 1)[0];
  // El día se cuenta con su gente y no solo con su cifra: es el único récord que tienen varios
  // a la vez, y decir «4 personas» sin decir cuáles es no haber contestado.
  const cumples = new Map<string, string[]>();
  for (const p of gente) {
    if (!p.birth || !conDia(p.birth)) continue;
    const cuando = escribirDiaDeMes(p.birth);
    cumples.set(cuando, [...(cumples.get(cuando) ?? []), p.id]);
  }
  const dia = elMayor([...cumples], ([, quienes]) => quienes.length);

  const filas: (Extremo | null)[] = [
    familia ? { que: "La familia más numerosa", quien: `${familia.partners.map(nombrar).join(" y ")}: ${familia.children.length} hijos` } : null,
    prolifico ? { que: "Quien más descendencia deja", quien: `${nombrar(prolifico.id)}: ${descendientes(g, prolifico.id).size} personas` } : null,
    primero ? { que: "El nacimiento más antiguo que consta", quien: nombrar(primero.id) } : null,
    ultimo ? { que: "El último en llegar", quien: nombrar(ultimo.id) } : null,
    longevo && longevo.birth && longevo.death
      ? { que: "La vida más larga que consta", quien: `${nombrar(longevo.id)}: ${edadEntre(longevo.birth, longevo.death)} años` }
      : null,
    año ? { que: "El año en que más gente nació", quien: `${año.texto}: ${año.cuantos} nacimientos` } : null,
    dia
      ? {
          que: "El día del año con más cumpleaños",
          quien: `${dia[0]}: ${dia[1].length} personas`,
          detalle: [...dia[1]].sort(porNacimiento(g)).map(nombrar),
        }
      : null,
  ];
  return filas.filter((f): f is Extremo => f !== null);
}

/** Del mayor al menor, que es el único orden que una lista de gente trae puesto. */
const porNacimiento = (g: Grafo) => (a: string, b: string) =>
  enOrden(g.personaPorId.get(a)!.birth!) - enOrden(g.personaPorId.get(b)!.birth!);

/** Una fecha como número, para poder compararlas: `2015-07` cuenta como el 1 de julio. */
const enOrden = (f: Fecha): number => Number(`${f.slice(0, 4)}${f.slice(5, 7) || "01"}${f.slice(8, 10) || "01"}`);

/**
 * Cómo se nombra a alguien en una tabla que ya dice de qué familia habla: el de casa y el año.
 * El apellido lo lleva la columna de al lado —el enlace, la rama—, y repetirlo en cada fila es
 * escribirlo dos veces.
 */
function conAño(g: Grafo, id: string): string {
  const p = g.personaPorId.get(id)!;
  const nombre = comoSeLlama(p, "familiar");
  return p.birth ? `${nombre} (${p.birth.slice(0, 4)})` : nombre;
}

/**
 * Y cómo se nombra donde no hay columna que lo diga: **con su primer apellido**. Los extremos
 * sacan a gente de cualquier rincón del árbol, y ahí «José (1888)» no dice de quién se habla.
 */
function conApellidoYAño(g: Grafo, linaje: Map<string, Apellidos>, id: string): string {
  const p = g.personaPorId.get(id)!;
  const nombre = etiquetaDe(p, 1, linaje.get(id)!, "familiar").texto;
  return p.birth ? `${nombre} (${p.birth.slice(0, 4)})` : nombre;
}

/**
 * Los que más se repiten, de más a menos y con el alfabeto para desempatar: sin él el orden
 * lo decidiría el de los datos, y dos cifras iguales bailarían de sitio al añadir gente.
 */
function masRepetidos(textos: string[], cuantos = CUANTOS_REPETIDOS): Repetido[] {
  const cuenta = new Map<string, number>();
  for (const texto of textos) cuenta.set(texto, (cuenta.get(texto) ?? 0) + 1);
  return [...cuenta]
    .map(([texto, cuantos]) => ({ texto, cuantos }))
    .sort((a, b) => b.cuantos - a.cuantos || a.texto.localeCompare(b.texto, "es"))
    .slice(0, cuantos);
}
