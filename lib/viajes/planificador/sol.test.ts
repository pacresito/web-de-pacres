// Test de lógica pura: `npx tsx lib/viajes/planificador/sol.test.ts`. Fuera del build.
import assert from "assert";
import { horasDeLuz } from "./sol";

// Pamplona (referencia: centro de Navarra).
const LAT = 42.81, LON = -1.65;
const hhmm = (min: number) => `${String((min / 60) | 0).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

// La duración del día depende solo de latitud y fecha (no de tz ni longitud): es la
// comprobación fuerte. A 42.8°N el solsticio de verano ronda 15h10 y el de invierno 9h10.
const verano = horasDeLuz(new Date(Date.UTC(2026, 5, 21, 12)), LAT, LON);
const invierno = horasDeLuz(new Date(Date.UTC(2026, 11, 21, 12)), LAT, LON);
const equinoccio = horasDeLuz(new Date(Date.UTC(2026, 2, 20, 12)), LAT, LON);

assert.ok(Math.abs(verano.minutosLuz - 909) <= 12, `día de verano ~15h09, es ${hhmm(verano.minutosLuz)}`);
assert.ok(Math.abs(invierno.minutosLuz - 551) <= 12, `día de invierno ~9h11, es ${hhmm(invierno.minutosLuz)}`);
assert.ok(Math.abs(equinoccio.minutosLuz - 720) <= 15, `equinoccio ~12h, es ${hhmm(equinoccio.minutosLuz)}`);
assert.ok(verano.minutosLuz > invierno.minutosLuz, "el día de verano dura más que el de invierno");

// Hora de reloj: rangos amplios que solo fallan con un error de signo en tz/longitud.
// En verano España va en CEST (+2): amanece tarde de reloj, anochece muy tarde.
assert.ok(verano.amanecer > 5 * 60 && verano.amanecer < 7 * 60, `amanecer verano 05–07h, es ${hhmm(verano.amanecer)}`);
assert.ok(verano.atardecer > 21 * 60 && verano.atardecer < 22 * 60 + 30, `atardecer verano 21–22:30h, es ${hhmm(verano.atardecer)}`);
assert.ok(invierno.amanecer > 8 * 60 && invierno.amanecer < 9 * 60, `amanecer invierno 08–09h, es ${hhmm(invierno.amanecer)}`);
assert.ok(invierno.atardecer > 17 * 60 && invierno.atardecer < 18 * 60, `atardecer invierno 17–18h, es ${hhmm(invierno.atardecer)}`);
assert.ok(verano.amanecer < verano.atardecer, "amanecer antes que atardecer");

console.log(`OK sol.test.ts | verano ${hhmm(verano.amanecer)}–${hhmm(verano.atardecer)} (${hhmm(verano.minutosLuz)}) · invierno ${hhmm(invierno.amanecer)}–${hhmm(invierno.atardecer)} (${hhmm(invierno.minutosLuz)})`);
