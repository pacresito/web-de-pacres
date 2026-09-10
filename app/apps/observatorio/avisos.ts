// Los avisos al móvil de una noche: qué se anuncia, cuándo sale el mensaje y qué dice.
// Lógica pura, sin red ni secretos — se verifica con `npx tsx avisos.test.ts`.
//
// Solo pasos de satélite y salida de Luna: los planetas están horas en el cielo y no admiten
// un aviso para salir a mirar ahora.

import { MADRID, rumbo, sedeParaFecha, type Cielo, type EventoLuna, type EventoSatelite }
  from "./engine";
import { enlaceDePaso, minutosEnMarco, MARCO_INICIO_H, partesLocales } from "./marco";

export const AVISO_MINUTOS = 1;

const OBSERVATORIO = "https://pacr.es/apps/observatorio";
const PIE = `\n${OBSERVATORIO}`;

/** Un mensaje ya redactado y el instante en que debe salir. El `id` lo fija el evento. */
export type Aviso = { sale: number; id: string; texto: string };

/** «−3,1»: signo tipográfico y coma decimal, como se lee en español. */
function numero(valor: number): string {
  return valor.toFixed(1).replace("-", "−").replace(".", ",");
}

// El aviso cuelga del arco iluminado, no del tramo reportable que lleva `instante`: es el
// instante desde el que se ve de verdad —el mismo del que tira la cuenta atrás de la web—,
// porque el satélite ya está subiendo cuando empieza. Por eso la hora sale de ahí y no de
// `hora`, que marca el otro tramo.
function dePaso(paso: EventoSatelite): Aviso {
  const entrada = paso.trayectoria.find((punto) => punto.vis);
  const porDonde = entrada ? ` Entra por el ${rumbo(entrada.az)}.` : "";
  const hora = partesLocales(new Date(paso.visibleDesde)).hhmm;
  return {
    sale: paso.visibleDesde - AVISO_MINUTOS * 60_000,
    id: `${paso.nombre.toLowerCase()}-${paso.visibleDesde}`,
    texto:
      `🛰 <b>${paso.nombre}</b> — ${hora}, magnitud ${numero(paso.magnitud)}, ` +
      `hasta ${Math.round(paso.altitud)}° sobre el horizonte.${porDonde}` +
      // El del paso no es el pie común: lleva a su carta, que es lo que se mira al salir.
      `\n${OBSERVATORIO}${enlaceDePaso(paso.nombre, paso.visibleDesde)}`,
  };
}

function deLuna(luna: EventoLuna): Aviso {
  return {
    sale: luna.instante - AVISO_MINUTOS * 60_000,
    id: `luna-${luna.instante}`,
    texto:
      `🌙 <b>Sale la Luna</b> — ${luna.hora} por el ${luna.desde}, ` +
      `${Math.round(luna.iluminacion * 100)}% iluminada.${PIE}`,
  };
}

// En Madrid el horizonte es de tejados, no el mar de La Manga: la Luna recién salida no se ve
// desde ningún sitio de la ciudad, y un satélite rasante tampoco. Allí la Luna no se anuncia y
// los pasos piden una cumbre alta — la altitud mínima general se queda corta entre edificios.
const ALTITUD_MINIMA_MADRID = 30;

// Y solo lo que cae temprano: más tarde, en Madrid, el aviso ya no saca a nadie a la calle.
// Se cuenta desde que abre el marco y no en horas del reloj: el marco cruza la medianoche, y
// un paso de las 00:30 pasaría por temprano solo porque su hora es un número pequeño.
const ULTIMA_HORA_MADRID = (20 - MARCO_INICIO_H) * 60 + 30;  // 20:30 local

const enMadrid = (instante: number) => sedeParaFecha(new Date(instante)) === MADRID;

/** Si un paso merece sacar a alguien a un patio de Madrid. En La Manga salen todos. */
function valeEnMadrid(paso: EventoSatelite): boolean {
  return paso.altitud >= ALTITUD_MINIMA_MADRID
    && (minutosEnMarco(new Date(paso.visibleDesde)) ?? Infinity) <= ULTIMA_HORA_MADRID;
}

/** Lo que hay que programar de esta noche: los avisos que aún no se han pasado de hora. */
export function avisosDeLaNoche(cielo: Cielo, ahora: number): Aviso[] {
  const luna = cielo.luna && !enMadrid(cielo.luna.instante) ? [deLuna(cielo.luna)] : [];
  const pasos = cielo.pasos.filter((paso) => !enMadrid(paso.instante) || valeEnMadrid(paso));
  return [...pasos.map(dePaso), ...luna]
    .filter((aviso) => aviso.sale > ahora)
    .sort((a, b) => a.sale - b.sale);
}
