// Test de los avisos al móvil — ejecutar con: npx tsx app/apps/observatorio/avisos.test.ts
// No es parte del build. Comprueba lo que no se ve hasta que suena el teléfono: a qué hora
// sale cada mensaje y qué dice.
import { avisosDeLaNoche, AVISO_MINUTOS, type Aviso } from "./avisos";
import { cielo, type EventoLuna, type EventoSatelite, type Satelite } from "./engine";
import { partesLocales, pasoDelEnlace } from "./marco";

let fails = 0;
function check(name: string, ok: boolean, detail = "") {
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? "  " + detail : ""}`);
  if (!ok) fails++;
}

// El mismo TLE fijo que engine.test.ts (ISS y Tiangong, 23 jul 2026): test reproducible.
const SATELITES: Satelite[] = [
  { nombre: "ISS", magEstandar: -1.8,
    tle1: "1 25544U 98067A   26204.18538858  .00009623  00000+0  18183-3 0  9993",
    tle2: "2 25544  51.6313 121.9488 0006905 328.2241  31.8329 15.49110422577336" },
  { nombre: "Tiangong", magEstandar: -0.8,
    tle1: "1 48274U 21035A   26204.03437983  .00011304  00000+0  14912-3 0  9995",
    tle2: "2 48274  41.4690 104.3124 0001739 306.7625  53.3054 15.58280026298764" },
];

// Mediodía: la hora a la que corre el cron, con el marco de la noche aún por abrir.
const AHORA = new Date("2026-07-23T10:00:00Z");
const c = cielo(SATELITES, AHORA);
const avisos = avisosDeLaNoche(c, AHORA.getTime());

// 1. Cuántos y de qué
{
  const esperados = c.pasos.length + (c.luna ? 1 : 0);
  check(`hay un aviso por evento de la noche (${avisos.length} de ${esperados})`,
    avisos.length === esperados);
  check("los planetas no generan aviso",
    c.planetas.length > 0 && !avisos.some((a) => /planeta|Marte|Venus|J[úu]piter|Saturno/i.test(a.texto)));
  check("los pasos de otras noches no se cuelan",
    !avisos.some((a) => c.proximos.some((p) => a.id.endsWith(String(p.visibleDesde)))));
}

// 2. El reloj: el aviso sale justo antes de que el objeto empiece a verse, no del tramo reportable
{
  for (const paso of c.pasos) {
    const aviso = avisos.find((a) => a.id === `${paso.nombre.toLowerCase()}-${paso.visibleDesde}`);
    check(`${paso.nombre}: el aviso sale ${AVISO_MINUTOS} min antes de verse`,
      !!aviso && aviso.sale === paso.visibleDesde - AVISO_MINUTOS * 60_000);
    check(`${paso.nombre}: la hora del texto es la de la ventana visible`,
      !!aviso && aviso.texto.includes(partesLocales(new Date(paso.visibleDesde)).hhmm));
  }
  check("ningún aviso sale antes de ahora", avisos.every((a) => a.sale > AHORA.getTime()));
  check("van en orden de salida",
    avisos.every((a, i) => i === 0 || a.sale >= avisos[i - 1].sale));
}

// 3. Lo pasado no se programa: con el reloj puesto entre dos avisos, solo quedan los de después
{
  if (avisos.length > 1) {
    const corte = avisos[0].sale + 1;
    const tarde = avisosDeLaNoche(c, corte);
    check("un aviso cuya hora ya pasó no se programa",
      tarde.length === avisos.length - 1 && !tarde.some((a) => a.id === avisos[0].id));
  } else {
    check("un aviso cuya hora ya pasó no se programa (sin datos: solo hay uno)", true, "omitido");
  }
}

// 4. El id identifica al evento, no a la ejecución: reprogramar la misma noche no duplica
{
  const otra = avisosDeLaNoche(cielo(SATELITES, new Date(AHORA.getTime() + 3600_000)), AHORA.getTime());
  check("el id de un evento no cambia entre ejecuciones",
    avisos.every((a) => otra.some((b) => b.id === a.id && b.sale === a.sale)));
  check("los ids son únicos", new Set(avisos.map((a) => a.id)).size === avisos.length);
}

// 5. La Luna: no sale dentro del marco todas las noches, así que se busca una que sí
let conLuna: { cuando: Date; avisos: Aviso[]; luna: EventoLuna } | null = null;
for (let dia = 0; dia < 30 && !conLuna; dia++) {
  const cuando = new Date(AHORA.getTime() + dia * 24 * 3600_000);
  const suCielo = cielo(SATELITES, cuando);
  if (suCielo.luna) conLuna = { cuando, avisos: avisosDeLaNoche(suCielo, cuando.getTime()), luna: suCielo.luna };
}
{
  check("hay alguna noche con salida de Luna en el marco", !!conLuna);
  if (conLuna) {
    const aviso = conLuna.avisos.find((a) => a.id === `luna-${conLuna.luna.instante}`);
    check("la Luna genera su aviso", !!aviso);
    check(`la Luna avisa ${AVISO_MINUTOS} min antes de salir`,
      !!aviso && aviso.sale === conLuna.luna.instante - AVISO_MINUTOS * 60_000);
    check("el aviso de la Luna dice por dónde sale y cuánto se ve iluminada",
      !!aviso && aviso.texto.includes(`por el ${conLuna.luna.desde}`) && /\d+% iluminada/.test(aviso.texto));
    if (aviso) console.log(`   → ${aviso.texto.replace("\n", " · ")}`);
  }
}

// 6. El mensaje
{
  check("todos llevan el enlace al observatorio",
    avisos.every((a) => a.texto.includes("https://pacr.es/apps/observatorio")));
  // El enlace de un paso abre su carta: si la vuelta no da con el paso que lo escribió, el
  // aviso deja al que sale a mirar en la portada.
  check("el enlace de cada paso señala su paso", c.pasos.every((paso) => {
    const texto = avisos.find((a) => a.id === `${paso.nombre.toLowerCase()}-${paso.visibleDesde}`)?.texto ?? "";
    const url = new URL(texto.slice(texto.lastIndexOf("https://")));
    const señal = pasoDelEnlace(url.searchParams.get("paso") ?? undefined);
    return señal?.nombre === paso.nombre.toLowerCase() && señal.visibleDesde === paso.visibleDesde;
  }));
  check("el aviso de la Luna no señala ningún paso",
    avisos.filter((a) => a.id.startsWith("luna-")).every((a) => !a.texto.includes("?paso=")));
  // El aviso llega con el evento encima: el mensaje da la hora, nunca un plazo que se queda viejo
  // en la bandeja.
  check("ninguno anuncia un plazo en minutos",
    avisos.every((a) => !/\ben \d+ min\b/.test(a.texto)));
  // Telegram corta la notificación mucho antes, pero el mensaje entero debe caber de un vistazo.
  check("ninguno pasa de 200 caracteres",
    avisos.every((a) => a.texto.length <= 200), `máx ${Math.max(0, ...avisos.map((a) => a.texto.length))}`);
  // El parse_mode es HTML: un `<` suelto rompería el envío entero con un 400.
  check("el marcado HTML está balanceado",
    avisos.every((a) => (a.texto.match(/</g) ?? []).length === (a.texto.match(/<\/|<b>/g) ?? []).length));
}

// 7. Madrid: allí no hay mar sino tejados, así que la Luna calla y solo avisan los pasos altos
{
  // Los mismos eventos, corridos a una fecha de Madrid: lo que cambia es la sede, no el cielo.
  const A_MADRID = 80 * 24 * 3600_000; // del 23 jul a mediados de octubre
  const base = c.pasos[0];
  // Dos pasos a distinta altura y a distinta hora, para que cada uno tenga su id.
  const paso = (altitud: number, minutos: number): EventoSatelite => {
    const corre = (i: number) => i + A_MADRID + minutos * 60_000;
    return { ...base, altitud,
      instante: corre(base.instante), instanteFin: corre(base.instanteFin),
      visibleDesde: corre(base.visibleDesde), visibleHasta: corre(base.visibleHasta) };
  };
  const rasante = paso(29, 0);
  const alto = paso(31, 20);
  const luna = conLuna ? { ...conLuna.luna,
    instante: conLuna.luna.instante + A_MADRID,
    instanteFin: conLuna.luna.instanteFin + A_MADRID } : null;
  const enMadrid = avisosDeLaNoche(
    { ...c, sede: "Madrid", luna, pasos: [rasante, alto] }, AHORA.getTime());
  const id = (paso: EventoSatelite) => `${paso.nombre.toLowerCase()}-${paso.visibleDesde}`;

  check("en Madrid la Luna no avisa", !!luna && !enMadrid.some((a) => a.id.startsWith("luna-")));
  check("en Madrid un paso que no llega a 30° no avisa",
    !enMadrid.some((a) => a.id === id(rasante)));
  check("en Madrid un paso que pasa de 30° sí avisa", enMadrid.some((a) => a.id === id(alto)));
  // Y en La Manga no cambia nada: el listón de 30° y el silencio de la Luna son solo de Madrid.
  const enLaManga = avisosDeLaNoche({ ...c, pasos: [{ ...base, altitud: 16 }] }, AHORA.getTime());
  check("en La Manga siguen avisando los pasos bajos",
    enLaManga.some((a) => a.id === `${base.nombre.toLowerCase()}-${base.visibleDesde}`));
}

console.log("\n— Lo que se enviaría esta noche —");
for (const aviso of avisos) {
  console.log(`${partesLocales(new Date(aviso.sale)).hhmm}  ${aviso.texto.replace("\n", " · ")}`);
}

console.log(fails === 0 ? "\nTodo OK" : `\n${fails} fallos`);
process.exit(fails === 0 ? 0 : 1);
