// Los avisos al móvil de una noche: qué se anuncia, cuándo sale el mensaje y qué dice.
// Lógica pura, sin red ni secretos — se verifica con `npx tsx avisos.test.ts`.
//
// Solo pasos de satélite y salida de Luna: los planetas están horas en el cielo y no admiten
// un aviso para salir a mirar ahora.

import { rumbo, type Cielo, type EventoLuna, type EventoSatelite } from "./engine";
import { enlaceDePaso, partesLocales } from "./marco";

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

/** Lo que hay que programar de esta noche: los avisos que aún no se han pasado de hora. */
export function avisosDeLaNoche(cielo: Cielo, ahora: number): Aviso[] {
  const luna = cielo.luna ? [deLuna(cielo.luna)] : [];
  return [...cielo.pasos.map(dePaso), ...luna]
    .filter((aviso) => aviso.sale > ahora)
    .sort((a, b) => a.sale - b.sale);
}
