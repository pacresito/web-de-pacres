// Quiénes salen en una foto, con su nombre entero, la edad que tenían y dónde está su cara.
// Puro: `npx tsx lib/arbol/retratados.test.ts`.
//
// Vive aparte de `fotos.ts` porque necesita el árbol: la lista de fotos solo guarda ids y
// recuadros —es lo único que no se puede deducir—, y el nombre y la edad salen del documento,
// que es donde ya están escritos y donde se corrigen.
//
// **Solo se rotula a quien está en el árbol.** En una foto de 1962 hay vecinos, y decir «no
// consta» sobre una cara es peor que no decir nada: la foto se mira igual y quien falte se
// añade el día que se sepa quién es.

import { edadEntre, type Fecha } from "./fechas";
import { fotoDe, type Recuadro } from "./fotos";
import type { Grafo } from "./grafo";
import { comoSeLlama, type Apellidos, type ModoNombre } from "./personas";
import type { Persona } from "./tree";

export interface Retratado {
  id: string;
  /** Su nombre con los apellidos, como en la cabecera de su ficha. */
  nombre: string;
  /** Cómo se le llama en casa: lo único que cabe rotulado sobre una cara. */
  corto: string;
  /** Los años que tenía: «16 años», o vacío si no consta el nacimiento. */
  edad: string;
  /** Dónde está su cara, en fracciones del ancho de la foto. */
  recuadro: Recuadro;
}

export interface OpcionesRetratados {
  nombre: ModoNombre;
  linaje: Map<string, Apellidos>;
}

/**
 * Los de esa foto, **en el orden en que se les ve**: de arriba abajo y de izquierda a derecha,
 * que es como se lee una foto de grupo y como se la cuenta en voz alta. El orden en que están
 * escritos en la lista es el orden en que se fueron reconociendo, y no significa nada.
 */
export function retratadosEn(g: Grafo, clave: string, o: OpcionesRetratados): Retratado[] {
  const foto = fotoDe(clave);
  // **En la de uno no hay a quién reconocer.** Su recuadro es para el marco de su ficha, no
  // para rotularse a sí mismo encima de su propia cara y ofrecer la ficha desde la que se
  // acaba de abrir la foto.
  if (!foto || foto.gente.length < 2) return [];
  return foto.gente
    .flatMap((quien) => {
      const p = g.personaPorId.get(quien.id);
      if (!p) return [];
      return [
        {
          id: quien.id,
          nombre: [comoSeLlama(p, o.nombre), ...(o.linaje.get(quien.id)?.todos ?? [])].join(" "),
          corto: comoSeLlama(p, o.nombre),
          edad: edadEn(p, foto.tomada),
          recuadro: quien.recuadro,
        },
      ];
    })
    .sort((a, b) => a.recuadro.y - b.recuadro.y || a.recuadro.x - b.recuadro.x);
}

/**
 * La edad que tenía cuando se hizo la foto. **Con solo el año puede fallar por uno** —como en
 * todo el árbol—, y por eso se escribe redonda y sin fingir precisión: «16 años», no «16 años
 * y 3 meses». Al que aún no había cumplido uno no se le dice «0 años», que no lo dice nadie,
 * sino «bebé», como en el enlace de su ficha: «recién nacido» presumiría del día que no se sabe.
 */
function edadEn(p: Persona, tomada: Fecha): string {
  if (!p.birth) return "";
  const edad = edadEntre(p.birth, tomada);
  if (edad === 0) return "bebé";
  return `${edad} ${edad === 1 ? "año" : "años"}`;
}
