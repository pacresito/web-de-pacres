// Test del motor del Observatorio — ejecutar con: npx tsx app/apps/observatorio/engine.test.ts
// No es parte del build. Verifica la astronomía sin navegador: los criterios de
// visibilidad se comprueban como invariantes sobre eventos reales (TLE fijo abajo).
import * as Astro from "astronomy-engine";
import {
  sedeParaFecha, rumbo, magnitudSatelite, partesLocales, nombreFase,
  pasosVisibles, salidasDeLuna, tablaPlanetas, agenda,
  ALTITUD_MINIMA, MAGNITUD_MAXIMA, HORA_MINIMA_LUNA, MARGEN_MINUTOS, MARCO_MINUTOS,
  type Satelite,
} from "./engine";

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
  check("sede: 9 sept → La Manga (último día)", sede("2026-09-09T20:00:00Z") === "La Manga");
  check("sede: 10 sept → Madrid", sede("2026-09-10T20:00:00Z") === "Madrid");
  check("sede: 25 dic → La Manga", sede("2026-12-25T21:00:00Z") === "La Manga");
  check("sede: 5 enero → La Manga", sede("2026-01-05T21:00:00Z") === "La Manga");
  check("sede: 10 enero → Madrid", sede("2026-01-10T21:00:00Z") === "Madrid");
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
}

// 4. Rumbos
{
  check("rumbo: 0° = N", rumbo(0) === "N");
  check("rumbo: 90° = E", rumbo(90) === "E");
  check("rumbo: 247.5° = OSO", rumbo(247.5) === "OSO");
  check("rumbo: 350° vuelve a N", rumbo(350) === "N");
  check("fase lunar: 180° = luna llena", nombreFase(180) === "luna llena");
  check("fase lunar: 0° = luna nueva", nombreFase(0) === "luna nueva");
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
}

// 6. Salidas de Luna
{
  const lunas = salidasDeLuna(AHORA, HASTA);
  console.log(`  … ${lunas.length} salidas de Luna en ventana`);
  check("luna: todas entre las 20:00 y las 00:00",
    lunas.every((l) => +l.hora.slice(0, 2) >= HORA_MINIMA_LUNA));
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
  check("tabla: las ventanas caen dentro del marco 0–480 y con inicio antes que fin",
    visibles.every((f) => f.ventana!.desdeMin >= 0 && f.ventana!.hastaMin <= MARCO_MINUTOS
      && f.ventana!.desdeMin < f.ventana!.hastaMin));
  check("tabla: un extremo abierto es siempre el borde del marco",
    visibles.every((f) => (!f.ventana!.abiertoInicio || f.ventana!.desdeMin === 0)
      && (!f.ventana!.abiertoFin || f.ventana!.hastaMin === MARCO_MINUTOS)));
  check("tabla: Venus se ve esta noche (23 jul, La Manga)",
    tabla.find((f) => f.nombre === "Venus")?.ventana != null,
    tabla.find((f) => f.nombre === "Venus")?.ventana?.horaFin ?? "");
  check("tabla: quien no se ve trae fecha de vuelta o queda vacío",
    tabla.filter((f) => !f.ventana).every((f) => f.vuelveEl === null || /\d/.test(f.vuelveEl)));
}

// 8. Agenda: agrupación y orden
{
  const noches = agenda(SATELITES, AHORA);
  check("agenda: noches en orden cronológico",
    noches.every((n, i) => i === 0 || n.clave > noches[i - 1].clave));
  check("agenda: eventos ordenados dentro de cada noche",
    noches.every((n) => n.eventos.every((e, i) => i === 0 || e.instante >= n.eventos[i - 1].instante)));
  check("agenda: todos los eventos de una noche comparten su clave",
    noches.every((n) => n.eventos.every((e) => e.noche === n.clave)));
  check("agenda: en julio todo se ve desde La Manga",
    noches.every((n) => n.sede === "La Manga"));
  check("agenda: la noche de hoy se etiqueta Hoy y la siguiente Mañana",
    noches[0].etiqueta === "Hoy" && noches[1].etiqueta === "Mañana");
  check("agenda: el resto lleva fecha capitalizada",
    noches.slice(2).every((n) => /^\p{Lu}.., \d/u.test(n.etiqueta)), noches[2]?.etiqueta);

  // Margen: rebobinar el reloj justo detrás de un paso lo mantiene en la lista.
  const paso = noches.flatMap((n) => n.eventos).find((e) => e.tipo === "satelite")!;
  const despues = new Date(paso.instanteFin + (MARGEN_MINUTOS - 1) * 60000);
  const sigue = agenda(SATELITES, despues, 1)
    .flatMap((n) => n.eventos)
    .some((e) => e.tipo === "satelite" && e.instanteFin === paso.instanteFin);
  check("agenda: un paso recién terminado aguanta el margen de 10 min", sigue);
}

console.log(fails === 0 ? "\nTodo OK" : `\n${fails} fallos`);
process.exit(fails === 0 ? 0 : 1);
