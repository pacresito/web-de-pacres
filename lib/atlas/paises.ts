// Los datos curados de Atlas: una fila por país, revisada a mano. Es la única fuente de
// verdad de nombres y capitales — el resto (formas, orden del barrido) se genera a partir
// de aquí. Fase 1: diez países elegidos para romper cosas; ver
// WEB/plans/2026-08-21-plan-atlas-fase-1.md.
//
// `nombre` es el común en español, el que se diría en voz alta, y es el único que se
// pregunta: como la calificación es autoinforme, no hay corrector al que satisfacer y una
// segunda forma solo añade ruido. `oficial` solo se muestra en la ficha de explorar.

export type Continente =
  | "África"
  | "América del Norte"
  | "América del Sur"
  | "Asia"
  | "Europa"
  | "Oceanía";

export type Pais = {
  id: string; // ISO 3166-1 alfa-2, en minúsculas: clave de todo y nombre del SVG de bandera
  nombre: string;
  oficial: string;
  capital: string;
  continente: Continente;
  subregion: string;
  km2: number; // solo para la ficha; el escalón de zoom sale de la forma, no de aquí
};

export const PAISES: Pais[] = [
  { id: "es", nombre: "España",    oficial: "Reino de España",        capital: "Madrid",   continente: "Europa",           subregion: "Europa del Sur",       km2: 505_990 },
  { id: "fr", nombre: "Francia",   oficial: "República Francesa",     capital: "París",    continente: "Europa",           subregion: "Europa Occidental",    km2: 551_695 },
  { id: "pt", nombre: "Portugal",  oficial: "República Portuguesa",   capital: "Lisboa",   continente: "Europa",           subregion: "Europa del Sur",       km2: 92_212 },
  { id: "it", nombre: "Italia",    oficial: "República Italiana",     capital: "Roma",     continente: "Europa",           subregion: "Europa del Sur",       km2: 302_073 },
  { id: "ma", nombre: "Marruecos", oficial: "Reino de Marruecos",     capital: "Rabat",    continente: "África",           subregion: "África del Norte",     km2: 446_550 },
  { id: "ru", nombre: "Rusia",     oficial: "Federación de Rusia",    capital: "Moscú",    continente: "Europa",           subregion: "Europa Oriental",      km2: 17_098_246 },
  { id: "no", nombre: "Noruega",   oficial: "Reino de Noruega",       capital: "Oslo",     continente: "Europa",           subregion: "Europa del Norte",     km2: 323_802 },
  { id: "mt", nombre: "Malta",     oficial: "República de Malta",     capital: "La Valeta", continente: "Europa",          subregion: "Europa del Sur",       km2: 316 },
  { id: "mc", nombre: "Mónaco",    oficial: "Principado de Mónaco",   capital: "Mónaco",   continente: "Europa",           subregion: "Europa Occidental",    km2: 2.08 },
  { id: "cl", nombre: "Chile",     oficial: "República de Chile",     capital: "Santiago", continente: "América del Sur",  subregion: "Sudamérica",           km2: 756_102 },
];

export const PAIS_POR_ID = new Map(PAISES.map((p) => [p.id, p]));
