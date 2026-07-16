// Fase 2 del motor (briefing §4B): puntúa las candidatas por afinidad con el perfil.
// La puntuación ORDENA el listado, nunca decide si un destino aparece (eso fue la Fase 1).
// Proximidad, combinabilidad y horas de luz NO se puntúan aquí: son relacionales (dependen
// del itinerario) y las resuelve el planificador al repartir en días; esto es perfil↔destino.
import type { Destino } from "../tipos";
import { nivelesDificultad } from "../filtrar";
import type { Candidata, Perfil } from "./tipos";
import { PESOS, type Pesos } from "./pesos";

// Nº de valores que comparten dos listas (0 si falta alguna).
const solapa = (tiene: string[] | undefined, quiere: string[] | undefined): number =>
  tiene && quiere ? tiene.filter((v) => quiere.includes(v)).length : 0;

export function puntuar(destinos: Destino[], p: Perfil, pesos: Pesos = PESOS): Candidata[] {
  const candidatas = destinos.map((d) => puntuarUno(d, p, pesos));
  // Orden estable: por puntos desc; a igualdad, el favorito de Cris antes y luego por slug.
  return candidatas.sort(
    (a, b) =>
      b.puntos - a.puntos ||
      Number(b.destino.favoritoDeCris ?? false) - Number(a.destino.favoritoDeCris ?? false) ||
      a.destino.slug.localeCompare(b.destino.slug),
  );
}

function puntuarUno(d: Destino, p: Perfil, w: Pesos): Candidata {
  const motivos: string[] = [];
  let puntos = 0;
  const suma = (n: number, motivo: string) => {
    if (n > 0) {
      puntos += n;
      motivos.push(motivo);
    }
  };

  suma(solapa(d.paisaje, p.paisajes) * w.paisaje, "paisaje");
  suma(solapa(d.experiencia, p.experiencias) * w.experiencia, "experiencia");
  if (p.tipos?.includes(d.tipo)) suma(w.tipo, "tipo");
  if (p.dificultades?.length && solapa(nivelesDificultad(d.dificultad), p.dificultades) > 0) suma(w.dificultad, "dificultad");
  if (solapa(d.epoca, p.epoca) > 0) suma(w.epoca, "época");
  if (p.quiereBano && d.bano === true) suma(w.bano, "baño");
  if (p.imprescindibles?.includes(d.slug)) suma(w.imprescindible, "imprescindible");
  if (d.favoritoDeCris) suma(w.favoritoDeCris, "favorito de Cris");

  return { destino: d, puntos, motivos };
}
