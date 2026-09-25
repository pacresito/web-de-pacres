// Fase 2: puntúa las candidatas por afinidad con el perfil. Ordena, nunca elimina.
// Lo relacional (cercanía, horas de luz) no va aquí: lo resuelve el reparto en días.
import type { Destino } from "../tipos";
import { nivelesDificultad } from "../filtrar";
import type { Candidata, Perfil } from "./tipos";
import { PESOS, type Pesos } from "./pesos";

// Cuántos valores comparten: dos paisajes que encajan valen más que uno.
const cuantosSolapan = (tiene: string[] | undefined, quiere: string[] | undefined): number =>
  tiene && quiere ? tiene.filter((v) => quiere.includes(v)).length : 0;

export function puntuar(destinos: Destino[], p: Perfil, pesos: Pesos = PESOS): Candidata[] {
  return destinos
    .map((d) => ({ destino: d, puntos: puntos(d, p, pesos) }))
    .sort(
      (a, b) =>
        b.puntos - a.puntos ||
        Number(b.destino.favoritoDeCris ?? false) - Number(a.destino.favoritoDeCris ?? false) ||
        a.destino.slug.localeCompare(b.destino.slug),
    );
}

function puntos(d: Destino, p: Perfil, w: Pesos): number {
  let n = cuantosSolapan(d.paisaje, p.paisajes) * w.paisaje;
  n += cuantosSolapan(d.experiencia, p.experiencias) * w.experiencia;
  if (p.tipos?.includes(d.tipo)) n += w.tipo;
  if (cuantosSolapan(nivelesDificultad(d.dificultad), p.dificultades) > 0) n += w.dificultad;
  if (cuantosSolapan(d.epoca, p.epoca) > 0) n += w.epoca;
  if (p.quiereBano && d.bano === true) n += w.bano;
  if (p.imprescindibles?.includes(d.slug)) n += w.imprescindible;
  if (d.favoritoDeCris) n += w.favoritoDeCris;
  return n;
}
