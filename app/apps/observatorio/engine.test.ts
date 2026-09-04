// Test del motor del Observatorio — ejecutar con: npx tsx app/apps/observatorio/engine.test.ts
// No es parte del build. Verifica la astronomía sin navegador: los criterios de
// visibilidad se comprueban como invariantes sobre eventos reales (TLE fijo abajo).
import * as Astro from "astronomy-engine";
import {
  sedeParaFecha, rumbo, magnitudSatelite, umbralSolar,
  pasosVisibles, salidasDeLuna, tablaPlanetas, cielo,
  ALTITUD_MINIMA, MAGNITUD_MAXIMA, MARGEN_MINUTOS,
  type Satelite,
} from "./engine";
import { MARCO_MINUTOS, minutosEnMarco, partesLocales } from "./marco";

let fails = 0;
function check(name: string, ok: boolean, detail = "") {
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? "  " + detail : ""}`);
  if (!ok) fails++;
}

// TLE fijo (ISS y Tiangong, 23 jul 2026) para que el test sea reproducible.
const SATELITES: Satelite[] = [
  { nombre: "ISS", magEstandar: -1.8,
    tle1: "1 25544U 98067A   26204.18538858  .00009623  00000+0  18183-3 0  9993",
    tle2: "2 25544  51.6313 121.9488 0006905 328.2241  31.8329 15.49110422577336" },
  { nombre: "Tiangong", magEstandar: -0.8,
    tle1: "1 48274U 21035A   26204.03437983  .00011304  00000+0  14912-3 0  9995",
    tle2: "2 48274  41.4690 104.3124 0001739 306.7625  53.3054 15.58280026298764" },
];
const AHORA = new Date("2026-07-23T12:00:00Z");
const HASTA = new Date(AHORA.getTime() + 7 * 24 * 3600 * 1000);

// 1. Sedes por calendario
{
  const sede = (iso: string) => sedeParaFecha(new Date(iso)).nombre;
  check("sede: 15 julio → La Manga", sede("2026-07-15T22:00:00Z") === "La Manga");
  check("sede: 20 junio → La Manga (primer día)", sede("2026-06-20T22:00:00Z") === "La Manga");
  check("sede: 19 junio → Madrid (víspera)", sede("2026-06-19T18:00:00Z") === "Madrid");
  check("sede: 5 sept → La Manga (último día)", sede("2026-09-05T20:00:00Z") === "La Manga");
  check("sede: 6 sept → Madrid", sede("2026-09-06T20:00:00Z") === "Madrid");
  check("sede: 25 dic → La Manga", sede("2026-12-25T21:00:00Z") === "La Manga");
  check("sede: 7 enero → La Manga (último día)", sede("2026-01-07T21:00:00Z") === "La Manga");
  check("sede: 8 enero → Madrid", sede("2026-01-08T21:00:00Z") === "Madrid");
  check("sede: 1 marzo → Madrid", sede("2026-03-01T21:00:00Z") === "Madrid");
}

// 2. Hora local: el cambio de hora se aplica de verdad
{
  check("local: verano = UTC+2", partesLocales(new Date("2026-07-23T20:30:00Z")).hhmm === "22:30");
  check("local: invierno = UTC+1", partesLocales(new Date("2026-01-15T20:30:00Z")).hhmm === "21:30");
}

// 3. Magnitud del satélite
{
  const FASE_MEDIA = Math.PI / 2;
  check("magnitud: en condiciones estándar devuelve la magnitud estándar",
    Math.abs(magnitudSatelite(-1.8, 1000, FASE_MEDIA) - (-1.8)) < 1e-9);
  check("magnitud: el doble de lejos = 1.5 mag más débil",
    Math.abs(magnitudSatelite(-1.8, 2000, FASE_MEDIA) - magnitudSatelite(-1.8, 1000, FASE_MEDIA) - 1.505) < 0.01);
  check("magnitud: de frente al Sol brilla más que de perfil",
    magnitudSatelite(-1.8, 500, 0.3) < magnitudSatelite(-1.8, 500, FASE_MEDIA));
  check("magnitud: casi a contraluz apenas brilla",
    magnitudSatelite(-1.8, 500, 2.9) > 2);
  check("umbral: cuanto más brilla un astro, menos crepúsculo pide",
    umbralSolar(-4.3) > umbralSolar(-1.8) && umbralSolar(-1.8) > umbralSolar(0.5));
  check("umbral: Venus se ve antes del ocaso y Saturno bien entrado el crepúsculo",
    Math.abs(umbralSolar(-4.3) - 0.45) < 1e-9 && Math.abs(umbralSolar(0.5) - -6.75) < 1e-9);
  check("umbral: sin acotar, Venus pide el Sol aún alto y el más débil no llega al náutico",
    umbralSolar(-4.9) > 0 && umbralSolar(1.9) > -12);
}

// 4. Rumbos
{
  check("rumbo: 0° = N", rumbo(0) === "N");
  check("rumbo: 90° = E", rumbo(90) === "E");
  check("rumbo: 247.5° = OSO", rumbo(247.5) === "OSO");
  check("rumbo: 350° vuelve a N", rumbo(350) === "N");
}

// 5. Pasos de satélite: los criterios se cumplen en todos los devueltos
{
  const pasos = SATELITES.flatMap((s) => pasosVisibles(s, AHORA, HASTA));
  console.log(`  … ${pasos.length} pasos en 7 días`);
  check("pasos: hay alguno en una semana", pasos.length > 0);
  check("pasos: todos por encima de la altitud mínima",
    pasos.every((p) => p.altitud >= ALTITUD_MINIMA));
  check("pasos: todos más brillantes que el corte de magnitud",
    pasos.every((p) => p.magnitud <= MAGNITUD_MAXIMA));
  check("pasos: ninguno de madrugada",
    pasos.every((p) => +p.hora.slice(0, 2) >= 12));
  check("pasos: duración plausible (≤ 8 min sobre 15°)",
    pasos.every((p) => p.duracionMin >= 1 && p.duracionMin <= 8));
  check("pasos: la ISS es la que más aparece",
    pasos.filter((p) => p.nombre === "ISS").length >= pasos.filter((p) => p.nombre === "Tiangong").length);
  check("pasos: cada uno trae su arco (≥ 2 puntos, todos sobre el horizonte)",
    pasos.every((p) => p.trayectoria.length >= 2 && p.trayectoria.every((q) => q.alt >= 0)));
  check("pasos: el arco cubre la parte visible reportada (alcanza la cumbre)",
    pasos.every((p) => Math.max(...p.trayectoria.map((q) => q.alt)) >= p.altitud - 0.01));
}

// 6. Salidas de Luna
{
  const lunas = salidasDeLuna(AHORA, HASTA);
  console.log(`  … ${lunas.length} salidas de Luna en ventana`);
  check("luna: todas dentro del marco de la noche",
    lunas.every((l) => minutosEnMarco(new Date(l.instante)) !== null));
  check("luna: la salida del 28 jul 2026 queda marcada como con-luz (Sol a +3°, observado)",
    salidasDeLuna(new Date("2026-07-28T12:00:00Z"), new Date("2026-07-29T00:00:00Z"))
      .every((l) => !l.aOscuras));
  check("luna: la del 29 jul 2026 sí sale a oscuras (Sol a −2,9°)",
    salidasDeLuna(new Date("2026-07-29T12:00:00Z"), new Date("2026-07-30T00:00:00Z"))
      .every((l) => l.aOscuras));
  check("luna: en la salida está pegada al horizonte", lunas.every((l) => {
    const obs = new Astro.Observer(37.66, -0.72, 0);
    const t = new Date(l.instante);
    const eq = Astro.Equator(Astro.Body.Moon, t, obs, true, true);
    return Math.abs(Astro.Horizon(t, obs, eq.ra, eq.dec, "normal").altitude) < 1;
  }));
  check("luna: iluminación entre 0 y 1", lunas.every((l) => l.iluminacion >= 0 && l.iluminacion <= 1));
  check("luna: sale por el cuadrante este", lunas.every((l) => l.azimut > 40 && l.azimut < 140));
}

// 7. Tabla de planetas
{
  const tabla = tablaPlanetas(AHORA);
  console.log(`  … tabla: ` + tabla.map((f) => `${f.nombre}${f.ventana ? "✓" : f.vuelveEl ? `→${f.vuelveEl}` : "·"}`).join(" "));
  check("tabla: cinco planetas en orden fijo",
    tabla.length === 5 && tabla[0].nombre === "Mercurio" && tabla[4].nombre === "Saturno");
  check("tabla: iluminación entre 0 y 1",
    tabla.every((f) => f.fase.iluminacion >= 0 && f.fase.iluminacion <= 1));
  check("tabla: solo Saturno trae inclinación de anillo",
    tabla.every((f) => (f.nombre === "Saturno") === (f.fase.ringTilt !== null)));
  const visibles = tabla.filter((f) => f.ventana);
  check("tabla: alguno visible esta noche", visibles.length > 0);
  check("tabla: las ventanas caen dentro del marco y con inicio antes que fin",
    visibles.every((f) => f.ventana!.desdeMin >= 0 && f.ventana!.hastaMin <= MARCO_MINUTOS
      && f.ventana!.desdeMin < f.ventana!.hastaMin));
  check("tabla: un extremo abierto es siempre el borde del marco",
    visibles.every((f) => (!f.ventana!.abiertoInicio || f.ventana!.desdeMin === 0)
      && (!f.ventana!.abiertoFin || f.ventana!.hastaMin === MARCO_MINUTOS)));
  check("tabla: Venus se ve esta noche (23 jul, La Manga)",
    tabla.find((f) => f.nombre === "Venus")?.ventana != null,
    tabla.find((f) => f.nombre === "Venus")?.ventana?.horaFin ?? "");
  check("tabla: Venus es el más brillante de los cinco",
    tabla.every((f) => f.nombre === "Venus" || f.magnitud > tabla.find((v) => v.nombre === "Venus")!.magnitud));
  // Único dato observado: Pablo vio Venus a las 21:15, a 25° de altura y con el Sol en el
  // horizonte. Es lo que calibra la recta de `umbralSolar`. Ojo si algún día se afina con más
  // noches: 21:15 es cuando se fijó, no cuando apareció — una cota, no una medida, y el umbral
  // real puede estar antes. Si algún cambio retrasa el arranque, este check salta.
  check("tabla: Venus asoma para las 21:15 que Pablo observó",
    tabla.find((f) => f.nombre === "Venus")!.ventana!.horaInicio <= "21:15",
    tabla.find((f) => f.nombre === "Venus")!.ventana!.horaInicio);
  check("tabla: quien no se ve trae fecha de vuelta o queda vacío",
    tabla.filter((f) => !f.ventana).every((f) => f.vuelveEl === null || /\d/.test(f.vuelveEl)));
}

// 8. El cielo de la noche: reparto entre lo de hoy, lo que viene y lo que no viene
{
  const c = cielo(SATELITES, AHORA);
  console.log(`  … esta noche: ${c.pasos.length} pasos · próximos: ${c.proximos.length} · ausentes: ${c.ausentes.map((a) => `${a.nombre}→${a.vuelveEl}`).join(" ")}`);
  check("cielo: en julio se mira desde La Manga", c.sede === "La Manga");
  check("cielo: los pasos de esta noche caen dentro del marco",
    c.pasos.every((p) => minutosEnMarco(new Date(p.instante)) !== null));
  check("cielo: los próximos van después de los de esta noche, y como mucho dos",
    c.proximos.length <= 2 && c.proximos.every((p) => c.pasos.every((h) => p.instante > h.instante)));
  check("cielo: ausente es el satélite que no sale en los próximos",
    c.ausentes.every((a) => !c.proximos.some((p) => p.nombre === a.nombre)));
  check("cielo: quien vuelve trae fecha o nada, nunca basura",
    c.ausentes.every((a) => a.vuelveEl === null || /\d/.test(a.vuelveEl)));
  check("cielo: o hay Luna esta noche o hay fecha de vuelta, no las dos",
    (c.luna === null) !== (c.lunaVuelveEl === null));
  check("cielo: las citas van en orden cronológico",
    c.citas.every((x, i) => i === 0 || x.instante >= c.citas[i - 1].instante));
  check("cielo: la Luna entra en las citas como Moon",
    c.citas.every((x) => ["ISS", "Tiangong", "Moon"].includes(x.nombre)));
  check("cielo: cada arco lleva sus instantes en orden",
    c.pasos.concat(c.proximos).every((p) => p.trayectoria.every((q, i) => i === 0 || q.t > p.trayectoria[i - 1].t)));
  check("cielo: la ventana visible envuelve al tramo reportado y no se sale del arco",
    c.pasos.concat(c.proximos).every((p) =>
      p.visibleDesde <= p.instante && p.visibleHasta >= p.instanteFin
      && p.visibleDesde >= p.trayectoria[0].t
      && p.visibleHasta <= p.trayectoria[p.trayectoria.length - 1].t));
  check("cielo: la ventana visible es toda ella arco iluminado",
    c.pasos.concat(c.proximos).every((p) =>
      p.trayectoria.filter((q) => q.t >= p.visibleDesde && q.t <= p.visibleHasta).every((q) => q.vis)));

  // Margen: rebobinar el reloj justo detrás de un paso lo mantiene en la lista.
  const paso = c.proximos[0] ?? c.pasos[0];
  const despues = new Date(paso.instanteFin + (MARGEN_MINUTOS - 1) * 60000);
  check("cielo: un paso recién terminado aguanta el margen de 10 min",
    cielo(SATELITES, despues, 1).citas.some((x) => x.instanteFin === paso.visibleHasta));
}

console.log(fails === 0 ? "\nTodo OK" : `\n${fails} fallos`);
process.exit(fails === 0 ? 0 : 1);
